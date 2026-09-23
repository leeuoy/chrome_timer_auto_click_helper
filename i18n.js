(function () {
  'use strict';

  const LANG_STORAGE_KEY = 'timer_lang';

  const SUPPORTED_LANGS = [
    { code: 'zh-CN', label: '简体中文', flag: '🇨🇳' },
    { code: 'en', label: 'English', flag: '🇺🇸' },
    { code: 'ja', label: '日本語', flag: '🇯🇵' },
    { code: 'ko', label: '한국어', flag: '🇰🇷' },
    { code: 'zh-TW', label: '繁體中文', flag: '🇹🇼' },
  ];

  const TRANSLATIONS = {
    'zh-CN': {
      addTask: '添加任务',
      pickElement: '选择元素',
      compact: '精简',
      full: '完整',
      toggleSelectorTitle: '切换精简/完整选择器模式',
      offlineMode: '离线模式',
      noTasks: '暂无定时任务',
      noTasksDesc: '点击下方按钮创建你的第一个定时任务',
      taskName: '任务名称',
      taskNamePlaceholder: '输入任务名称',
      cronLabel: 'Cron 表达式（秒 分 时 日 月 星期）',
      scriptLabel: '脚本',
      format: '格式化',
      formatTitle: '格式化代码 (Ctrl+Shift+F)',
      wrap: '换行',
      wrapTitle: '切换自动换行',
      search: '搜索',
      searchTitle: '搜索替换 (Ctrl+F)',
      shortcutHint: '快捷键提示',
      shortcutHintTitle: 'Ctrl+/ 注释 | Ctrl+D 多选 | Ctrl+Z 撤销',
      cancel: '取消',
      save: '保存',
      runNow: '立即运行',
      edit: '编辑',
      delete: '删除',
      confirmDelete: '确定要删除此任务吗？',
      createTask: '创建定时任务',
      tagName: '标签名：',
      textContent: '文本内容：',
      noText: '(无文本)',
      timedClick: '定时点击',
      enableTask: '启用任务',
      create: '创建',
      selectedElement: '选中元素',
      tagColon: '标签: ',
      textColon: ' | 文本: ',
      codeEditor: '代码编辑器',
      loadingEditor: '正在加载编辑器...',
      editorLoadFailed: '编辑器加载失败，请刷新页面后重试',
      editorHint: 'Ctrl+S 保存 · Ctrl+左/右 按单词跳转 · 拖拽标题栏移动',
      runNowBtn: '立即执行',
      minimize: '最小化',
      maximize: '最大化',
      restore: '还原',
      close: '关闭（未保存的修改将丢失）',
      pickElementTitle: '选择页面元素（获取 CSS 选择器）',
      selectorToggleTitle: '精简选择器 / 完整选择器',
      newTask: '新任务',
      langLabel: '语言',
    },

    'en': {
      addTask: 'Add Task',
      pickElement: 'Pick Element',
      compact: 'Compact',
      full: 'Full',
      toggleSelectorTitle: 'Toggle compact/full selector mode',
      offlineMode: 'Offline',
      noTasks: 'No scheduled tasks',
      noTasksDesc: 'Click the button below to create your first task',
      taskName: 'Task Name',
      taskNamePlaceholder: 'Enter task name',
      cronLabel: 'Cron Expression (sec min hour day month weekday)',
      scriptLabel: 'Script',
      format: 'Format',
      formatTitle: 'Format code (Ctrl+Shift+F)',
      wrap: 'Wrap',
      wrapTitle: 'Toggle word wrap',
      search: 'Search',
      searchTitle: 'Search & Replace (Ctrl+F)',
      shortcutHint: 'Shortcuts',
      shortcutHintTitle: 'Ctrl+/ Comment | Ctrl+D Multi-select | Ctrl+Z Undo',
      cancel: 'Cancel',
      save: 'Save',
      runNow: 'Run Now',
      edit: 'Edit',
      delete: 'Delete',
      confirmDelete: 'Are you sure you want to delete this task?',
      createTask: 'Create Scheduled Task',
      tagName: 'Tag: ',
      textContent: 'Text: ',
      noText: '(no text)',
      timedClick: 'Auto Click',
      enableTask: 'Enable Task',
      create: 'Create',
      selectedElement: 'Selected Element',
      tagColon: 'Tag: ',
      textColon: ' | Text: ',
      codeEditor: 'Code Editor',
      loadingEditor: 'Loading editor...',
      editorLoadFailed: 'Editor failed to load. Please refresh and try again.',
      editorHint: 'Ctrl+S Save · Ctrl+Left/Right Word jump · Drag title bar to move',
      runNowBtn: 'Run Now',
      minimize: 'Minimize',
      maximize: 'Maximize',
      restore: 'Restore',
      close: 'Close (unsaved changes will be lost)',
      pickElementTitle: 'Pick page element (get CSS selector)',
      selectorToggleTitle: 'Compact selector / Full selector',
      newTask: 'New Task',
      langLabel: 'Language',
    },

    'ja': {
      addTask: 'タスク追加',
      pickElement: '要素選択',
      compact: '簡易',
      full: '完全',
      toggleSelectorTitle: '簡易/完全セレクターモードの切替',
      offlineMode: 'オフライン',
      noTasks: 'スケジュールタスクなし',
      noTasksDesc: '下のボタンをクリックして最初のタスクを作成',
      taskName: 'タスク名',
      taskNamePlaceholder: 'タスク名を入力',
      cronLabel: 'Cron式（秒 分 時 日 月 曜日）',
      scriptLabel: 'スクリプト',
      format: '整形',
      formatTitle: 'コード整形 (Ctrl+Shift+F)',
      wrap: '改行',
      wrapTitle: '自動改行の切替',
      search: '検索',
      searchTitle: '検索・置換 (Ctrl+F)',
      shortcutHint: 'ショートカット',
      shortcutHintTitle: 'Ctrl+/ コメント | Ctrl+D 複数選択 | Ctrl+Z 元に戻す',
      cancel: 'キャンセル',
      save: '保存',
      runNow: '今すぐ実行',
      edit: '編集',
      delete: '削除',
      confirmDelete: 'このタスクを削除してもよろしいですか？',
      createTask: 'スケジュールタスク作成',
      tagName: 'タグ名：',
      textContent: 'テキスト内容：',
      noText: '(テキストなし)',
      timedClick: '自動クリック',
      enableTask: 'タスク有効化',
      create: '作成',
      selectedElement: '選択要素',
      tagColon: 'タグ: ',
      textColon: ' | テキスト: ',
      codeEditor: 'コードエディタ',
      loadingEditor: 'エディタ読込中...',
      editorLoadFailed: 'エディタの読込に失敗しました。ページを更新してください。',
      editorHint: 'Ctrl+S 保存 · Ctrl+←/→ 単語ジャンプ · タイトルバーをドラッグして移動',
      runNowBtn: '今すぐ実行',
      minimize: '最小化',
      maximize: '最大化',
      restore: '復元',
      close: '閉じる（未保存の変更は失われます）',
      pickElementTitle: 'ページ要素を選択（CSSセレクター取得）',
      selectorToggleTitle: '簡易セレクター / 完全セレクター',
      newTask: '新規タスク',
      langLabel: '言語',
    },

    'ko': {
      addTask: '작업 추가',
      pickElement: '요소 선택',
      compact: '간단',
      full: '전체',
      toggleSelectorTitle: '간단/전체 선택기 모드 전환',
      offlineMode: '오프라인',
      noTasks: '예약 작업 없음',
      noTasksDesc: '아래 버튼을 클릭하여 첫 번째 작업을 만드세요',
      taskName: '작업 이름',
      taskNamePlaceholder: '작업 이름 입력',
      cronLabel: 'Cron 표현식 (초 분 시 일 월 요일)',
      scriptLabel: '스크립트',
      format: '정렬',
      formatTitle: '코드 정렬 (Ctrl+Shift+F)',
      wrap: '줄바꿈',
      wrapTitle: '자동 줄바꿈 전환',
      search: '검색',
      searchTitle: '검색 및 바꾸기 (Ctrl+F)',
      shortcutHint: '단축키',
      shortcutHintTitle: 'Ctrl+/ 주석 | Ctrl+D 다중선택 | Ctrl+Z 실행취소',
      cancel: '취소',
      save: '저장',
      runNow: '즉시 실행',
      edit: '편집',
      delete: '삭제',
      confirmDelete: '이 작업을 삭제하시겠습니까?',
      createTask: '예약 작업 만들기',
      tagName: '태그명：',
      textContent: '텍스트 내용：',
      noText: '(텍스트 없음)',
      timedClick: '자동 클릭',
      enableTask: '작업 활성화',
      create: '만들기',
      selectedElement: '선택 요소',
      tagColon: '태그: ',
      textColon: ' | 텍스트: ',
      codeEditor: '코드 편집기',
      loadingEditor: '편집기 로딩 중...',
      editorLoadFailed: '편집기 로딩 실패. 페이지를 새로고침하세요.',
      editorHint: 'Ctrl+S 저장 · Ctrl+←/→ 단어 이동 · 제목 표시줄 드래그로 이동',
      runNowBtn: '즉시 실행',
      minimize: '최소화',
      maximize: '최대화',
      restore: '복원',
      close: '닫기 (저장하지 않은 변경 사항이 손실됩니다)',
      pickElementTitle: '페이지 요소 선택 (CSS 선택기 가져오기)',
      selectorToggleTitle: '간단 선택기 / 전체 선택기',
      newTask: '새 작업',
      langLabel: '언어',
    },

    'zh-TW': {
      addTask: '新增任務',
      pickElement: '選擇元素',
      compact: '精簡',
      full: '完整',
      toggleSelectorTitle: '切換精簡/完整選擇器模式',
      offlineMode: '離線模式',
      noTasks: '暫無定時任務',
      noTasksDesc: '點擊下方按鈕建立你的第一個定時任務',
      taskName: '任務名稱',
      taskNamePlaceholder: '輸入任務名稱',
      cronLabel: 'Cron 表達式（秒 分 時 日 月 星期）',
      scriptLabel: '腳本',
      format: '格式化',
      formatTitle: '格式化程式碼 (Ctrl+Shift+F)',
      wrap: '換行',
      wrapTitle: '切換自動換行',
      search: '搜尋',
      searchTitle: '搜尋取代 (Ctrl+F)',
      shortcutHint: '快捷鍵提示',
      shortcutHintTitle: 'Ctrl+/ 註解 | Ctrl+D 多選 | Ctrl+Z 復原',
      cancel: '取消',
      save: '儲存',
      runNow: '立即執行',
      edit: '編輯',
      delete: '刪除',
      confirmDelete: '確定要刪除此任務嗎？',
      createTask: '建立定時任務',
      tagName: '標籤名：',
      textContent: '文字內容：',
      noText: '(無文字)',
      timedClick: '定時點擊',
      enableTask: '啟用任務',
      create: '建立',
      selectedElement: '選中元素',
      tagColon: '標籤: ',
      textColon: ' | 文字: ',
      codeEditor: '程式碼編輯器',
      loadingEditor: '正在載入編輯器...',
      editorLoadFailed: '編輯器載入失敗，請重新整理頁面後重試',
      editorHint: 'Ctrl+S 儲存 · Ctrl+左/右 按單詞跳轉 · 拖拽標題列移動',
      runNowBtn: '立即執行',
      minimize: '最小化',
      maximize: '最大化',
      restore: '還原',
      close: '關閉（未儲存的修改將遺失）',
      pickElementTitle: '選擇頁面元素（取得 CSS 選擇器）',
      selectorToggleTitle: '精簡選擇器 / 完整選擇器',
      newTask: '新任務',
      langLabel: '語言',
    },
  };

  let currentLang = 'zh-CN';

  function t(key) {
    return (TRANSLATIONS[currentLang] && TRANSLATIONS[currentLang][key]) ||
           TRANSLATIONS['zh-CN'][key] || key;
  }

  function getLang() {
    return currentLang;
  }

  function setLang(code) {
    if (TRANSLATIONS[code]) {
      currentLang = code;
    }
  }

  async function loadLang() {
    try {
      const result = await chrome.storage.local.get(LANG_STORAGE_KEY);
      if (result[LANG_STORAGE_KEY] && TRANSLATIONS[result[LANG_STORAGE_KEY]]) {
        currentLang = result[LANG_STORAGE_KEY];
      }
    } catch {}
    return currentLang;
  }

  async function saveLang(code) {
    if (TRANSLATIONS[code]) {
      currentLang = code;
      try {
        await chrome.storage.local.set({ [LANG_STORAGE_KEY]: code });
      } catch {}
    }
  }

  function getSupportedLangs() {
    return SUPPORTED_LANGS;
  }

  function detectLang() {
    const navLang = (navigator.language || 'zh-CN').toLowerCase();
    if (TRANSLATIONS[navLang]) return navLang;
    if (navLang.startsWith('zh-tw') || navLang.startsWith('zh-hant')) return 'zh-TW';
    if (navLang.startsWith('zh')) return 'zh-CN';
    if (navLang.startsWith('ja')) return 'ja';
    if (navLang.startsWith('ko')) return 'ko';
    return 'en';
  }

  if (typeof window !== 'undefined') {
    window.__chromeTimerI18n = { t, getLang, setLang, loadLang, saveLang, getSupportedLangs, detectLang };
  }
  if (typeof globalThis !== 'undefined') {
    globalThis.__chromeTimerI18n = { t, getLang, setLang, loadLang, saveLang, getSupportedLangs, detectLang };
  }

})();