(function () {
  'use strict';

  /**
   * 消息类型常量与工具函数
   * 定义 popup 与 content script 之间的消息协议
   */

  /** 消息 action 类型枚举 */
  const MSG = {
    /** popup 请求当前页面域名 */
    GET_CURRENT_DOMAIN: 'getCurrentDomain',
    /** popup 请求当前域名的任务列表 */
    GET_DOMAIN_TASKS: 'getDomainTasks',
    /** popup 请求开启元素选择模式 */
    START_PICKER: 'startPicker',
    /** content script 返回选中的元素选择器 */
    ELEMENT_PICKED: 'elementPicked',
    /** content script 通知选择已取消 */
    PICKER_CANCELLED: 'pickerCancelled',
    /** popup 同步更新后的完整任务列表到 content script */
    UPDATE_TASKS: 'updateTasks',
    /** popup 切换任务启用/禁用状态 */
    TOGGLE_TASK: 'toggleTask',
    /** popup 删除指定任务 */
    DELETE_TASK: 'deleteTask',
    /** popup 请求立即执行一次任务脚本 */
    RUN_TASK_NOW: 'runTaskNow',
    /** popup 请求在页面内打开编辑面板 */
    OPEN_EDITOR: 'openEditor',
  };

  /**
   * 向当前活动标签页的 content script 发送消息
   * @param {object} message - 消息对象，需包含 action 字段
   * @returns {Promise<any>} content script 的响应
   */
  async function sendToContentScript(message) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) throw new Error('未找到活动标签页');
    return chrome.tabs.sendMessage(tab.id, message);
  }

  /**
   * 全局常量定义模块
   * 包含存储 key、默认任务模板、默认脚本等常量
   */

  /** chrome.storage.local 中存储所有任务数据的 key */
  const STORAGE_KEY = 'timer_tasks';

  /** 默认任务名称 */
  const DEFAULT_TASK_NAME = '新任务';

  /**
   * 默认 Cron 表达式（6 字段：秒 分 时 日 月 星期）
   * 每 3 秒执行一次
   */
  const DEFAULT_CRON = '*/3 * * * * *';

  /**
   * 默认脚本模板
   * {{SELECTOR}} 占位符在元素选择后会被替换为实际 CSS 选择器
   * 先检查元素是否存在，避免 null 报错
   */
  const DEFAULT_SCRIPT = 'const el = document.querySelector("{{SELECTOR}}"); if (el) el.click();';

  /**
   * 存储工具模块
   * 封装 chrome.storage.local 的读写操作，支持按域名获取和保存任务列表
   */


  /**
   * 生成唯一 ID
   * 基于时间戳 base36 编码 + 随机后缀
   * @returns {string} 唯一标识符
   */
  function generateId() {
    return Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  /**
   * 从 storage 获取所有域名任务数据
   * @returns {Promise<Array<{domain: string, tasks: Array}>>} 所有域名任务数据
   */
  async function getAllTasks() {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    return result[STORAGE_KEY] || [];
  }

  /**
   * 按域名获取任务列表，不存在则返回空数组
   * @param {string} domain - 目标域名
   * @returns {Promise<Array>} 该域名下的任务列表
   */
  async function getDomainTasks(domain) {
    const all = await getAllTasks();
    const group = all.find(g => g.domain === domain);
    return group ? group.tasks : [];
  }

  /**
   * 保存指定域名的任务列表（整体替换）
   * @param {string} domain - 目标域名
   * @param {Array} tasks - 任务列表
   */
  async function saveDomainTasks(domain, tasks) {
    const all = await getAllTasks();
    const idx = all.findIndex(g => g.domain === domain);
    if (idx >= 0) {
      all[idx].tasks = tasks;
    } else {
      all.push({ domain, tasks });
    }
    await chrome.storage.local.set({ [STORAGE_KEY]: all });
  }

  /**
   * 删除指定域名下的某个任务
   * @param {string} domain - 目标域名
   * @param {string} taskId - 任务 ID
   */
  async function deleteDomainTask(domain, taskId) {
    const tasks = await getDomainTasks(domain);
    const filtered = tasks.filter(t => t.id !== taskId);
    await saveDomainTasks(domain, filtered);
  }

  /**
   * Popup 入口
   * 负责渲染任务列表 UI、处理用户交互、与 content script 通信
   */


  /** 当前域名 */
  let currentDomain = '';
  /** 当前域名的任务列表 */
  let tasks = [];
  /** 当前展开编辑的任务 ID，null 表示全部折叠 */
  let expandedTaskId = null;
  /** 是否正在等待元素选择结果 */
  let waitingForPicker = false;

  /* ==================== DOM 引用 ==================== */

  const domainEl = document.getElementById('currentDomain');
  const taskListEl = document.getElementById('taskList');
  const addTaskBtn = document.getElementById('addTaskBtn');
  const pickElementBtn = document.getElementById('pickElementBtn');
  const toggleSelectorModeBtn = document.getElementById('toggleSelectorModeBtn');

  /** 是否使用完整选择器（默认精简） */
  let useFullSelector = false;

  /* ==================== 初始化 ==================== */

  /**
   * Popup 打开时初始化
   * 获取当前域名和任务列表，渲染 UI
   * 注意：事件监听必须在最前面注册，确保即使 content script 通信失败，
   * 底部操作栏按钮（添加任务、选择元素、精简切换）仍可响应
   */
  async function init() {
    /* 优先注册全局事件监听和拖拽，保证按钮始终可用 */
    setupEventListeners();
    setupDragHandle();

    /* 尝试通过 content script 获取域名 */
    let gotDomain = false;
    try {
      const response = await sendToContentScript({ action: MSG.GET_CURRENT_DOMAIN });
      currentDomain = response.domain;
      domainEl.textContent = currentDomain;
      gotDomain = true;
    } catch {
      /* content script 未加载时，尝试动态注入 */
      try {
        await chrome.runtime.sendMessage({ action: 'injectContentScript' });
        const response = await sendToContentScript({ action: MSG.GET_CURRENT_DOMAIN });
        currentDomain = response.domain;
        domainEl.textContent = currentDomain;
        gotDomain = true;
      } catch {
        /* content script 不可用，降级：通过 chrome.tabs 直接获取域名 */
        try {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (tab?.url) {
            const url = new URL(tab.url);
            currentDomain = url.hostname;
            domainEl.textContent = currentDomain;
            gotDomain = true;
          }
        } catch {
          /* 无法获取域名，使用离线模式 */
        }
      }
    }

    /* 从 storage 加载任务列表（无论 content script 是否可用） */
    if (gotDomain) {
      try {
        const response = await sendToContentScript({ action: MSG.GET_DOMAIN_TASKS });
        tasks = response.tasks || [];
      } catch {
        tasks = await getDomainTasks(currentDomain);
      }
    } else {
      domainEl.textContent = '离线模式';
      tasks = await getDomainTasks(currentDomain).catch(() => []);
    }

    renderTaskList();
  }

  /**
   * 设置窗口拖拽功能
   * 通过拖拽头部移动整个 popup 窗口
   * Chrome 扩展 popup 默认不支持拖拽，需要通过 chrome.windows API 实现
   */
  function setupDragHandle() {
    const dragHandle = document.getElementById('dragHandle');
    if (!dragHandle) return;

    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let winLeft = 0;
    let winTop = 0;

    /* 获取当前窗口位置 */
    chrome.windows.getCurrent((win) => {
      winLeft = win.left;
      winTop = win.top;
    });

    dragHandle.addEventListener('mousedown', (e) => {
      /* 仅左键拖拽 */
      if (e.button !== 0) return;
      isDragging = true;
      startX = e.screenX;
      startY = e.screenY;
      dragHandle.classList.add('dragging');
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const dx = e.screenX - startX;
      const dy = e.screenY - startY;
      const newLeft = winLeft + dx;
      const newTop = winTop + dy;

      /* 通过 chrome.windows API 移动窗口 */
      chrome.windows.getCurrent((win) => {
        chrome.windows.update(win.id, {
          left: Math.max(0, newLeft),
          top: Math.max(0, newTop),
        });
      });
    });

    document.addEventListener('mouseup', () => {
      if (!isDragging) return;
      isDragging = false;
      dragHandle.classList.remove('dragging');
      /* 更新窗口起始位置 */
      chrome.windows.getCurrent((win) => {
        winLeft = win.left;
        winTop = win.top;
      });
    });
  }

  /* ==================== 事件监听 ==================== */

  /**
   * 注册全局事件监听
   */
  function setupEventListeners() {
    /* 添加任务按钮 */
    addTaskBtn.addEventListener('click', handleAddTask);

    /* 底部选择元素按钮 */
    pickElementBtn.addEventListener('click', handlePickElement);

    /* 精简/完整选择器模式切换按钮 */
    toggleSelectorModeBtn.addEventListener('click', () => {
      useFullSelector = !useFullSelector;
      toggleSelectorModeBtn.querySelector('span').textContent = useFullSelector ? '完整' : '精简';
      toggleSelectorModeBtn.classList.toggle('full-mode', useFullSelector);
    });

    /* 监听来自 content script 的元素选择结果 */
    chrome.runtime.onMessage.addListener((message) => {
      if (message.action === MSG.ELEMENT_PICKED && waitingForPicker) {
        waitingForPicker = false;
        handleElementPicked(message.data);
      }
      if (message.action === MSG.PICKER_CANCELLED && waitingForPicker) {
        waitingForPicker = false;
        pickElementBtn.classList.remove('active');
      }
    });
  }

  /* ==================== 渲染 ==================== */

  /**
   * 渲染任务列表
   * 根据任务数量选择渲染任务卡片或空状态
   */
  function renderTaskList() {
    if (tasks.length === 0) {
      renderEmptyState();
      return;
    }
    renderTasks();
  }

  /**
   * 渲染空状态引导
   */
  function renderEmptyState() {
    taskListEl.innerHTML = `
    <div class="empty-state">
      <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.3">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>
      <p class="empty-title">暂无定时任务</p>
      <p class="empty-desc">点击下方按钮创建你的第一个定时任务</p>
      <button class="btn btn-primary btn-empty-add" id="emptyAddBtn">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        <span>添加任务</span>
      </button>
    </div>
  `;
    /* 空状态添加按钮事件 */
    document.getElementById('emptyAddBtn')?.addEventListener('click', handleAddTask);
  }

  /**
   * 渲染所有任务卡片
   */
  function renderTasks() {
    taskListEl.innerHTML = tasks.map(task => createTaskCardHTML(task)).join('');

    /* 绑定卡片事件 */
    taskListEl.querySelectorAll('.task-card').forEach(card => {
      const taskId = card.dataset.taskId;
      /* 绑定到 input 的 change 事件，阻止冒泡避免 label 的 click 重复触发 */
      card.querySelector('.toggle-switch input')?.addEventListener('change', (e) => {
        e.stopPropagation();
        handleToggleTask(taskId);
      });
      card.querySelector('.btn-run')?.addEventListener('click', () => handleRunTaskNow(taskId));
      card.querySelector('.btn-edit')?.addEventListener('click', () => handleEditTask(taskId));
      card.querySelector('.btn-delete')?.addEventListener('click', () => handleDeleteTask(taskId));
      card.querySelector('.btn-pick')?.addEventListener('click', () => handlePickElementForTask());
      card.querySelector('.btn-save')?.addEventListener('click', () => handleSaveTask(taskId));
      card.querySelector('.btn-cancel')?.addEventListener('click', () => handleCancelEdit());

      /* 绑定编辑器工具栏按钮事件 */
      card.querySelectorAll('.toolbar-btn').forEach(btn => {
        btn.addEventListener('click', () => handleToolbarAction(taskId, btn.dataset.action));
      });
    });
  }

  /**
   * 生成任务卡片的 HTML 字符串
   * @param {object} task - 任务对象
   * @returns {string} HTML 字符串
   */
  function createTaskCardHTML(task) {
    const isExpanded = expandedTaskId === task.id;
    const enabledClass = task.enabled ? 'checked' : '';
    const expandedClass = isExpanded ? 'expanded' : '';

    return `
    <div class="task-card ${expandedClass}" data-task-id="${task.id}">
      <div class="task-card-header">
        <div class="task-info">
          <span class="task-name">${escapeHtml(task.name)}</span>
          <span class="task-cron">${escapeHtml(task.cronExpression)}</span>
        </div>
        <label class="toggle-switch ${enabledClass}">
          <input type="checkbox" ${task.enabled ? 'checked' : ''} tabindex="-1">
          <span class="toggle-slider"></span>
        </label>
      </div>
      ${isExpanded ? `
        <div class="task-card-editor">
          <div class="form-group">
            <label class="form-label">任务名称</label>
            <input type="text" class="form-input" id="editName-${task.id}" value="${escapeAttr(task.name)}" placeholder="输入任务名称">
          </div>
          <div class="form-group">
            <label class="form-label">Cron 表达式（秒 分 时 日 月 星期）</label>
            <input type="text" class="form-input form-input-mono" id="editCron-${task.id}" value="${escapeAttr(task.cronExpression)}" placeholder="*/3 * * * * *">
          </div>
          <div class="form-group">
            <label class="form-label">脚本</label>
            <div class="editor-wrapper">
              <div class="editor-toolbar" id="toolbar-${task.id}">
                <div class="toolbar-left">
                  <button class="toolbar-btn" data-action="format" title="格式化代码 (Ctrl+Shift+F)">
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
                    <span>格式化</span>
                  </button>
                  <button class="toolbar-btn" data-action="toggleWrap" title="切换自动换行">
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M3 12h15a3 3 0 1 1 0 6h-4"/><path d="M3 18h12"/><polyline points="17 12 19 14 21 12"/></svg>
                    <span>换行</span>
                  </button>
                  <button class="toolbar-btn" data-action="search" title="搜索替换 (Ctrl+F)">
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    <span>搜索</span>
                  </button>
                </div>
                <div class="toolbar-right">
                  <span class="toolbar-hint" title="Ctrl+/ 注释 | Ctrl+D 多选 | Ctrl+Z 撤销">快捷键提示</span>
                </div>
              </div>
              <div class="editor-container" id="editor-${task.id}"></div>
            </div>
          </div>
          <div class="editor-actions">
            <button class="btn btn-sm btn-secondary btn-pick">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>
              <span>选择元素</span>
            </button>
            <div class="editor-actions-right">
              <button class="btn btn-sm btn-ghost btn-cancel">取消</button>
              <button class="btn btn-sm btn-primary btn-save">保存</button>
            </div>
          </div>
        </div>
      ` : ''}
      <div class="task-card-actions">
        <button class="btn btn-sm btn-ghost btn-run" title="立即运行">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        </button>
        <button class="btn btn-sm btn-ghost btn-edit btn-edit-icon" title="编辑">
          <svg viewBox="0 0 24 24" width="15" height="15"><path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
        </button>
        <button class="btn btn-sm btn-ghost btn-delete" title="删除">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          <span>删除</span>
        </button>
      </div>
    </div>
  `;
  }

  /**
   * 获取当前编辑器中的脚本内容
   * 编辑器已移至页面内大窗口，popup 中不再持有编辑器实例
   * @returns {string} 脚本代码
   */
  function getCurrentScript() {
    return DEFAULT_SCRIPT;
  }

  /**
   * 将选择器插入或替换到当前编辑器
   * 编辑器已移至页面内大窗口，此函数保留为 no-op 以兼容调用
   * @param {string} selector - CSS 选择器
   */
  function insertSelectorToEditor(selector) {
    /* no-op：编辑器已移至 content script */
  }

  /* ==================== 事件处理 ==================== */

  /**
   * 处理手动运行任务：立即执行一次脚本
   * 编辑模式下先自动保存编辑器内容，再执行，防止 popup 关闭导致修改丢失
   * @param {string} taskId - 任务 ID
   */
  async function handleRunTaskNow(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    /* 编辑器已移至页面内大窗口，直接使用任务保存的脚本 */
    const code = task.script;

    if (!code || !code.trim()) {
      console.error('[Chrome Timer] 手动运行失败: 脚本内容为空');
      return;
    }

    try {
      const resp = await sendToContentScript({ action: MSG.RUN_TASK_NOW, data: { code } });
      if (resp?.success) {
        console.log(`[Chrome Timer] 手动运行成功: ${task.name}`);
      } else {
        console.error(`[Chrome Timer] 手动运行失败:`, resp?.error);
      }
    } catch (err) {
      console.error(`[Chrome Timer] 手动运行通信失败:`, err.message);
    }
  }

  /**
   * 处理添加任务
   */
  async function handleAddTask() {
    try {
    const newTask = {
      id: generateId(),
      name: DEFAULT_TASK_NAME,
      enabled: true,
      cronExpression: DEFAULT_CRON,
      script: DEFAULT_SCRIPT,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    tasks.push(newTask);

    /* 持久化并同步 */
    await saveDomainTasks(currentDomain, tasks);
    try {
      await sendToContentScript({ action: MSG.UPDATE_TASKS, data: { tasks } });
    } catch { /* 忽略通信失败 */ }

    renderTaskList();
    } catch (err) {
      console.error('[Chrome Timer] 添加任务失败:', err);
    }
  }

  /**
   * 处理编辑器工具栏按钮点击
   * 编辑器已移至页面内大窗口，此函数保留为 no-op 以兼容调用
   * @param {string} taskId - 当前任务 ID
   * @param {string} action - 工具栏动作名称（format / toggleWrap / search）
   */
  function handleToolbarAction(taskId, action) {
    /* no-op：编辑器已移至 content script */
  }

  /**
   * 处理编辑任务：发送消息给 content script 在页面内打开大编辑窗口
   * @param {string} taskId - 任务 ID
   */
  async function handleEditTask(taskId) {
    /* 从 storage 重新读取最新数据，避免内存中的数据被 DEFAULT_SCRIPT 覆盖 */
    const freshTasks = await getDomainTasks(currentDomain);
    const task = freshTasks.find(t => t.id === taskId);
    if (!task) return;
    try {
      await sendToContentScript({ action: MSG.OPEN_EDITOR, data: { task } });
    } catch { /* popup 可能已关闭，忽略 */ }
  }

  /**
   * 处理保存任务编辑
   * @param {string} taskId - 任务 ID
   */
  async function handleSaveTask(taskId) {
    const nameInput = document.getElementById(`editName-${taskId}`);
    const cronInput = document.getElementById(`editCron-${taskId}`);
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    task.name = nameInput?.value.trim() || DEFAULT_TASK_NAME;
    task.cronExpression = cronInput?.value.trim() || DEFAULT_CRON;
    task.script = getCurrentScript();
    task.updatedAt = Date.now();

    /* 折叠编辑面板 */
    expandedTaskId = null;

    /* 持久化并同步 */
    await saveDomainTasks(currentDomain, tasks);
    try {
      await sendToContentScript({ action: MSG.UPDATE_TASKS, data: { tasks } });
    } catch { /* 忽略通信失败 */ }

    renderTaskList();
  }

  /**
   * 处理取消编辑
   */
  async function handleCancelEdit() {
    expandedTaskId = null;
    /* 从 storage 重新加载，丢弃未保存的修改 */
    tasks = await getDomainTasks(currentDomain);
    renderTaskList();
  }

  /**
   * 处理切换任务启用/禁用
   * @param {string} taskId - 任务 ID
   */
  async function handleToggleTask(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    task.enabled = !task.enabled;
    task.updatedAt = Date.now();

    /* 立即重新渲染，提供即时视觉反馈 */
    renderTaskList();

    /* 后台持久化和同步 */
    await saveDomainTasks(currentDomain, tasks);
    try {
      await sendToContentScript({ action: MSG.UPDATE_TASKS, data: { tasks } });
    } catch { /* 忽略通信失败 */ }
  }

  /**
   * 处理删除任务（带确认）
   * @param {string} taskId - 任务 ID
   */
  async function handleDeleteTask(taskId) {
    /* 显示确认弹窗 */
    const confirmed = await showConfirmDialog('确定要删除此任务吗？');
    if (!confirmed) return;

    await deleteDomainTask(currentDomain, taskId);
    tasks = tasks.filter(t => t.id !== taskId);

    /* 如果正在编辑被删除的任务，关闭编辑面板 */
    if (expandedTaskId === taskId) {
      expandedTaskId = null;
    }

    /* 通知 content script */
    try {
      await sendToContentScript({ action: MSG.UPDATE_TASKS, data: { tasks } });
    } catch { /* 忽略通信失败 */ }

    renderTaskList();
  }

  /**
   * 处理底部选择元素按钮点击
   */
  async function handlePickElement() {
    try {
      waitingForPicker = true;
      pickElementBtn.classList.add('active');
      await sendToContentScript({ action: MSG.START_PICKER, data: { useFullSelector } });
    } catch {
      waitingForPicker = false;
      pickElementBtn.classList.remove('active');
    }
  }

  /**
   * 处理编辑面板内的选择元素按钮
   * @param {string} taskId - 当前编辑的任务 ID
   */
  async function handlePickElementForTask(taskId) {
    try {
      waitingForPicker = true;
      await sendToContentScript({ action: MSG.START_PICKER, data: { useFullSelector } });
    } catch {
      waitingForPicker = false;
    }
  }

  /**
   * 处理元素选择完成
   * 当有展开的编辑面板时，将选择器插入编辑器；
   * 当没有展开的编辑面板时，弹出创建任务确认对话框供用户配置后再创建
   * @param {object} data - { selector, tagName, text }
   */
  async function handleElementPicked(data) {
    pickElementBtn.classList.remove('active');

    if (expandedTaskId) {
      /* 有展开的编辑面板，插入到编辑器 */
      insertSelectorToEditor(data.selector);
    } else {
      /* 没有展开的编辑面板，弹出创建任务确认对话框 */
      const taskConfig = await showCreateTaskDialog(data);
      if (!taskConfig) return;

      /* 用户确认创建，构建新任务 */
      const scriptWithSelector = DEFAULT_SCRIPT.replace('{{SELECTOR}}', data.selector);
      const newTask = {
        id: generateId(),
        name: taskConfig.name,
        enabled: taskConfig.enabled,
        cronExpression: taskConfig.cronExpression,
        script: scriptWithSelector,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      tasks.push(newTask);
      expandedTaskId = newTask.id;

      /* 持久化并同步 */
      await saveDomainTasks(currentDomain, tasks);
      try {
        await sendToContentScript({ action: MSG.UPDATE_TASKS, data: { tasks } });
      } catch { /* 忽略通信失败 */ }

      renderTaskList();
    }
  }

  /* ==================== 工具函数 ==================== */

  /**
   * HTML 特殊字符转义，防止 XSS
   * @param {string} str - 原始字符串
   * @returns {string} 转义后的安全字符串
   */
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /**
   * HTML 属性值转义
   * @param {string} str - 原始字符串
   * @returns {string} 转义后的安全字符串
   */
  function escapeAttr(str) {
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /**
   * 显示确认对话框
   * @param {string} message - 确认消息
   * @returns {Promise<boolean>} 用户是否确认
   */
  function showConfirmDialog(message) {
    return new Promise((resolve) => {
      /* 创建遮罩层 */
      const overlay = document.createElement('div');
      overlay.className = 'confirm-overlay';
      overlay.innerHTML = `
      <div class="confirm-dialog">
        <p class="confirm-message">${message}</p>
        <div class="confirm-actions">
          <button class="btn btn-sm btn-ghost" id="confirmCancel">取消</button>
          <button class="btn btn-sm btn-danger" id="confirmOk">删除</button>
        </div>
      </div>
    `;
      document.body.appendChild(overlay);

      /* 点击取消 */
      overlay.querySelector('#confirmCancel').addEventListener('click', () => {
        overlay.remove();
        resolve(false);
      });

      /* 点击确认 */
      overlay.querySelector('#confirmOk').addEventListener('click', () => {
        overlay.remove();
        resolve(true);
      });

      /* 点击遮罩关闭 */
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          overlay.remove();
          resolve(false);
        }
      });
    });
  }

  /**
   * 显示创建任务确认对话框
   * 展示元素选择信息，并允许用户配置任务名称、Cron 表达式和启用状态
   * @param {object} data - 元素信息，包含 { selector, tagName, text }
   * @returns {Promise<{ name: string, cronExpression: string, enabled: boolean } | null>}
   *   用户点击"创建"返回配置对象，点击"取消"返回 null
   */
  function showCreateTaskDialog(data) {
    return new Promise((resolve) => {
      /* 创建遮罩层 */
      const overlay = document.createElement('div');
      overlay.className = 'confirm-overlay';
      overlay.innerHTML = `
      <div class="confirm-dialog">
        <p class="confirm-message" style="margin-bottom: 12px; font-weight: 600;">创建定时任务</p>
        <div style="margin-bottom: 10px; font-size: 12px; color: var(--text-secondary);">
          <div><strong>标签名：</strong>${escapeHtml(data.tagName)}</div>
          <div><strong>文本内容：</strong>${escapeHtml(data.text || '(无文本)')}</div>
        </div>
        <div class="form-group">
          <label class="form-label">任务名称</label>
          <input type="text" class="form-input" id="createTaskName" value="定时点击 ${escapeAttr(data.tagName)}" placeholder="输入任务名称">
        </div>
        <div class="form-group">
          <label class="form-label">Cron 表达式（秒 分 时 日 月 星期）</label>
          <input type="text" class="form-input form-input-mono" id="createTaskCron" value="${escapeAttr(DEFAULT_CRON)}" placeholder="*/3 * * * * *">
        </div>
        <div class="form-group">
          <label class="form-label">启用任务</label>
          <label class="toggle-switch checked">
            <input type="checkbox" id="createTaskEnabled" checked tabindex="-1">
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="confirm-actions" style="margin-top: 12px;">
          <button class="btn btn-sm btn-ghost" id="createTaskCancel">取消</button>
          <button class="btn btn-sm btn-primary" id="createTaskOk">创建</button>
        </div>
      </div>
    `;
      document.body.appendChild(overlay);

      /* 绑定 Toggle 开关交互：点击 label 切换状态 */
      const toggleSwitch = overlay.querySelector('.toggle-switch');
      const toggleInput = overlay.querySelector('#createTaskEnabled');
      toggleSwitch.addEventListener('click', (e) => {
        if (e.target === toggleInput) return;
        toggleInput.checked = !toggleInput.checked;
        toggleSwitch.classList.toggle('checked', toggleInput.checked);
      });

      /* 点击取消 */
      overlay.querySelector('#createTaskCancel').addEventListener('click', () => {
        overlay.remove();
        resolve(null);
      });

      /* 点击创建 */
      overlay.querySelector('#createTaskOk').addEventListener('click', () => {
        overlay.remove();
        resolve({
          name: overlay.querySelector('#createTaskName').value.trim() || `定时点击 ${data.tagName}`,
          cronExpression: overlay.querySelector('#createTaskCron').value.trim() || DEFAULT_CRON,
          enabled: toggleInput.checked,
        });
      });

      /* 点击遮罩关闭 */
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          overlay.remove();
          resolve(null);
        }
      });

      /* 聚焦到任务名称输入框，方便用户直接编辑 */
      overlay.querySelector('#createTaskName').focus();
      overlay.querySelector('#createTaskName').select();
    });
  }

  /* ==================== 启动 ==================== */
  init();

})();
