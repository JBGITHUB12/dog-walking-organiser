/**
 * Dog Walking Organiser & Security Hub
 * Features:
 * 1. Menu Hub Dashboard & "What Does Today Look Like?" Live Agenda.
 * 2. "Go to Paper" Printable Run-Sheets with clipboard checkboxes & notes.
 * 3. "Export to Excel" complete multi-section spreadsheet (.csv).
 * 4. Admin-Controlled User Registration & Role-Based Access Control (RBAC).
 * 5. Web Crypto PBKDF2/SHA-256 Password Hashing & Salted Credentials.
 * 6. Strict HTML Escaping (XSS Prevention) across all template injections.
 * 7. Dog Compatibility & Incompatibility Safety Rules.
 * 8. Schedule Parser, Calendar Export, and Photo Montage Studio.
 */

// --- SECURITY UTILITY: XSS SANITIZER ---
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// --- CRYPTOGRAPHIC UTILITIES (WEB CRYPTO API) ---
function bytesToHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

function generateSaltHex() {
  const arr = new Uint8Array(16);
  window.crypto.getRandomValues(arr);
  return bytesToHex(arr);
}

async function hashPassword(password, saltHex) {
  const enc = new TextEncoder();
  const salt = hexToBytes(saltHex);
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );
  
  const key = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
  
  const exported = await window.crypto.subtle.exportKey('raw', key);
  return bytesToHex(new Uint8Array(exported));
}

// --- INITIAL STATE & DATA MODELS ---
const DEFAULT_STATE = {
  currentUser: null,
  users: [],
  failedAttempts: 0,
  lockoutUntil: 0,
  activeDogId: 'dog-1',
  activeContactId: 'contact-1',
  currentPrintScope: 'today', // 'today' | 'week'
  dogs: [
    {
      id: 'dog-1',
      name: 'Buddy',
      breed: 'Golden Retriever',
      age: '3 yrs',
      walkPreference: 'selective',
      incompatibleDogs: 'Buster, Bruno',
      favoriteFriends: 'Bella, Milo',
      notes: 'Loves tennis balls, allergic to chicken'
    },
    {
      id: 'dog-2',
      name: 'Luna',
      breed: 'French Bulldog',
      age: '2 yrs',
      walkPreference: 'solo',
      incompatibleDogs: 'All dogs',
      favoriteFriends: '',
      notes: 'Needs solo walking, gentle pace'
    }
  ],
  contacts: [
    {
      id: 'contact-1',
      name: 'Sarah',
      whatsAppNumber: '+447123456789',
      instagramHandle: 'sarah_dogwalks',
      currency: '£',
      ratePerWalk: 15.00,
      notes: 'Available Mon-Fri mornings'
    },
    {
      id: 'contact-2',
      name: 'Mike',
      whatsAppNumber: '+447987654321',
      instagramHandle: 'mikes_petcare',
      currency: '£',
      ratePerWalk: 18.00,
      notes: 'Weekend and afternoon specialist'
    }
  ],
  targetWeek: 'next',
  customMonday: null,
  walkDuration: 60,
  days: [],
  history: [],
  montage: {
    photos: [],
    style: 'grid',
    title: 'Morning Park Adventures 🐶',
    subtitle: 'Splashing in the stream & muddy paws! 🐾',
    theme: 'warm-orange',
    date: new Date().toISOString().slice(0, 10),
    taggedDogId: 'dog-1',
    taggedWalkerId: 'contact-1'
  }
};

let appState = { ...DEFAULT_STATE };
let deferredPwaPrompt = null;
let lockoutInterval = null;

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// --- DOM ELEMENTS CACHE ---
const elements = {
  // Auth Elements
  authOverlay: document.getElementById('authOverlay'),
  authLockoutAlert: document.getElementById('authLockoutAlert'),
  lockoutTimer: document.getElementById('lockoutTimer'),
  loginForm: document.getElementById('loginForm'),
  loginUsername: document.getElementById('loginUsername'),
  loginPassword: document.getElementById('loginPassword'),
  loginRememberMe: document.getElementById('loginRememberMe'),
  currentUserAvatar: document.getElementById('currentUserAvatar'),
  currentUserName: document.getElementById('currentUserName'),
  currentUserRoleBadge: document.getElementById('currentUserRoleBadge'),
  logoutBtn: document.getElementById('logoutBtn'),
  headerLogoBtn: document.getElementById('headerLogoBtn'),

  // Menu Hub Elements
  menuHeroDate: document.getElementById('menuHeroDate'),
  menuGreetingText: document.getElementById('menuGreetingText'),
  heroTodayWalkStatus: document.getElementById('heroTodayWalkStatus'),
  heroTodayWalkTime: document.getElementById('heroTodayWalkTime'),
  heroWeekWalksCount: document.getElementById('heroWeekWalksCount'),
  heroWeekHours: document.getElementById('heroWeekHours'),
  heroWeeklyCost: document.getElementById('heroWeeklyCost'),
  heroRateInfo: document.getElementById('heroRateInfo'),
  heroActiveDog: document.getElementById('heroActiveDog'),
  heroActiveWalker: document.getElementById('heroActiveWalker'),
  todayDayNameBadge: document.getElementById('todayDayNameBadge'),
  todayFullDateString: document.getElementById('todayFullDateString'),
  todayAgendaContainer: document.getElementById('todayAgendaContainer'),
  todayPrintBtn: document.getElementById('todayPrintBtn'),
  quickPaperPrintBtn: document.getElementById('quickPaperPrintBtn'),
  quickExcelExportBtn: document.getElementById('quickExcelExportBtn'),
  menuAddDogTile: document.getElementById('menuAddDogTile'),
  menuAddContactTile: document.getElementById('menuAddContactTile'),
  menuGoToPaperTile: document.getElementById('menuGoToPaperTile'),
  menuExportExcelTile: document.getElementById('menuExportExcelTile'),

  // Paper Print Modal Elements
  paperPrintModal: document.getElementById('paperPrintModal'),
  closePaperPrintModalBtn: document.getElementById('closePaperPrintModalBtn'),
  cancelPaperPrintModalBtn: document.getElementById('cancelPaperPrintModalBtn'),
  printScopeTodayBtn: document.getElementById('printScopeTodayBtn'),
  printScopeWeekBtn: document.getElementById('printScopeWeekBtn'),
  paperPrintArea: document.getElementById('paperPrintArea'),
  triggerWindowPrintBtn: document.getElementById('triggerWindowPrintBtn'),
  schedulePaperPrintBtn: document.getElementById('schedulePaperPrintBtn'),
  scheduleExcelExportBtn: document.getElementById('scheduleExcelExportBtn'),

  // Admin Registration Modal Elements
  adminRegisterUserModal: document.getElementById('adminRegisterUserModal'),
  closeAdminUserModalBtn: document.getElementById('closeAdminUserModalBtn'),
  cancelAdminUserModalBtn: document.getElementById('cancelAdminUserModalBtn'),
  adminRegisterForm: document.getElementById('adminRegisterForm'),
  adminRegFullName: document.getElementById('adminRegFullName'),
  adminRegUsername: document.getElementById('adminRegUsername'),
  adminRegRole: document.getElementById('adminRegRole'),
  adminRegPassword: document.getElementById('adminRegPassword'),
  adminRegConfirmPassword: document.getElementById('adminRegConfirmPassword'),
  openAddUserModalBtn: document.getElementById('openAddUserModalBtn'),

  // Navigation
  navTabs: document.querySelectorAll('.nav-tab'),
  mobileNavTabs: document.querySelectorAll('.mobile-nav-tab'),
  tabContents: document.querySelectorAll('.tab-content'),
  pwaInstallBtn: document.getElementById('pwaInstallBtn'),

  // Context Ribbons
  ribbonWalkerName: document.getElementById('ribbonWalkerName'),
  ribbonDogName: document.getElementById('ribbonDogName'),
  ribbonDogCompatBadge: document.getElementById('ribbonDogCompatBadge'),
  ribbonInstagramHandle: document.getElementById('ribbonInstagramHandle'),
  ribbonWhatsAppNumber: document.getElementById('ribbonWhatsAppNumber'),
  ribbonRate: document.getElementById('ribbonRate'),
  walkerAvatarText: document.getElementById('walkerAvatarText'),
  switchWalkerOrDogBtn: document.getElementById('switchWalkerOrDogBtn'),

  // Global Conflict Banner
  globalConflictBanner: document.getElementById('globalConflictBanner'),
  globalConflictMessage: document.getElementById('globalConflictMessage'),
  conflictCountBadge: document.getElementById('conflictCountBadge'),

  // Schedule Tab Elements
  rawScheduleInput: document.getElementById('rawScheduleInput'),
  targetWeekSelect: document.getElementById('targetWeekSelect'),
  customDateContainer: document.getElementById('customDateContainer'),
  customStartDate: document.getElementById('customStartDate'),
  walkDurationSelect: document.getElementById('walkDurationSelect'),
  parseScheduleBtn: document.getElementById('parseScheduleBtn'),
  clearInputBtn: document.getElementById('clearInputBtn'),
  loadSampleBtn: document.getElementById('loadSampleBtn'),
  loadSampleConflictBtn: document.getElementById('loadSampleConflictBtn'),
  totalWalksDisplay: document.getElementById('totalWalksDisplay'),
  totalHoursDisplay: document.getElementById('totalHoursDisplay'),
  totalCostDisplay: document.getElementById('totalCostDisplay'),
  ratePerWalkDisplay: document.getElementById('ratePerWalkDisplay'),
  walkCountBadge: document.getElementById('walkCountBadge'),
  walkerNotesInput: document.getElementById('walkerNotesInput'),
  replyMessagePreview: document.getElementById('replyMessagePreview'),
  copyMessageBtn: document.getElementById('copyMessageBtn'),
  replyWhatsAppBtn: document.getElementById('replyWhatsAppBtn'),
  replyInstagramBtn: document.getElementById('replyInstagramBtn'),
  scheduleWeekHeading: document.getElementById('scheduleWeekHeading'),
  scheduleWeekSubheading: document.getElementById('scheduleWeekSubheading'),
  scheduleCardsContainer: document.getElementById('scheduleCardsContainer'),
  downloadIcsBtn: document.getElementById('downloadIcsBtn'),
  syncGoogleBtn: document.getElementById('syncGoogleBtn'),
  markAllConfirmedBtn: document.getElementById('markAllConfirmedBtn'),
  addNewWalkSlotBtn: document.getElementById('addNewWalkSlotBtn'),
  resetScheduleBtn: document.getElementById('resetScheduleBtn'),
  saveCurrentScheduleBtn: document.getElementById('saveCurrentScheduleBtn'),
  savedHistoryContainer: document.getElementById('savedHistoryContainer'),

  // Montage Studio Tab Elements
  montagePhotoUpload: document.getElementById('montagePhotoUpload'),
  montageDogSelect: document.getElementById('montageDogSelect'),
  montageWalkerSelect: document.getElementById('montageWalkerSelect'),
  montageTitleInput: document.getElementById('montageTitleInput'),
  montageSubtitleInput: document.getElementById('montageSubtitleInput'),
  montageDateInput: document.getElementById('montageDateInput'),
  montageThemeSelect: document.getElementById('montageThemeSelect'),
  montageStyleBtns: document.querySelectorAll('.montage-style-btn'),
  loadSamplePhotosBtn: document.getElementById('loadSamplePhotosBtn'),
  photoThumbnailsGrid: document.getElementById('photoThumbnailsGrid'),
  photoCountBadge: document.getElementById('photoCountBadge'),
  montageCanvas: document.getElementById('montageCanvas'),
  refreshCanvasBtn: document.getElementById('refreshCanvasBtn'),
  nativeShareBtn: document.getElementById('nativeShareBtn'),
  montageWhatsAppBtn: document.getElementById('montageWhatsAppBtn'),
  montageInstagramBtn: document.getElementById('montageInstagramBtn'),
  downloadMontageImgBtn: document.getElementById('downloadMontageImgBtn'),
  shareTargetLabel: document.getElementById('shareTargetLabel'),

  // Contacts, Dogs & Users Tab Elements
  dogsListContainer: document.getElementById('dogsListContainer'),
  contactsListContainer: document.getElementById('contactsListContainer'),
  usersListContainer: document.getElementById('usersListContainer'),
  openAddDogModalBtn: document.getElementById('openAddDogModalBtn'),
  openAddContactModalBtn: document.getElementById('openAddContactModalBtn'),

  // Modals
  dogModal: document.getElementById('dogModal'),
  dogModalTitle: document.getElementById('dogModalTitle'),
  dogEditId: document.getElementById('dogEditId'),
  dogNameInput: document.getElementById('dogNameInput'),
  dogBreedInput: document.getElementById('dogBreedInput'),
  dogAgeInput: document.getElementById('dogAgeInput'),
  dogWalkPreferenceInput: document.getElementById('dogWalkPreferenceInput'),
  dogIncompatibleInput: document.getElementById('dogIncompatibleInput'),
  dogFriendsInput: document.getElementById('dogFriendsInput'),
  dogNotesInput: document.getElementById('dogNotesInput'),
  closeDogModalBtn: document.getElementById('closeDogModalBtn'),
  cancelDogModalBtn: document.getElementById('cancelDogModalBtn'),
  saveDogBtn: document.getElementById('saveDogBtn'),

  contactModal: document.getElementById('contactModal'),
  contactModalTitle: document.getElementById('contactModalTitle'),
  contactEditId: document.getElementById('contactEditId'),
  contactNameInput: document.getElementById('contactNameInput'),
  contactInstagramInput: document.getElementById('contactInstagramInput'),
  contactWhatsAppInput: document.getElementById('contactWhatsAppInput'),
  contactCurrencyInput: document.getElementById('contactCurrencyInput'),
  contactRateInput: document.getElementById('contactRateInput'),
  contactNotesInput: document.getElementById('contactNotesInput'),
  closeContactModalBtn: document.getElementById('closeContactModalBtn'),
  cancelContactModalBtn: document.getElementById('cancelContactModalBtn'),
  saveContactBtn: document.getElementById('saveContactBtn'),

  switchContextModal: document.getElementById('switchContextModal'),
  modalActiveDogSelect: document.getElementById('modalActiveDogSelect'),
  modalActiveWalkerSelect: document.getElementById('modalActiveWalkerSelect'),
  closeSwitchModalBtn: document.getElementById('closeSwitchModalBtn'),
  confirmSwitchBtn: document.getElementById('confirmSwitchBtn'),

  googleEventsModal: document.getElementById('googleEventsModal'),
  closeGoogleModalBtn: document.getElementById('closeGoogleModalBtn'),
  googleEventsList: document.getElementById('googleEventsList'),
  openAllGoogleEventsBtn: document.getElementById('openAllGoogleEventsBtn'),

  toastContainer: document.getElementById('toastContainer')
};

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', async () => {
  loadFromLocalStorage();
  await bootstrapDefaultAdminIfNeeded();
  registerPwaServiceWorker();
  initializeWeekDays();
  checkAuthSession();
  attachEventListeners();
});

// --- PWA SERVICE WORKER ---
function registerPwaServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
      .then(() => console.log('PWA Service Worker registered'))
      .catch(err => console.warn('Service Worker registration failed:', err));
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPwaPrompt = e;
    if (elements.pwaInstallBtn) elements.pwaInstallBtn.classList.remove('hidden');
  });
}

// --- LOCAL STORAGE PERSISTENCE ---
function loadFromLocalStorage() {
  const saved = localStorage.getItem('dogwalk_security_hub_v1');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      appState = { ...DEFAULT_STATE, ...parsed };
    } catch (e) {
      console.error('Failed to load state from localStorage', e);
    }
  }

  const sessionUser = sessionStorage.getItem('dogwalk_active_session') || localStorage.getItem('dogwalk_remembered_session');
  if (sessionUser) {
    try {
      appState.currentUser = JSON.parse(sessionUser);
    } catch (e) {
      appState.currentUser = null;
    }
  }
}

function saveToLocalStorage() {
  const stateToSave = {
    ...appState,
    currentUser: null,
    montage: {
      ...appState.montage,
      photos: appState.montage.photos.slice(0, 8)
    }
  };
  localStorage.setItem('dogwalk_security_hub_v1', JSON.stringify(stateToSave));
}

// --- BOOTSTRAP DEFAULT ACCOUNTS ---
async function bootstrapDefaultAdminIfNeeded() {
  if (!appState.users || appState.users.length === 0) {
    const adminSalt = generateSaltHex();
    const adminHash = await hashPassword('admin123', adminSalt);
    
    const defaultAdmin = {
      id: 'usr-admin-1',
      username: 'admin',
      fullName: 'System Administrator',
      role: 'admin',
      passwordHash: adminHash,
      salt: adminSalt,
      createdAt: new Date().toISOString()
    };

    const walkerSalt = generateSaltHex();
    const walkerHash = await hashPassword('walker123', walkerSalt);
    const defaultWalker = {
      id: 'usr-walker-1',
      username: 'sarah',
      fullName: 'Sarah (Walker)',
      role: 'walker',
      passwordHash: walkerHash,
      salt: walkerSalt,
      createdAt: new Date().toISOString()
    };

    appState.users = [defaultAdmin, defaultWalker];
    saveToLocalStorage();
  }
}

// --- AUTHENTICATION & SESSION MANAGEMENT ---
function checkAuthSession() {
  const now = Date.now();
  if (appState.lockoutUntil && appState.lockoutUntil > now) {
    triggerLockoutCountdown(Math.ceil((appState.lockoutUntil - now) / 1000));
    elements.authOverlay.classList.remove('hidden');
    return;
  }

  if (appState.currentUser) {
    elements.authOverlay.classList.add('hidden');
    applyRolePermissions();
    renderAll();
  } else {
    elements.authOverlay.classList.remove('hidden');
  }
}

async function handleLoginSubmit(e) {
  e.preventDefault();
  const username = elements.loginUsername.value.trim().toLowerCase();
  const password = elements.loginPassword.value;
  const rememberMe = elements.loginRememberMe.checked;

  const now = Date.now();
  if (appState.lockoutUntil && appState.lockoutUntil > now) {
    showToast('Account temporarily locked out due to failed attempts.', 'warning');
    return;
  }

  const user = appState.users.find(u => u.username.toLowerCase() === username);
  if (!user) {
    handleFailedLoginAttempt();
    return;
  }

  const inputHash = await hashPassword(password, user.salt);
  if (inputHash !== user.passwordHash) {
    handleFailedLoginAttempt();
    return;
  }

  appState.failedAttempts = 0;
  appState.lockoutUntil = 0;
  appState.currentUser = {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    role: user.role
  };

  if (rememberMe) {
    localStorage.setItem('dogwalk_remembered_session', JSON.stringify(appState.currentUser));
  } else {
    sessionStorage.setItem('dogwalk_active_session', JSON.stringify(appState.currentUser));
  }

  elements.authOverlay.classList.add('hidden');
  elements.loginPassword.value = '';
  showToast(`👋 Welcome back, ${escapeHtml(user.fullName)} (${user.role.toUpperCase()})!`, 'success');
  
  applyRolePermissions();
  renderAll();
}

function handleFailedLoginAttempt() {
  appState.failedAttempts = (appState.failedAttempts || 0) + 1;
  if (appState.failedAttempts >= 5) {
    appState.lockoutUntil = Date.now() + 60 * 1000;
    saveToLocalStorage();
    triggerLockoutCountdown(60);
    showToast('⛔ Too many failed attempts. Locked for 60 seconds.', 'warning');
  } else {
    const remaining = 5 - appState.failedAttempts;
    showToast(`Invalid username or password. (${remaining} attempt${remaining === 1 ? '' : 's'} left)`, 'warning');
  }
}

function triggerLockoutCountdown(seconds) {
  elements.authLockoutAlert.classList.remove('hidden');
  elements.lockoutTimer.textContent = seconds;

  if (lockoutInterval) clearInterval(lockoutInterval);
  let remaining = seconds;
  lockoutInterval = setInterval(() => {
    remaining--;
    elements.lockoutTimer.textContent = remaining;
    if (remaining <= 0) {
      clearInterval(lockoutInterval);
      elements.authLockoutAlert.classList.add('hidden');
      appState.failedAttempts = 0;
      appState.lockoutUntil = 0;
      saveToLocalStorage();
    }
  }, 1000);
}

// --- ADMIN-ONLY USER REGISTRATION ---
async function handleAdminRegisterSubmit(e) {
  e.preventDefault();

  if (!appState.currentUser || appState.currentUser.role !== 'admin') {
    showToast('⛔ Unauthorized: Only logged-in Administrators can register new accounts.', 'warning');
    elements.adminRegisterUserModal.classList.add('hidden');
    return;
  }

  const fullName = elements.adminRegFullName.value.trim();
  const username = elements.adminRegUsername.value.trim().toLowerCase();
  const role = elements.adminRegRole.value;
  const password = elements.adminRegPassword.value;
  const confirmPassword = elements.adminRegConfirmPassword.value;

  if (password !== confirmPassword) {
    showToast('Passwords do not match.', 'warning');
    return;
  }

  if (password.length < 6) {
    showToast('Password must be at least 6 characters.', 'warning');
    return;
  }

  if (appState.users.some(u => u.username.toLowerCase() === username)) {
    showToast('Username already exists. Choose a different username.', 'warning');
    return;
  }

  const saltHex = generateSaltHex();
  const passwordHash = await hashPassword(password, saltHex);

  const newUser = {
    id: `usr-${Date.now()}`,
    username: username,
    fullName: fullName,
    role: role,
    passwordHash: passwordHash,
    salt: saltHex,
    createdAt: new Date().toISOString()
  };

  appState.users.push(newUser);
  saveToLocalStorage();

  elements.adminRegisterUserModal.classList.add('hidden');
  elements.adminRegisterForm.reset();
  showToast(`🎉 Registered user @${escapeHtml(username)} as ${role.toUpperCase()}!`, 'success');
  renderProfilesList();
}

function handleLogout() {
  appState.currentUser = null;
  sessionStorage.removeItem('dogwalk_active_session');
  localStorage.removeItem('dogwalk_remembered_session');
  showToast('Logged out successfully.', 'info');
  checkAuthSession();
}

// --- ROLE-BASED ACCESS CONTROL (RBAC) ---
function applyRolePermissions() {
  const user = appState.currentUser;
  if (!user) return;

  const isAdmin = user.role === 'admin';
  document.body.classList.remove('role-admin', 'role-walker');
  document.body.classList.add(isAdmin ? 'role-admin' : 'role-walker');

  elements.currentUserName.textContent = escapeHtml(user.fullName);
  elements.currentUserRoleBadge.textContent = user.role.toUpperCase();
  elements.currentUserRoleBadge.className = isAdmin 
    ? 'text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-purple-100 text-purple-700'
    : 'text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-700';

  elements.currentUserAvatar.textContent = user.fullName ? user.fullName[0].toUpperCase() : 'U';

  document.querySelectorAll('.admin-only').forEach(el => {
    if (isAdmin) el.classList.remove('hidden');
    else el.classList.add('hidden');
  });
}

// --- HELPERS FOR ACTIVE DOG & CONTACT ---
function getActiveDog() {
  return appState.dogs.find(d => d.id === appState.activeDogId) || appState.dogs[0];
}

function getActiveContact() {
  return appState.contacts.find(c => c.id === appState.activeContactId) || appState.contacts[0];
}

// --- RENDER ALL VIEWS ---
function renderAll() {
  renderHeaderAndRibbon();
  renderMenuHub();
  renderSchedule();
  renderHistory();
  renderMontageStudio();
  renderProfilesList();
}

function renderHeaderAndRibbon() {
  const dog = getActiveDog();
  const walker = getActiveContact();

  if (elements.ribbonWalkerName) elements.ribbonWalkerName.textContent = escapeHtml(walker.name);
  if (elements.ribbonDogName) elements.ribbonDogName.textContent = escapeHtml(dog.name);
  
  if (elements.ribbonDogCompatBadge) {
    if (dog.walkPreference === 'solo') {
      elements.ribbonDogCompatBadge.className = 'inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold';
      elements.ribbonDogCompatBadge.innerHTML = '<i class="fa-solid fa-ban text-[10px]"></i> Solo Walk Only';
    } else if (dog.incompatibleDogs && dog.incompatibleDogs.trim()) {
      elements.ribbonDogCompatBadge.className = 'inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold';
      elements.ribbonDogCompatBadge.innerHTML = `<i class="fa-solid fa-triangle-exclamation text-[10px]"></i> No ${escapeHtml(dog.incompatibleDogs)}`;
    } else {
      elements.ribbonDogCompatBadge.className = 'inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-semibold';
      elements.ribbonDogCompatBadge.innerHTML = '<i class="fa-solid fa-shield-dog text-[10px]"></i> Group Friendly';
    }
  }

  const handle = walker.instagramHandle.startsWith('@') ? walker.instagramHandle : `@${walker.instagramHandle}`;
  if (elements.ribbonInstagramHandle) elements.ribbonInstagramHandle.textContent = escapeHtml(handle);
  if (elements.ribbonWhatsAppNumber) elements.ribbonWhatsAppNumber.textContent = escapeHtml(walker.whatsAppNumber);
  if (elements.ribbonRate) elements.ribbonRate.textContent = `${escapeHtml(walker.currency)}${Number(walker.ratePerWalk).toFixed(2)} / walk`;

  const initials = walker.name ? walker.name.slice(0, 2).toUpperCase() : 'DW';
  if (elements.walkerAvatarText) elements.walkerAvatarText.textContent = escapeHtml(initials);

  if (elements.shareTargetLabel) elements.shareTargetLabel.textContent = `Sending to ${escapeHtml(walker.name)} (${escapeHtml(handle)})`;
}

// =========================================================================
// MENU HUB & "WHAT DOES TODAY LOOK LIKE" LOGIC
// =========================================================================

function renderMenuHub() {
  const now = new Date();
  const dayName = now.toLocaleDateString('en-GB', { weekday: 'long' });
  const dateFormatted = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  
  if (elements.menuHeroDate) elements.menuHeroDate.textContent = `${dayName}, ${dateFormatted}`;
  if (elements.todayDayNameBadge) elements.todayDayNameBadge.textContent = dayName;
  if (elements.todayFullDateString) elements.todayFullDateString.textContent = `${dateFormatted} • Live walk status & routine`;

  const user = appState.currentUser;
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  if (elements.menuGreetingText) {
    elements.menuGreetingText.textContent = `${greeting}, ${user ? escapeHtml(user.fullName.split(' ')[0]) : 'Walker'}! 🐾`;
  }

  const dog = getActiveDog();
  const walker = getActiveContact();
  const activeWalks = appState.days.filter(d => d.hasWalk);
  const totalCost = (activeWalks.length * walker.ratePerWalk).toFixed(2);
  const totalHours = (activeWalks.reduce((sum, d) => sum + (d.duration || 60), 0) / 60).toFixed(1);

  if (elements.heroWeekWalksCount) elements.heroWeekWalksCount.textContent = `${activeWalks.length} Walk${activeWalks.length === 1 ? '' : 's'}`;
  if (elements.heroWeekHours) elements.heroWeekHours.textContent = `${totalHours} hrs scheduled`;
  if (elements.heroWeeklyCost) elements.heroWeeklyCost.textContent = `${walker.currency}${totalCost}`;
  if (elements.heroRateInfo) elements.heroRateInfo.textContent = `@ ${walker.currency}${Number(walker.ratePerWalk).toFixed(2)}/walk`;
  if (elements.heroActiveDog) elements.heroActiveDog.textContent = escapeHtml(dog.name);
  if (elements.heroActiveWalker) elements.heroActiveWalker.textContent = `with ${escapeHtml(walker.name)}`;

  renderTodayAgenda();
}

function getTodayDaySlot() {
  const now = new Date();
  const currentDayIndex = (now.getDay() + 6) % 7; // 0=Monday ... 6=Sunday
  return appState.days[currentDayIndex];
}

function renderTodayAgenda() {
  const container = elements.todayAgendaContainer;
  if (!container) return;

  const todaySlot = getTodayDaySlot();
  const dog = getActiveDog();
  const walker = getActiveContact();

  if (!todaySlot || !todaySlot.hasWalk) {
    if (elements.heroTodayWalkStatus) elements.heroTodayWalkStatus.textContent = 'No Walk Today';
    if (elements.heroTodayWalkTime) elements.heroTodayWalkTime.textContent = 'Rest Day 🛋️';

    container.innerHTML = `
      <div class="rounded-2xl border border-dashed border-slate-200 p-6 text-center space-y-3 bg-slate-50/50">
        <div class="w-12 h-12 rounded-full bg-orange-100 text-orange-600 mx-auto flex items-center justify-center text-xl">
          <i class="fa-solid fa-couch"></i>
        </div>
        <div class="space-y-1">
          <h4 class="font-bold text-slate-800 text-sm">No Walks Scheduled for Today</h4>
          <p class="text-xs text-slate-500 max-w-sm mx-auto">
            ${escapeHtml(dog.name)} has a rest day today, or no walk has been parsed yet for this day of the week.
          </p>
        </div>
        <button id="todayQuickAddWalkBtn" class="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-xl shadow-sm transition">
          <i class="fa-solid fa-plus"></i>
          <span>Schedule Walk for Today</span>
        </button>
      </div>
    `;

    document.getElementById('todayQuickAddWalkBtn')?.addEventListener('click', () => {
      if (todaySlot) {
        todaySlot.hasWalk = true;
        todaySlot.status = 'confirmed';
        todaySlot.walkStatus = 'scheduled';
        renderAll();
        showToast(`Added walk for today (${todaySlot.dayName})!`, 'success');
      }
    });
    return;
  }

  // There IS a walk scheduled today!
  const status = todaySlot.walkStatus || 'scheduled'; // 'scheduled' | 'in_progress' | 'completed'
  const timeFormatted = formatTimeTo12Hour(todaySlot.startTime);
  const conflict = checkSlotConflict(todaySlot, dog);
  const lockboxNotes = elements.walkerNotesInput?.value.trim() || dog.notes || 'Standard lockbox code / check routine notes.';

  if (elements.heroTodayWalkStatus) {
    elements.heroTodayWalkStatus.textContent = status === 'completed' ? 'Completed ✅' : status === 'in_progress' ? 'Walking Now 🐾' : 'Scheduled';
  }
  if (elements.heroTodayWalkTime) {
    elements.heroTodayWalkTime.textContent = `${timeFormatted} (${todaySlot.duration}m)`;
  }

  container.innerHTML = `
    <div class="rounded-2xl border ${
      conflict.hasConflict 
        ? 'border-rose-300 bg-rose-50/40' 
        : status === 'completed'
          ? 'border-emerald-300 bg-emerald-50/30'
          : status === 'in_progress'
            ? 'border-amber-300 bg-amber-50/30 shadow-xs'
            : 'border-orange-200 bg-orange-50/20'
    } p-4 sm:p-5 space-y-4">

      <!-- Walk Time, Dog & Status Badges -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-2xl ${
            status === 'completed' ? 'bg-emerald-500 text-white' : status === 'in_progress' ? 'bg-amber-500 text-white animate-pulse' : 'bg-orange-500 text-white'
          } flex items-center justify-center text-xl shadow-md">
            <i class="fa-solid ${status === 'completed' ? 'fa-check' : 'fa-paw'}"></i>
          </div>
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <h4 class="font-extrabold text-slate-900 text-base">${escapeHtml(dog.name)}'s Walk Session</h4>
              <span class="text-xs font-bold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700">
                <i class="fa-regular fa-clock text-orange-500 mr-1"></i> ${escapeHtml(timeFormatted)}
              </span>
              <span class="text-xs font-medium text-slate-500">${todaySlot.duration} mins</span>
              ${todaySlot.isSolo ? '<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">Solo Walk</span>' : ''}
            </div>
            <p class="text-xs text-slate-500 mt-0.5">
              Walker: <strong>${escapeHtml(walker.name)}</strong> (${escapeHtml(walker.whatsAppNumber)})
            </p>
          </div>
        </div>

        <!-- Live Status Action Buttons -->
        <div class="flex items-center gap-1.5 self-start sm:self-auto bg-white p-1 rounded-xl border border-slate-200/80 shadow-2xs">
          <button class="today-status-btn px-2.5 py-1 text-xs font-bold rounded-lg transition ${
            status === 'scheduled' ? 'bg-orange-500 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
          }" data-status="scheduled">
            ⏳ Scheduled
          </button>
          <button class="today-status-btn px-2.5 py-1 text-xs font-bold rounded-lg transition ${
            status === 'in_progress' ? 'bg-amber-500 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
          }" data-status="in_progress">
            🐾 On Walk
          </button>
          <button class="today-status-btn px-2.5 py-1 text-xs font-bold rounded-lg transition ${
            status === 'completed' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
          }" data-status="completed">
            ✅ Done
          </button>
        </div>
      </div>

      <!-- Pack Companions & Safety info -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div class="bg-white rounded-xl p-3 border border-slate-100 space-y-1">
          <span class="font-bold text-slate-700 flex items-center gap-1.5">
            <i class="fa-solid fa-users text-orange-500"></i> Pack Companions:
          </span>
          <p class="text-slate-600">
            ${todaySlot.companions && todaySlot.companions.length > 0 
              ? escapeHtml(todaySlot.companions.join(', ')) 
              : todaySlot.isSolo 
                ? '<span class="text-indigo-600 font-semibold">Solo Walk (No other dogs)</span>' 
                : '<span class="text-slate-400 italic">No other companions listed</span>'}
          </p>
        </div>

        <div class="bg-white rounded-xl p-3 border border-slate-100 space-y-1">
          <span class="font-bold text-slate-700 flex items-center gap-1.5">
            <i class="fa-solid fa-key text-amber-500"></i> Lockbox & Care Notes:
          </span>
          <p class="text-slate-600 truncate">${escapeHtml(lockboxNotes)}</p>
        </div>
      </div>

      ${conflict.hasConflict ? `
        <div class="bg-rose-100 text-rose-900 border border-rose-300 rounded-xl p-3 text-xs flex items-center gap-2">
          <i class="fa-solid fa-triangle-exclamation text-rose-600"></i>
          <span><strong>Compatibility Warning:</strong> ${escapeHtml(conflict.reason)}</span>
        </div>
      ` : ''}

      <!-- Bottom Direct Post & Contact Action Bar -->
      <div class="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/60">
        <span class="text-xs text-slate-500">
          Walk Finished? Tag photos & share with owner!
        </span>
        <button id="todayPostMontageBtn" class="px-3.5 py-1.5 bg-gradient-to-r from-pink-600 to-orange-500 hover:opacity-90 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5">
          <i class="fa-solid fa-camera"></i>
          <span>Create Montage for Today's Walk</span>
        </button>
      </div>

    </div>
  `;

  // Status Change Listeners
  container.querySelectorAll('.today-status-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      todaySlot.walkStatus = btn.getAttribute('data-status');
      saveToLocalStorage();
      renderTodayAgenda();
      showToast(`Updated today's walk to ${todaySlot.walkStatus.toUpperCase()}!`, 'info');
    });
  });

  document.getElementById('todayPostMontageBtn')?.addEventListener('click', () => {
    appState.montage.taggedDogId = dog.id;
    appState.montage.taggedWalkerId = walker.id;
    appState.montage.date = new Date().toISOString().slice(0, 10);
    switchTab('tab-montage');
  });
}

// =========================================================================
// "GO TO PAPER" (PRINTABLE CLIPBOARD RUN-SHEET ENGINE)
// =========================================================================

function generatePaperPrintSheet(scope = 'today') {
  const dog = getActiveDog();
  const walker = getActiveContact();
  const now = new Date();
  const notes = elements.walkerNotesInput?.value.trim() || 'Standard entry via lockbox code.';

  let walksToPrint = [];
  let title = '';

  if (scope === 'today') {
    const todaySlot = getTodayDaySlot();
    walksToPrint = todaySlot && todaySlot.hasWalk ? [todaySlot] : [];
    title = `Daily Dog Walking Sheet (${now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })})`;
  } else {
    walksToPrint = appState.days.filter(d => d.hasWalk);
    const startMonday = getTargetMondayDate();
    const endSunday = new Date(startMonday);
    endSunday.setDate(startMonday.getDate() + 6);
    title = `Weekly Dog Walking Itinerary (${startMonday.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${endSunday.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })})`;
  }

  let html = `
    <div class="space-y-4">
      <!-- Header -->
      <div class="border-b-2 border-slate-900 pb-3 flex items-start justify-between">
        <div>
          <h2 class="text-xl font-extrabold tracking-tight text-slate-900">🐾 ${escapeHtml(title)}</h2>
          <p class="text-xs text-slate-600 mt-1">
            <strong>Assigned Walker:</strong> ${escapeHtml(walker.name)} | <strong>WhatsApp:</strong> ${escapeHtml(walker.whatsAppNumber)} | <strong>Rate:</strong> ${escapeHtml(walker.currency)}${Number(walker.ratePerWalk).toFixed(2)}/walk
          </p>
        </div>
        <div class="text-right text-xs font-mono text-slate-500">
          Printed: ${escapeHtml(now.toLocaleString('en-GB'))}
        </div>
      </div>

      <!-- Dog Profile Summary Card -->
      <div class="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1">
        <div class="font-bold text-slate-900">
          🐶 Dog Profile: ${escapeHtml(dog.name)} (${escapeHtml(dog.breed || 'Breed')}, ${escapeHtml(dog.age || 'Age')})
        </div>
        <div class="text-slate-600">
          <strong>Safety & Walk Preference:</strong> ${escapeHtml(dog.walkPreference.toUpperCase())}
          ${dog.incompatibleDogs ? ` | <strong class="text-rose-600">⛔ Does NOT walk with:</strong> ${escapeHtml(dog.incompatibleDogs)}` : ''}
          ${dog.favoriteFriends ? ` | <strong>🐾 Buddies:</strong> ${escapeHtml(dog.favoriteFriends)}` : ''}
        </div>
        <div class="text-slate-600">
          <strong>Routine / Lockbox / Emergency Notes:</strong> ${escapeHtml(notes)}
        </div>
      </div>

      <!-- Schedule Run-Sheet Table -->
      <table class="print-table w-full text-xs text-left border-collapse border border-slate-300">
        <thead>
          <tr class="bg-slate-100 border-b border-slate-300 font-bold text-slate-900">
            <th class="p-2 border border-slate-300 w-12 text-center">Done</th>
            <th class="p-2 border border-slate-300">Day & Date</th>
            <th class="p-2 border border-slate-300">Time & Duration</th>
            <th class="p-2 border border-slate-300">Dog & Walker</th>
            <th class="p-2 border border-slate-300">Pack / Companions</th>
            <th class="p-2 border border-slate-300">Status / Notes</th>
          </tr>
        </thead>
        <tbody>
  `;

  if (walksToPrint.length === 0) {
    html += `
      <tr>
        <td colspan="6" class="p-4 text-center text-slate-400 italic">No walks scheduled for this period.</td>
      </tr>
    `;
  } else {
    walksToPrint.forEach(w => {
      const dateStr = w.date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      const time12 = formatTimeTo12Hour(w.startTime);
      const isDone = w.walkStatus === 'completed';

      html += `
        <tr class="border-b border-slate-200">
          <td class="p-2 border border-slate-300 text-center font-bold text-base">
            ${isDone ? '☑' : '☐'}
          </td>
          <td class="p-2 border border-slate-300 font-bold text-slate-900">
            ${escapeHtml(w.dayName)}<br><span class="font-normal text-[11px] text-slate-500">${escapeHtml(dateStr)}</span>
          </td>
          <td class="p-2 border border-slate-300">
            <strong>${escapeHtml(time12)}</strong><br><span class="text-[11px] text-slate-500">${w.duration} mins</span>
          </td>
          <td class="p-2 border border-slate-300">
            <strong>${escapeHtml(dog.name)}</strong><br><span class="text-[11px] text-slate-600">with ${escapeHtml(walker.name)}</span>
          </td>
          <td class="p-2 border border-slate-300">
            ${w.companions && w.companions.length > 0 
              ? escapeHtml(w.companions.join(', ')) 
              : w.isSolo 
                ? '<span class="font-bold text-indigo-700">Solo Walk</span>' 
                : '<span class="text-slate-400 italic">None</span>'}
          </td>
          <td class="p-2 border border-slate-300">
            <span class="font-mono text-[11px]">${w.walkStatus ? w.walkStatus.toUpperCase() : 'SCHEDULED'}</span>
          </td>
        </tr>
      `;
    });
  }

  html += `
        </tbody>
      </table>

      <!-- Footer & Signature -->
      <div class="pt-4 border-t border-slate-300 flex justify-between text-xs text-slate-600">
        <div>
          <p><strong>Total Walks:</strong> ${walksToPrint.length} | <strong>Total Amount Due:</strong> ${walker.currency}${(walksToPrint.length * walker.ratePerWalk).toFixed(2)}</p>
        </div>
        <div class="w-60 border-b border-slate-400 text-right pb-1">
          Walker Signature / Date
        </div>
      </div>
    </div>
  `;

  return html;
}

function openPaperPrintModal(scope = 'today') {
  appState.currentPrintScope = scope;
  
  if (scope === 'today') {
    elements.printScopeTodayBtn.className = 'px-3 py-1.5 rounded-lg bg-white font-bold text-orange-600 shadow-2xs border border-slate-200';
    elements.printScopeWeekBtn.className = 'px-3 py-1.5 rounded-lg text-slate-600 font-semibold hover:text-slate-900';
  } else {
    elements.printScopeWeekBtn.className = 'px-3 py-1.5 rounded-lg bg-white font-bold text-orange-600 shadow-2xs border border-slate-200';
    elements.printScopeTodayBtn.className = 'px-3 py-1.5 rounded-lg text-slate-600 font-semibold hover:text-slate-900';
  }

  elements.paperPrintArea.innerHTML = generatePaperPrintSheet(scope);
  elements.paperPrintModal.classList.remove('hidden');
}

// =========================================================================
// "EXPORT ALL TO EXCEL SPREADSHEET" (.CSV / .XLSX ENGINE)
// =========================================================================

function exportAllToExcelCsv() {
  const dog = getActiveDog();
  const walker = getActiveContact();
  const startMonday = getTargetMondayDate();
  const activeWalks = appState.days.filter(d => d.hasWalk);
  const now = new Date();

  const csvRows = [];
  const escapeCsv = (val) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  // Section 1: Header & Summary
  csvRows.push([escapeCsv('🐾 DOG WALKING ORGANISER & SCHEDULE REPORT')]);
  csvRows.push([escapeCsv('Export Date'), escapeCsv(now.toISOString().slice(0, 10))]);
  csvRows.push([escapeCsv('Active Dog'), escapeCsv(dog.name), escapeCsv('Breed'), escapeCsv(dog.breed || 'N/A')]);
  csvRows.push([escapeCsv('Assigned Walker'), escapeCsv(walker.name), escapeCsv('WhatsApp'), escapeCsv(walker.whatsAppNumber)]);
  csvRows.push([]);

  // Section 2: Weekly Schedule Table
  csvRows.push([escapeCsv('--- WEEKLY WALK SCHEDULE ---')]);
  csvRows.push([
    escapeCsv('Day'),
    escapeCsv('Date'),
    escapeCsv('Start Time'),
    escapeCsv('Duration (mins)'),
    escapeCsv('Dog Name'),
    escapeCsv('Walker'),
    escapeCsv('Pack Companions'),
    escapeCsv('Solo Walk?'),
    escapeCsv('Walk Status'),
    escapeCsv('Rate'),
    escapeCsv('Currency')
  ]);

  appState.days.forEach(d => {
    if (d.hasWalk) {
      csvRows.push([
        escapeCsv(d.dayName),
        escapeCsv(d.date.toISOString().slice(0, 10)),
        escapeCsv(formatTimeTo12Hour(d.startTime)),
        escapeCsv(d.duration),
        escapeCsv(dog.name),
        escapeCsv(walker.name),
        escapeCsv(d.companions && d.companions.length > 0 ? d.companions.join(', ') : 'None'),
        escapeCsv(d.isSolo ? 'YES' : 'NO'),
        escapeCsv((d.walkStatus || 'Scheduled').toUpperCase()),
        escapeCsv(walker.ratePerWalk.toFixed(2)),
        escapeCsv(walker.currency)
      ]);
    }
  });

  csvRows.push([]);
  
  // Section 3: Dog Profiles & Compatibility Rules
  csvRows.push([escapeCsv('--- ALL DOG PROFILES & SAFETY RULES ---')]);
  csvRows.push([
    escapeCsv('Dog Name'),
    escapeCsv('Breed'),
    escapeCsv('Age'),
    escapeCsv('Walking Preference'),
    escapeCsv('Does NOT Walk With (Incompatible)'),
    escapeCsv('Favorite Buddies'),
    escapeCsv('Special Routine & Diet Notes')
  ]);

  appState.dogs.forEach(d => {
    csvRows.push([
      escapeCsv(d.name),
      escapeCsv(d.breed || ''),
      escapeCsv(d.age || ''),
      escapeCsv(d.walkPreference.toUpperCase()),
      escapeCsv(d.incompatibleDogs || 'None'),
      escapeCsv(d.favoriteFriends || 'None'),
      escapeCsv(d.notes || '')
    ]);
  });

  csvRows.push([]);

  // Section 4: Walker Contacts
  csvRows.push([escapeCsv('--- WALKER CONTACTS & RATES ---')]);
  csvRows.push([
    escapeCsv('Walker Name'),
    escapeCsv('WhatsApp Phone'),
    escapeCsv('Instagram Handle'),
    escapeCsv('Currency'),
    escapeCsv('Rate Per Walk'),
    escapeCsv('Notes')
  ]);

  appState.contacts.forEach(c => {
    csvRows.push([
      escapeCsv(c.name),
      escapeCsv(c.whatsAppNumber),
      escapeCsv(c.instagramHandle),
      escapeCsv(c.currency),
      escapeCsv(c.ratePerWalk.toFixed(2)),
      escapeCsv(c.notes || '')
    ]);
  });

  csvRows.push([]);

  // Section 5: Financial Summary
  const totalCost = (activeWalks.length * walker.ratePerWalk).toFixed(2);
  const totalHours = (activeWalks.reduce((sum, d) => sum + (d.duration || 60), 0) / 60).toFixed(1);

  csvRows.push([escapeCsv('--- FINANCIAL TOTALS ---')]);
  csvRows.push([escapeCsv('Total Scheduled Walks'), escapeCsv(activeWalks.length)]);
  csvRows.push([escapeCsv('Total Hours'), escapeCsv(totalHours)]);
  csvRows.push([escapeCsv('Total Billable Amount'), escapeCsv(`${walker.currency}${totalCost}`)]);

  // Generate CSV String with UTF-8 BOM (\uFEFF) for Excel compatibility
  const csvContent = '\uFEFF' + csvRows.map(row => row.join(',')).join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  const dateStr = startMonday.toISOString().slice(0, 10);
  link.download = `dog_walking_schedule_export_${dateStr}.csv`;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  showToast('📊 Exported full schedule & dogs to Excel (.CSV)!', 'success');
}

// --- TAB SWITCHING ---
function switchTab(tabId) {
  elements.tabContents.forEach(content => {
    if (content.id === tabId) {
      content.classList.remove('hidden');
      content.classList.add('block');
    } else {
      content.classList.add('hidden');
      content.classList.remove('block');
    }
  });

  elements.navTabs.forEach(tab => {
    if (tab.getAttribute('data-tab') === tabId) {
      tab.classList.add('active');
      tab.classList.remove('text-slate-600');
    } else {
      tab.classList.remove('active');
      tab.classList.add('text-slate-600');
    }
  });

  elements.mobileNavTabs.forEach(tab => {
    if (tab.getAttribute('data-tab') === tabId) {
      tab.classList.add('active', 'text-orange-600');
      tab.classList.remove('text-slate-500');
    } else {
      tab.classList.remove('active', 'text-orange-600');
      tab.classList.add('text-slate-500');
    }
  });

  if (tabId === 'tab-menu') {
    renderMenuHub();
  } else if (tabId === 'tab-montage') {
    renderMontageCanvas();
  }
}

// --- DATE CALCULATIONS & SCHEDULE LOGIC ---
function getTargetMondayDate() {
  const now = new Date();
  const currentDayOfWeek = now.getDay();
  const distanceToMonday = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
  
  const thisMonday = new Date(now);
  thisMonday.setDate(now.getDate() + distanceToMonday);
  thisMonday.setHours(0, 0, 0, 0);

  if (appState.targetWeek === 'this') {
    return thisMonday;
  } else if (appState.targetWeek === 'next') {
    const nextMonday = new Date(thisMonday);
    nextMonday.setDate(thisMonday.getDate() + 7);
    return nextMonday;
  } else if (appState.targetWeek === 'custom' && appState.customMonday) {
    const customDate = new Date(appState.customMonday);
    customDate.setHours(0, 0, 0, 0);
    return customDate;
  }

  return thisMonday;
}

function initializeWeekDays() {
  const startMonday = getTargetMondayDate();
  appState.days = DAY_NAMES.map((dayName, idx) => {
    const dayDate = new Date(startMonday);
    dayDate.setDate(startMonday.getDate() + idx);
    
    return {
      id: `day-${idx}-${Date.now()}`,
      dayIndex: idx,
      dayName: dayName,
      date: dayDate,
      hasWalk: false,
      isSolo: false,
      companions: [],
      startTime: '07:30',
      duration: appState.walkDuration || 60,
      status: 'off',
      walkStatus: 'scheduled',
      note: ''
    };
  });
}

function parseScheduleText(text) {
  if (!text || text.trim() === '') {
    showToast('Please paste a schedule message first!', 'warning');
    return;
  }

  initializeWeekDays();

  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  let parsedCount = 0;

  const dayRegexMap = [
    { idx: 0, regex: /\b(mon|monday)\b/i },
    { idx: 1, regex: /\b(tue|tues|tuesday)\b/i },
    { idx: 2, regex: /\b(wed|wednesday)\b/i },
    { idx: 3, regex: /\b(thu|thur|thurs|thursday)\b/i },
    { idx: 4, regex: /\b(fri|friday)\b/i },
    { idx: 5, regex: /\b(sat|saturday)\b/i },
    { idx: 6, regex: /\b(sun|sunday)\b/i }
  ];

  const timeRegex = /(\b\d{1,2})([.:](\d{2}))?\s*(am|pm)?\b/i;

  lines.forEach(line => {
    for (const { idx, regex } of dayRegexMap) {
      if (regex.test(line)) {
        const timeMatch = line.match(timeRegex);
        if (timeMatch) {
          let hours = parseInt(timeMatch[1], 10);
          const minutes = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0;
          const meridian = timeMatch[4] ? timeMatch[4].toLowerCase() : null;

          if (meridian === 'pm' && hours < 12) hours += 12;
          else if (meridian === 'am' && hours === 12) hours = 0;
          else if (!meridian && hours >= 1 && hours <= 6) hours += 12;

          const formattedTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
          
          appState.days[idx].hasWalk = true;
          appState.days[idx].startTime = formattedTime;
          appState.days[idx].status = 'confirmed';
          appState.days[idx].walkStatus = 'scheduled';
          appState.days[idx].duration = parseInt(elements.walkDurationSelect.value, 10) || 60;

          if (/\b(solo|individual|alone|1-on-1|single)\b/i.test(line)) {
            appState.days[idx].isSolo = true;
            appState.days[idx].companions = [];
          } else {
            const withMatch = line.match(/\bwith\s+([A-Za-z0-9,\s&]+)/i);
            if (withMatch) {
              const companionsRaw = withMatch[1]
                .replace(/\b(and|&)\b/gi, ',')
                .split(',')
                .map(s => s.trim())
                .filter(s => s.length > 0 && !/^(next|week|times|morning|afternoon|walk)$/i.test(s));
              appState.days[idx].companions = companionsRaw;
              appState.days[idx].isSolo = false;
            } else {
              appState.days[idx].isSolo = false;
            }
          }

          parsedCount++;
        }
        break;
      }
    }
  });

  if (parsedCount > 0) {
    showToast(`🎉 Parsed ${parsedCount} walk slot${parsedCount > 1 ? 's' : ''}!`, 'success');
  } else {
    showToast('Could not find walk times in text. Add them manually with 1-click.', 'info');
  }

  renderSchedule();
  renderMenuHub();
  saveToLocalStorage();
}

function checkSlotConflict(day, activeDog) {
  if (!day.hasWalk) return { hasConflict: false };

  if (activeDog.walkPreference === 'solo' && !day.isSolo && day.companions.length > 0) {
    return {
      hasConflict: true,
      type: 'solo_violation',
      reason: `${activeDog.name} is set to Solo Walk Only, but other dogs (${day.companions.join(', ')}) are scheduled on this walk.`
    };
  }

  if (activeDog.incompatibleDogs && activeDog.incompatibleDogs.trim() !== '') {
    const forbiddenList = activeDog.incompatibleDogs
      .split(',')
      .map(s => s.trim().toLowerCase())
      .filter(s => s.length > 0);

    for (const comp of day.companions) {
      const compLower = comp.toLowerCase();
      if (forbiddenList.some(f => compLower.includes(f) || f.includes(compLower))) {
        return {
          hasConflict: true,
          type: 'incompatible_dog',
          incompatibleName: comp,
          reason: `⚠️ Safety Conflict: "${comp}" is on this walk! ${activeDog.name} does not walk with ${comp}.`
        };
      }
    }
  }

  return { hasConflict: false };
}

function renderSchedule() {
  const startMonday = getTargetMondayDate();
  const endSunday = new Date(startMonday);
  endSunday.setDate(startMonday.getDate() + 6);

  const startFormatted = startMonday.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const endFormatted = endSunday.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const dog = getActiveDog();

  elements.scheduleWeekHeading.textContent = `Week of ${startFormatted} – ${endFormatted}`;
  
  const activeWalks = appState.days.filter(d => d.hasWalk);
  elements.scheduleWeekSubheading.textContent = activeWalks.length > 0
    ? `${activeWalks.length} walks scheduled for ${dog.name}`
    : 'No walks scheduled yet. Parse a message or click days below to add.';

  let totalConflicts = 0;
  const conflictDetails = [];

  elements.scheduleCardsContainer.innerHTML = '';
  appState.days.forEach((day, idx) => {
    const conflict = checkSlotConflict(day, dog);
    if (conflict.hasConflict) {
      totalConflicts++;
      conflictDetails.push(`${escapeHtml(day.dayName)}: ${escapeHtml(conflict.reason)}`);
    }
    const card = createDayCardElement(day, idx, conflict);
    elements.scheduleCardsContainer.appendChild(card);
  });

  if (totalConflicts > 0) {
    elements.globalConflictBanner.classList.remove('hidden');
    elements.conflictCountBadge.textContent = `${totalConflicts} conflict${totalConflicts > 1 ? 's' : ''}`;
    elements.globalConflictMessage.innerHTML = conflictDetails.join('<br>');
  } else {
    elements.globalConflictBanner.classList.add('hidden');
  }

  updateFinancialsAndStats();
  updateReplyPreview(totalConflicts > 0);
}

function createDayCardElement(day, index, conflict = { hasConflict: false }) {
  const card = document.createElement('div');
  const dayDateFormatted = day.date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const isWeekend = day.dayIndex === 5 || day.dayIndex === 6;

  card.className = `day-card rounded-xl border p-3.5 flex flex-col gap-3 ${
    day.hasWalk 
      ? conflict.hasConflict
        ? 'has-conflict border-rose-400 bg-rose-50/40 shadow-xs'
        : 'active-walk border-orange-300 bg-orange-50/20 shadow-xs' 
      : 'bg-white border-slate-200/80 opacity-75 hover:opacity-100'
  }`;

  const time12h = formatTimeTo12Hour(day.startTime);
  const companionsStr = day.companions && day.companions.length > 0 ? day.companions.join(', ') : '';

  card.innerHTML = `
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div class="flex items-center gap-3.5">
        <button type="button" class="toggle-walk-btn w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
          day.hasWalk 
            ? conflict.hasConflict ? 'bg-rose-600 text-white shadow-xs' : 'bg-orange-500 text-white shadow-xs' 
            : 'border-2 border-slate-300 text-transparent hover:border-orange-400'
        }" data-index="${index}" title="${day.hasWalk ? 'Remove Walk' : 'Add Walk'}">
          <i class="fa-solid fa-check text-xs"></i>
        </button>

        <div>
          <div class="flex items-center gap-2">
            <span class="font-bold text-sm ${day.hasWalk ? 'text-slate-900' : 'text-slate-500'}">
              ${escapeHtml(day.dayName)}
            </span>
            <span class="text-xs text-slate-400 font-medium">
              ${escapeHtml(dayDateFormatted)}
            </span>
            ${isWeekend ? '<span class="text-[10px] px-1.5 py-0.2 bg-slate-100 text-slate-500 rounded font-medium">Weekend</span>' : ''}
            ${day.hasWalk && day.isSolo ? '<span class="text-[10px] px-2 py-0.2 bg-indigo-100 text-indigo-800 rounded-full font-bold">Solo Walk</span>' : ''}
          </div>
          
          ${day.hasWalk ? `
            <div class="flex flex-wrap items-center gap-2 mt-1 text-xs">
              <span class="inline-flex items-center gap-1 font-semibold text-orange-600 bg-orange-100/70 px-2 py-0.5 rounded-md">
                <i class="fa-regular fa-clock text-[10px]"></i> ${escapeHtml(time12h)}
              </span>
              <span class="text-slate-400">•</span>
              <span class="text-slate-500">${day.duration} mins</span>
              ${day.companions && day.companions.length > 0 ? `
                <span class="text-slate-400">•</span>
                <span class="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                  <i class="fa-solid fa-users text-slate-400 text-[10px]"></i> With: ${escapeHtml(companionsStr)}
                </span>
              ` : ''}
            </div>
          ` : `
            <span class="text-xs text-slate-400 italic">No walk scheduled</span>
          `}
        </div>
      </div>

      <div class="flex items-center gap-2 self-end sm:self-auto">
        ${day.hasWalk ? `
          <input type="time" value="${escapeHtml(day.startTime)}" data-index="${index}" class="walk-time-input bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500" title="Change start time">

          <select data-index="${index}" class="walk-duration-input bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-medium text-slate-700 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500" title="Change duration">
            <option value="30" ${day.duration === 30 ? 'selected' : ''}>30m</option>
            <option value="45" ${day.duration === 45 ? 'selected' : ''}>45m</option>
            <option value="60" ${day.duration === 60 ? 'selected' : ''}>1h</option>
            <option value="90" ${day.duration === 90 ? 'selected' : ''}>1.5h</option>
          </select>

          <button class="quick-gcal-btn p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition" data-index="${index}" title="Add to Google Calendar">
            <i class="fa-brands fa-google text-xs"></i>
          </button>

          <button class="remove-slot-btn p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition" data-index="${index}" title="Delete walk">
            <i class="fa-solid fa-xmark text-xs"></i>
          </button>
        ` : `
          <button class="add-slot-btn text-xs font-semibold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200/60 rounded-lg px-2.5 py-1 transition flex items-center gap-1" data-index="${index}">
            <i class="fa-solid fa-plus text-[10px]"></i> Add Walk
          </button>
        `}
      </div>
    </div>

    ${day.hasWalk && conflict.hasConflict ? `
      <div class="bg-rose-100/80 border border-rose-300 rounded-lg p-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-rose-900 animate-in fade-in duration-200">
        <div class="flex items-center gap-2">
          <i class="fa-solid fa-triangle-exclamation text-rose-600 text-sm"></i>
          <span class="font-bold">${escapeHtml(conflict.reason)}</span>
        </div>
        <div class="flex items-center gap-2">
          <button class="make-solo-btn px-2.5 py-1 bg-white border border-rose-300 hover:bg-rose-50 text-rose-700 font-bold rounded-md shadow-2xs transition" data-index="${index}">
            Change to Solo Walk
          </button>
        </div>
      </div>
    ` : ''}

    ${day.hasWalk ? `
      <div class="pt-1 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
        <div class="flex items-center gap-2">
          <label class="font-semibold text-slate-600">Other Dogs in Pack:</label>
          <input type="text" value="${escapeHtml(companionsStr)}" data-index="${index}" class="companions-input bg-slate-50 border border-slate-200 rounded px-2 py-0.5 text-[11px] text-slate-800 focus:ring-1 focus:ring-orange-500 placeholder-slate-400" placeholder="e.g. Buster, Bella">
        </div>

        <button class="toggle-solo-btn font-semibold ${day.isSolo ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}" data-index="${index}">
          <i class="fa-solid ${day.isSolo ? 'fa-user-lock' : 'fa-users'} mr-1"></i> ${day.isSolo ? 'Solo Walk Mode (On)' : 'Make Solo Walk'}
        </button>
      </div>
    ` : ''}
  `;

  // Listeners
  card.querySelector('.toggle-walk-btn')?.addEventListener('click', () => {
    day.hasWalk = !day.hasWalk;
    if (day.hasWalk) day.status = 'confirmed';
    renderSchedule();
    renderMenuHub();
    saveToLocalStorage();
  });

  card.querySelector('.add-slot-btn')?.addEventListener('click', () => {
    day.hasWalk = true;
    day.status = 'confirmed';
    renderSchedule();
    renderMenuHub();
    saveToLocalStorage();
  });

  card.querySelector('.remove-slot-btn')?.addEventListener('click', () => {
    day.hasWalk = false;
    renderSchedule();
    renderMenuHub();
    saveToLocalStorage();
  });

  card.querySelector('.walk-time-input')?.addEventListener('change', (e) => {
    day.startTime = e.target.value;
    renderSchedule();
    renderMenuHub();
    saveToLocalStorage();
  });

  card.querySelector('.walk-duration-input')?.addEventListener('change', (e) => {
    day.duration = parseInt(e.target.value, 10);
    renderSchedule();
    renderMenuHub();
    saveToLocalStorage();
  });

  card.querySelector('.quick-gcal-btn')?.addEventListener('click', () => {
    window.open(generateSingleGoogleCalendarUrl(day), '_blank');
  });

  card.querySelector('.companions-input')?.addEventListener('change', (e) => {
    const raw = e.target.value.trim();
    if (raw) {
      day.companions = raw.split(',').map(s => s.trim()).filter(s => s.length > 0);
      day.isSolo = false;
    } else {
      day.companions = [];
    }
    renderSchedule();
    renderMenuHub();
    saveToLocalStorage();
  });

  card.querySelector('.toggle-solo-btn')?.addEventListener('click', () => {
    day.isSolo = !day.isSolo;
    if (day.isSolo) day.companions = [];
    renderSchedule();
    renderMenuHub();
    saveToLocalStorage();
  });

  card.querySelector('.make-solo-btn')?.addEventListener('click', () => {
    day.isSolo = true;
    day.companions = [];
    renderSchedule();
    renderMenuHub();
    saveToLocalStorage();
    showToast(`Set ${escapeHtml(day.dayName)} as Solo Walk. Conflict resolved!`, 'success');
  });

  return card;
}

function updateFinancialsAndStats() {
  const activeWalks = appState.days.filter(d => d.hasWalk);
  const walker = getActiveContact();
  const totalCount = activeWalks.length;
  const totalMinutes = activeWalks.reduce((sum, d) => sum + (d.duration || 60), 0);
  const totalHours = (totalMinutes / 60).toFixed(1);
  const cost = (totalCount * walker.ratePerWalk).toFixed(2);

  elements.totalWalksDisplay.textContent = `${totalCount} Walk${totalCount === 1 ? '' : 's'}`;
  elements.totalHoursDisplay.textContent = `${totalHours} hrs duration`;
  elements.totalCostDisplay.textContent = `${walker.currency}${cost}`;
  elements.ratePerWalkDisplay.textContent = `@ ${walker.currency}${Number(walker.ratePerWalk).toFixed(2)}/walk`;
  elements.walkCountBadge.textContent = `${totalCount} scheduled`;
}

function generateReplyMessage(hasConflicts = false) {
  const activeWalks = appState.days.filter(d => d.hasWalk);
  const walker = getActiveContact();
  const dog = getActiveDog();
  const notes = elements.walkerNotesInput?.value.trim();

  if (activeWalks.length === 0) {
    return `Hi ${walker.name}! Thanks for checking in. No walks scheduled for ${dog.name} next week.`;
  }

  let text = `Hi ${walker.name}! Thanks for sending over the schedule for ${dog.name} next week:\n\n`;
  const conflictLines = [];

  activeWalks.forEach(d => {
    const conflict = checkSlotConflict(d, dog);
    const dateFormatted = d.date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    const timeFormatted = formatTimeTo12Hour(d.startTime);
    const packInfo = d.companions && d.companions.length > 0 ? ` (with ${d.companions.join(', ')})` : d.isSolo ? ' (Solo)' : '';

    if (conflict.hasConflict) {
      conflictLines.push(`• ${d.dayName} (${timeFormatted}): ${conflict.reason}`);
      text += `⚠️ ${d.dayName} (${dateFormatted}) at ${timeFormatted}${packInfo} — [Conflict]\n`;
    } else {
      text += `🐾 ${d.dayName} (${dateFormatted}) at ${timeFormatted}${packInfo}\n`;
    }
  });

  if (conflictLines.length > 0) {
    text += `\n⚠️ Quick heads up regarding ${dog.name}:\n`;
    conflictLines.forEach(cl => text += `${cl}\n`);
    text += `Could we switch the flagged slot(s) to a solo walk or different time?`;
  }

  const totalCost = (activeWalks.length * walker.ratePerWalk).toFixed(2);
  text += `\n\nTotal: ${activeWalks.length} walks (${walker.currency}${totalCost})`;

  if (notes) text += `\nNote: ${notes}`;
  text += `\nSee you then! 🐶`;

  return text;
}

function updateReplyPreview(hasConflicts = false) {
  if (elements.replyMessagePreview) {
    elements.replyMessagePreview.value = generateReplyMessage(hasConflicts);
  }
}

// --- CALENDAR & ICS EXPORT ---
function generateIcsCalendar() {
  const activeWalks = appState.days.filter(d => d.hasWalk);
  if (activeWalks.length === 0) {
    showToast('Schedule at least one walk before exporting.', 'warning');
    return null;
  }

  const walker = getActiveContact();
  const dog = getActiveDog();
  const notes = elements.walkerNotesInput?.value.trim();

  let icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Dog Walking Organiser//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${dog.name}'s Dog Walking Schedule`
  ];

  activeWalks.forEach(walk => {
    const [hours, minutes] = walk.startTime.split(':').map(Number);
    const startDateTime = new Date(walk.date);
    startDateTime.setHours(hours, minutes, 0, 0);

    const endDateTime = new Date(startDateTime);
    endDateTime.setMinutes(startDateTime.getMinutes() + (walk.duration || 60));

    const dtStamp = formatIcsDate(new Date());
    const dtStart = formatIcsDate(startDateTime);
    const dtEnd = formatIcsDate(endDateTime);
    const uid = `dogwalk-${walk.id}-${Date.now()}@dogwalking.local`;

    const summary = `🐾 Dog Walk: ${dog.name} with ${walker.name}${walk.isSolo ? ' (Solo)' : ''}`;
    let description = `Dog Walking for ${dog.name} with ${walker.name}.\\nRate: ${walker.currency}${Number(walker.ratePerWalk).toFixed(2)}`;
    if (walk.companions && walk.companions.length > 0) {
      description += `\\nPack: ${walk.companions.join(', ')}`;
    }
    if (notes) description += `\\nNotes: ${notes}`;

    icsLines.push(
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${dtStamp}`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}`,
      'LOCATION:Home',
      'STATUS:CONFIRMED',
      'BEGIN:VALARM',
      'TRIGGER:-PT15M',
      'ACTION:DISPLAY',
      'DESCRIPTION:Dog walk starting in 15 minutes',
      'END:VALARM',
      'END:VEVENT'
    );
  });

  icsLines.push('END:VCALENDAR');
  return icsLines.join('\r\n');
}

function downloadIcsFile() {
  const icsContent = generateIcsCalendar();
  if (!icsContent) return;

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const startMonday = getTargetMondayDate();
  const dateStr = startMonday.toISOString().slice(0, 10);
  
  link.href = url;
  link.download = `dog_walks_${getActiveDog().name.toLowerCase()}_${dateStr}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  showToast('📅 Calendar (.ICS) downloaded! Ready to import.', 'success');
}

function generateSingleGoogleCalendarUrl(walk) {
  const walker = getActiveContact();
  const dog = getActiveDog();
  const notes = elements.walkerNotesInput?.value.trim();
  const [hours, minutes] = walk.startTime.split(':').map(Number);
  
  const startDateTime = new Date(walk.date);
  startDateTime.setHours(hours, minutes, 0, 0);

  const endDateTime = new Date(startDateTime);
  endDateTime.setMinutes(startDateTime.getMinutes() + (walk.duration || 60));

  const dtStart = formatGcalDate(startDateTime);
  const dtEnd = formatGcalDate(endDateTime);

  const title = `🐾 Dog Walk: ${dog.name} with ${walker.name}${walk.isSolo ? ' (Solo)' : ''}`;
  let details = `Dog Walking session for ${dog.name} with ${walker.name}.\nRate: ${walker.currency}${Number(walker.ratePerWalk).toFixed(2)}`;
  if (walk.companions && walk.companions.length > 0) details += `\nPack: ${walk.companions.join(', ')}`;
  if (notes) details += `\nNotes: ${notes}`;

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${dtStart}/${dtEnd}`,
    details: details,
    location: 'Home'
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function openGoogleCalendarModal() {
  const activeWalks = appState.days.filter(d => d.hasWalk);
  if (activeWalks.length === 0) {
    showToast('No walks to export! Schedule at least one walk.', 'warning');
    return;
  }

  elements.googleEventsList.innerHTML = '';
  activeWalks.forEach(walk => {
    const item = document.createElement('div');
    const dayFormatted = walk.dayName;
    const dateFormatted = walk.date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    const timeFormatted = formatTimeTo12Hour(walk.startTime);
    const gcalUrl = generateSingleGoogleCalendarUrl(walk);

    item.className = 'flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100 transition';
    item.innerHTML = `
      <div class="flex items-center gap-2">
        <span class="w-2 h-2 rounded-full bg-blue-500"></span>
        <span class="font-bold text-slate-800 text-xs">${escapeHtml(dayFormatted)} (${escapeHtml(dateFormatted)})</span>
        <span class="text-slate-400">•</span>
        <span class="text-xs font-semibold text-blue-600">${escapeHtml(timeFormatted)}</span>
      </div>
      <a href="${gcalUrl}" target="_blank" class="px-2.5 py-1 rounded-md bg-white border border-slate-200 hover:border-blue-300 text-blue-600 text-xs font-semibold shadow-2xs transition flex items-center gap-1">
        <span>Add</span> <i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
      </a>
    `;
    elements.googleEventsList.appendChild(item);
  });

  elements.googleEventsModal.classList.remove('hidden');
}

function openAllGoogleEventsInTabs() {
  const activeWalks = appState.days.filter(d => d.hasWalk);
  activeWalks.forEach((walk, i) => {
    const url = generateSingleGoogleCalendarUrl(walk);
    setTimeout(() => {
      window.open(url, '_blank');
    }, i * 200);
  });
  showToast(`Opened ${activeWalks.length} Google Calendar event tabs!`, 'success');
}

// --- SOCIAL ACTIONS (WHATSAPP & INSTAGRAM) ---
function handleWhatsAppReply() {
  const walker = getActiveContact();
  const msg = elements.replyMessagePreview.value;
  const rawPhone = walker.whatsAppNumber.replace(/[^0-9]/g, '');
  const url = `https://wa.me/${rawPhone}?text=${encodeURIComponent(msg)}`;
  
  window.open(url, '_blank');
  showToast(`💬 Opening WhatsApp for ${escapeHtml(walker.name)}...`, 'success');
}

function handleInstagramReply() {
  const walker = getActiveContact();
  const msg = elements.replyMessagePreview.value;
  let handle = walker.instagramHandle.trim().replace(/^@/, '');
  
  navigator.clipboard.writeText(msg).then(() => {
    showToast(`📋 Copied confirmation! Opening Instagram DM for @${escapeHtml(handle)}...`, 'success');
    const igUrl = handle ? `https://ig.me/m/${handle}` : 'https://www.instagram.com/direct/inbox/';
    setTimeout(() => {
      window.open(igUrl, '_blank');
    }, 300);
  }).catch(() => {
    window.open(`https://ig.me/m/${handle}`, '_blank');
  });
}

// --- HISTORY LOGGING ---
function saveCurrentScheduleToHistory() {
  const activeWalks = appState.days.filter(d => d.hasWalk);
  if (activeWalks.length === 0) {
    showToast('Cannot save an empty schedule!', 'warning');
    return;
  }

  const walker = getActiveContact();
  const dog = getActiveDog();
  const startMonday = getTargetMondayDate();

  const summaryItem = {
    id: `hist-${Date.now()}`,
    savedAt: new Date().toISOString(),
    weekStart: startMonday.toISOString(),
    dogName: dog.name,
    walkerName: walker.name,
    walkCount: activeWalks.length,
    totalCost: (activeWalks.length * walker.ratePerWalk).toFixed(2),
    currency: walker.currency,
    walks: activeWalks.map(w => ({
      day: w.dayName,
      time: w.startTime,
      duration: w.duration,
      isSolo: w.isSolo,
      companions: w.companions
    }))
  };

  appState.history.unshift(summaryItem);
  if (appState.history.length > 10) appState.history.pop();
  saveToLocalStorage();
  renderHistory();
  showToast('💾 Saved week to history!', 'success');
}

function renderHistory() {
  if (!elements.savedHistoryContainer) return;
  if (appState.history.length === 0) {
    elements.savedHistoryContainer.innerHTML = '<p class="text-slate-400 italic py-2 text-center text-xs">No saved previous schedules yet.</p>';
    return;
  }

  elements.savedHistoryContainer.innerHTML = '';
  appState.history.forEach((hist) => {
    const weekDate = new Date(hist.weekStart).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const item = document.createElement('div');
    item.className = 'flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100 transition';
    
    const walksSummary = hist.walks.map(w => `${w.day.slice(0, 3)} ${formatTimeTo12Hour(w.time)}`).join(', ');

    item.innerHTML = `
      <div>
        <div class="flex items-center gap-2">
          <span class="font-bold text-slate-800 text-xs">${escapeHtml(hist.dogName)} • Week of ${escapeHtml(weekDate)}</span>
          <span class="text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">${escapeHtml(hist.currency)}${escapeHtml(hist.totalCost)}</span>
        </div>
        <p class="text-[11px] text-slate-500 truncate max-w-xs mt-0.5">${escapeHtml(walksSummary)} (${escapeHtml(hist.walkerName)})</p>
      </div>
      <button class="delete-history-btn text-slate-400 hover:text-rose-500 p-1 text-xs" data-id="${escapeHtml(hist.id)}" title="Remove">
        <i class="fa-solid fa-trash-can"></i>
      </button>
    `;

    item.querySelector('.delete-history-btn')?.addEventListener('click', () => {
      appState.history = appState.history.filter(h => h.id !== hist.id);
      saveToLocalStorage();
      renderHistory();
      showToast('Removed from history', 'info');
    });

    elements.savedHistoryContainer.appendChild(item);
  });
}

// =========================================================================
// PHOTO MONTAGE STUDIO ENGINE (CANVAS RENDERING)
// =========================================================================

function renderMontageStudio() {
  elements.montageDogSelect.innerHTML = '';
  appState.dogs.forEach(d => {
    const opt = document.createElement('option');
    opt.value = d.id;
    opt.textContent = `${d.name} (${d.breed})`;
    if (d.id === appState.montage.taggedDogId) opt.selected = true;
    elements.montageDogSelect.appendChild(opt);
  });

  elements.montageWalkerSelect.innerHTML = '';
  appState.contacts.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = `${c.name} (@${c.instagramHandle.replace(/^@/, '')})`;
    if (c.id === appState.montage.taggedWalkerId) opt.selected = true;
    elements.montageWalkerSelect.appendChild(opt);
  });

  elements.montageTitleInput.value = appState.montage.title;
  elements.montageSubtitleInput.value = appState.montage.subtitle;
  elements.montageDateInput.value = appState.montage.date;
  elements.montageThemeSelect.value = appState.montage.theme;

  renderPhotoThumbnails();
  renderMontageCanvas();
}

function renderPhotoThumbnails() {
  const container = elements.photoThumbnailsGrid;
  const count = appState.montage.photos.length;
  elements.photoCountBadge.textContent = count;

  if (count === 0) {
    container.innerHTML = `
      <p class="col-span-3 text-center text-slate-400 text-xs italic py-4">
        No photos selected.<br>Click "Upload Walk Photos" or "Load Sample Photos".
      </p>
    `;
    return;
  }

  container.innerHTML = '';
  appState.montage.photos.forEach((photo, idx) => {
    const card = document.createElement('div');
    card.className = 'photo-thumb-card group';
    card.innerHTML = `
      <img src="${photo.dataUrl}" alt="Walk photo ${idx + 1}">
      <button class="remove-photo-btn absolute top-1 right-1 w-5 h-5 bg-rose-600 text-white rounded-full flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition shadow-sm" data-index="${idx}">
        <i class="fa-solid fa-xmark"></i>
      </button>
      <span class="absolute bottom-1 left-1 px-1.5 py-0.2 bg-black/60 text-white text-[9px] font-bold rounded">#${idx + 1}</span>
    `;

    card.querySelector('.remove-photo-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      appState.montage.photos.splice(idx, 1);
      renderPhotoThumbnails();
      renderMontageCanvas();
      saveToLocalStorage();
    });

    container.appendChild(card);
  });
}

async function renderMontageCanvas() {
  const canvas = elements.montageCanvas;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const style = appState.montage.style;
  const theme = appState.montage.theme;
  const dog = appState.dogs.find(d => d.id === appState.montage.taggedDogId) || getActiveDog();
  const walker = appState.contacts.find(c => c.id === appState.montage.taggedWalkerId) || getActiveContact();
  const title = elements.montageTitleInput.value.trim() || `${dog.name}'s Walk`;
  const subtitle = elements.montageSubtitleInput.value.trim() || `With ${walker.name}`;
  const dateStr = new Date(elements.montageDateInput.value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  if (style === 'story') {
    canvas.width = 1080;
    canvas.height = 1920;
  } else {
    canvas.width = 1200;
    canvas.height = 1200;
  }

  const loadedImages = await Promise.all(
    appState.montage.photos.map(p => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = p.dataUrl;
      });
    })
  );

  const validImages = loadedImages.filter(img => img !== null);

  if (validImages.length === 0) {
    drawPlaceholderMontage(ctx, canvas.width, canvas.height, dog, walker, title, subtitle, dateStr, theme);
    return;
  }

  if (style === 'grid') {
    drawGridMontage(ctx, canvas.width, canvas.height, validImages, dog, walker, title, subtitle, dateStr, theme);
  } else if (style === 'polaroid') {
    drawPolaroidMontage(ctx, canvas.width, canvas.height, validImages, dog, walker, title, subtitle, dateStr, theme);
  } else if (style === 'story') {
    drawStoryMontage(ctx, canvas.width, canvas.height, validImages, dog, walker, title, subtitle, dateStr, theme);
  }
}

function getThemeColors(theme) {
  switch (theme) {
    case 'emerald-nature':
      return { bg1: '#064e3b', bg2: '#022c22', accent: '#10b981', text: '#ffffff', cardBg: '#0f766e' };
    case 'insta-sunset':
      return { bg1: '#833ab4', bg2: '#fd1d1d', accent: '#fcb045', text: '#ffffff', cardBg: '#2d1537' };
    case 'polaroid-white':
      return { bg1: '#f8fafc', bg2: '#e2e8f0', accent: '#f97316', text: '#1e293b', cardBg: '#ffffff' };
    case 'midnight-dark':
      return { bg1: '#0f172a', bg2: '#020617', accent: '#f59e0b', text: '#ffffff', cardBg: '#1e293b' };
    case 'warm-orange':
    default:
      return { bg1: '#ffedd5', bg2: '#fed7aa', accent: '#ea580c', text: '#431407', cardBg: '#ffffff' };
  }
}

function drawPlaceholderMontage(ctx, w, h, dog, walker, title, subtitle, dateStr, theme) {
  const colors = getThemeColors(theme);
  
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, colors.bg1);
  grad.addColorStop(1, colors.bg2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = colors.accent;
  ctx.lineWidth = 12;
  ctx.strokeRect(30, 30, w - 60, h - 60);

  ctx.fillStyle = colors.accent;
  ctx.font = 'bold 90px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('🐾', w / 2, h / 2 - 80);

  ctx.fillStyle = colors.text;
  ctx.font = 'bold 54px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(title, w / 2, h / 2 + 10);

  ctx.font = '32px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(subtitle, w / 2, h / 2 + 70);

  ctx.font = 'bold 26px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(`Dog: ${dog.name} • Walker: ${walker.name} • ${dateStr}`, w / 2, h / 2 + 130);

  ctx.font = 'italic 24px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.fillText('Click "Upload Walk Photos" to populate this montage!', w / 2, h - 80);
}

function drawGridMontage(ctx, w, h, images, dog, walker, title, subtitle, dateStr, theme) {
  const colors = getThemeColors(theme);
  
  ctx.fillStyle = colors.bg1;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = '#ffffff';
  roundRect(ctx, 40, 40, w - 80, 140, 24, true, false);
  
  ctx.fillStyle = '#0f172a';
  ctx.font = '800 38px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`🐾 ${title}`, 70, 95);

  ctx.fillStyle = '#64748b';
  ctx.font = '600 22px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(`${dog.name} & ${walker.name} • ${dateStr}`, 70, 140);

  const topY = 210;
  const bottomBarHeight = 110;
  const availH = h - topY - bottomBarHeight - 50;
  const availW = w - 80;

  const count = Math.min(images.length, 4);

  if (count === 1) {
    drawImageCover(ctx, images[0], 40, topY, availW, availH, 20);
  } else if (count === 2) {
    const halfW = (availW - 20) / 2;
    drawImageCover(ctx, images[0], 40, topY, halfW, availH, 20);
    drawImageCover(ctx, images[1], 40 + halfW + 20, topY, halfW, availH, 20);
  } else if (count === 3) {
    const halfW = (availW - 20) / 2;
    const halfH = (availH - 20) / 2;
    drawImageCover(ctx, images[0], 40, topY, halfW, availH, 20);
    drawImageCover(ctx, images[1], 40 + halfW + 20, topY, halfH, halfW, 20);
    drawImageCover(ctx, images[2], 40 + halfW + 20, topY + halfH + 20, halfW, halfH, 20);
  } else {
    const halfW = (availW - 20) / 2;
    const halfH = (availH - 20) / 2;
    drawImageCover(ctx, images[0], 40, topY, halfW, halfH, 20);
    drawImageCover(ctx, images[1], 40 + halfW + 20, topY, halfH, halfW, 20);
    drawImageCover(ctx, images[2], 40, topY + halfH + 20, halfW, halfH, 20);
    drawImageCover(ctx, images[3], 40 + halfW + 20, topY + halfH + 20, halfW, halfH, 20);
  }

  ctx.fillStyle = '#ffffff';
  roundRect(ctx, 40, h - bottomBarHeight - 30, w - 80, bottomBarHeight, 20, true, false);

  ctx.fillStyle = colors.accent;
  ctx.font = '700 24px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`✨ "${subtitle}"`, 65, h - bottomBarHeight + 25);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#ec4899';
  ctx.font = '700 22px "Plus Jakarta Sans", sans-serif';
  const handle = walker.instagramHandle.startsWith('@') ? walker.instagramHandle : `@${walker.instagramHandle}`;
  ctx.fillText(`📷 ${handle}`, w - 70, h - bottomBarHeight + 25);
}

function drawPolaroidMontage(ctx, w, h, images, dog, walker, title, subtitle, dateStr, theme) {
  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = '#334155';
  ctx.font = 'bold 44px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`🐾 ${title} 🐾`, w / 2, 75);

  ctx.font = '22px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.fillText(`${dog.name}'s Walk with ${walker.name} • ${dateStr}`, w / 2, 115);

  const polaroids = [
    { x: 320, y: 400, rot: -0.08, caption: 'Best walk ever! 🎾' },
    { x: 880, y: 420, rot: 0.07, caption: 'Muddy paws 🐶' },
    { x: 340, y: 880, rot: 0.05, caption: 'Sniffing around 🌸' },
    { x: 860, y: 890, rot: -0.06, caption: 'Tired puppy nap 💤' }
  ];

  const frameW = 460;
  const frameH = 500;
  const imgSize = 410;
  const count = Math.min(images.length, 4);

  for (let i = 0; i < count; i++) {
    const p = polaroids[i];
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);

    ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 10;
    ctx.fillStyle = '#ffffff';
    roundRect(ctx, -frameW / 2, -frameH / 2, frameW, frameH, 8, true, false);

    ctx.shadowColor = 'transparent';
    drawImageCover(ctx, images[i], -frameW / 2 + 25, -frameH / 2 + 25, imgSize, imgSize, 4);

    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 36px "Caveat", cursive, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(p.caption, 0, frameH / 2 - 20);

    ctx.restore();
  }

  ctx.fillStyle = '#f97316';
  ctx.font = 'bold 24px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`✨ ${subtitle} ✨`, w / 2, h - 30);
}

function drawStoryMontage(ctx, w, h, images, dog, walker, title, subtitle, dateStr, theme) {
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#0f172a');
  grad.addColorStop(0.5, '#1e293b');
  grad.addColorStop(1, '#0f172a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`🐶 ${dog.name}'s Walk Diary`, 60, 100);

  ctx.fillStyle = '#fb923c';
  ctx.font = '600 24px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(`with @${walker.instagramHandle.replace(/^@/, '')} • ${dateStr}`, 60, 140);

  const mainPhotoH = 880;
  drawImageCover(ctx, images[0], 50, 180, w - 100, mainPhotoH, 30);

  if (images.length > 1) {
    const subW = (w - 120) / 2;
    const subH = 460;
    const subY = 180 + mainPhotoH + 30;

    drawImageCover(ctx, images[1], 50, subY, subW, subH, 24);

    if (images.length > 2) {
      drawImageCover(ctx, images[2], 50 + subW + 20, subY, subW, subH, 24);
    } else {
      ctx.fillStyle = '#1e293b';
      roundRect(ctx, 50 + subW + 20, subY, subW, subH, 24, true, false);

      ctx.fillStyle = '#f97316';
      ctx.font = 'bold 44px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🐾 100%', 50 + subW + 20 + subW / 2, subY + 160);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 26px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('Happy Pup', 50 + subW + 20 + subW / 2, subY + 220);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '20px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('Safe & sound!', 50 + subW + 20 + subW / 2, subY + 265);
    }
  }

  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  roundRect(ctx, 50, h - 220, w - 100, 160, 24, true, false);

  ctx.fillStyle = '#0f172a';
  ctx.font = '800 36px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(title, 85, h - 145);

  ctx.fillStyle = '#64748b';
  ctx.font = '600 24px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(subtitle, 85, h - 95);
}

function roundRect(ctx, x, y, width, height, radius, fill, stroke) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

function drawImageCover(ctx, img, x, y, w, h, radius = 0) {
  ctx.save();
  if (radius > 0) {
    roundRect(ctx, x, y, w, h, radius, false, false);
    ctx.clip();
  }

  const imgRatio = img.width / img.height;
  const targetRatio = w / h;
  let sourceWidth, sourceHeight, sourceX, sourceY;

  if (imgRatio > targetRatio) {
    sourceHeight = img.height;
    sourceWidth = img.height * targetRatio;
    sourceX = (img.width - sourceWidth) / 2;
    sourceY = 0;
  } else {
    sourceWidth = img.width;
    sourceHeight = img.width / targetRatio;
    sourceX = 0;
    sourceY = (img.height - sourceHeight) / 2;
  }

  ctx.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight, x, y, w, h);
  ctx.restore();
}

function handlePhotoUpload(e) {
  const files = Array.from(e.target.files);
  if (!files.length) return;

  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = (event) => {
      appState.montage.photos.push({
        id: `photo-${Date.now()}-${Math.random()}`,
        dataUrl: event.target.result,
        name: file.name
      });
      renderPhotoThumbnails();
      renderMontageCanvas();
      saveToLocalStorage();
    };
    reader.readAsDataURL(file);
  });

  showToast(`📸 Added ${files.length} walk photo${files.length > 1 ? 's' : ''}!`, 'success');
}

function loadSampleMontagePhotos() {
  const sampleCanvases = [
    { title: '🎾 Fetch at the Park', color1: '#fbbf24', color2: '#d97706', emoji: '🐕' },
    { title: '🌊 Splashing River Walk', color1: '#38bdf8', color2: '#0284c7', emoji: '🐶' },
    { title: '🌲 Woodland Trails', color1: '#4ade80', color2: '#15803d', emoji: '🦮' },
    { title: '💤 Post-Walk Snooze', color1: '#c084fc', color2: '#7e22ce', emoji: '🐾' }
  ];

  appState.montage.photos = sampleCanvases.map((s, idx) => {
    const c = document.createElement('canvas');
    c.width = 600;
    c.height = 600;
    const ctx = c.getContext('2d');

    const grad = ctx.createLinearGradient(0, 0, 600, 600);
    grad.addColorStop(0, s.color1);
    grad.addColorStop(1, s.color2);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 600, 600);

    ctx.fillStyle = '#ffffff';
    ctx.font = '120px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(s.emoji, 300, 280);

    ctx.font = 'bold 36px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(s.title, 300, 400);

    return {
      id: `sample-${idx}`,
      dataUrl: c.toDataURL('image/png'),
      name: s.title
    };
  });

  renderPhotoThumbnails();
  renderMontageCanvas();
  saveToLocalStorage();
  showToast('🐾 Loaded 4 sample dog walk action shots!', 'success');
}

async function shareMontageNative() {
  const canvas = elements.montageCanvas;
  const dog = appState.dogs.find(d => d.id === appState.montage.taggedDogId) || getActiveDog();
  const walker = appState.contacts.find(c => c.id === appState.montage.taggedWalkerId) || getActiveContact();

  canvas.toBlob(async (blob) => {
    if (!blob) return;
    const file = new File([blob], `${dog.name}_walk_montage.png`, { type: 'image/png' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: `${dog.name}'s Dog Walk Montage`,
          text: `Check out ${dog.name}'s walk with ${walker.name}! 🐾`
        });
        showToast('Shared successfully!', 'success');
      } catch (err) {
        if (err.name !== 'AbortError') {
          downloadMontageImage();
        }
      }
    } else {
      downloadMontageImage();
      showToast('Downloaded montage image! Opening WhatsApp/Instagram...', 'info');
    }
  }, 'image/png');
}

function shareMontageWhatsApp() {
  const walker = appState.contacts.find(c => c.id === appState.montage.taggedWalkerId) || getActiveContact();
  const dog = appState.dogs.find(d => d.id === appState.montage.taggedDogId) || getActiveDog();
  const rawPhone = walker.whatsAppNumber.replace(/[^0-9]/g, '');
  
  downloadMontageImage();
  const text = `Hi ${walker.name}! Here is the photo montage from ${dog.name}'s walk! 🐾📸`;
  const url = `https://wa.me/${rawPhone}?text=${encodeURIComponent(text)}`;
  
  setTimeout(() => {
    window.open(url, '_blank');
  }, 400);

  showToast(`Saved montage & opening WhatsApp chat with ${escapeHtml(walker.name)}!`, 'success');
}

function shareMontageInstagram() {
  const walker = appState.contacts.find(c => c.id === appState.montage.taggedWalkerId) || getActiveContact();
  const handle = walker.instagramHandle.replace(/^@/, '');
  
  downloadMontageImage();
  const caption = `${elements.montageTitleInput.value} with @${handle}! 🐾 #DogWalking #DogWalk`;
  
  navigator.clipboard.writeText(caption).then(() => {
    showToast(`📋 Copied caption & downloaded montage! Opening Instagram @${escapeHtml(handle)}...`, 'success');
    setTimeout(() => {
      window.open(`https://ig.me/m/${handle}`, '_blank');
    }, 400);
  }).catch(() => {
    window.open(`https://ig.me/m/${handle}`, '_blank');
  });
}

function downloadMontageImage() {
  const canvas = elements.montageCanvas;
  const dog = appState.dogs.find(d => d.id === appState.montage.taggedDogId) || getActiveDog();
  const link = document.createElement('a');
  link.download = `${dog.name.toLowerCase()}_walk_montage_${Date.now()}.png`;
  link.href = canvas.toDataURL('image/png');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// =========================================================================
// CONTACTS, DOGS & USER MANAGEMENT (RBAC)
// =========================================================================

function renderProfilesList() {
  const isAdmin = appState.currentUser && appState.currentUser.role === 'admin';

  // 1. Render Dogs List
  elements.dogsListContainer.innerHTML = '';
  appState.dogs.forEach(dog => {
    const isActive = dog.id === appState.activeDogId;
    const card = document.createElement('div');
    card.className = `p-3.5 rounded-xl border flex flex-col gap-2 ${
      isActive ? 'border-orange-400 bg-orange-50/40 shadow-xs' : 'border-slate-200 bg-slate-50/60'
    }`;

    let compatBadge = '';
    if (dog.walkPreference === 'solo') {
      compatBadge = '<span class="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.2 rounded-full">⛔ Solo Only</span>';
    } else if (dog.incompatibleDogs && dog.incompatibleDogs.trim()) {
      compatBadge = `<span class="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.2 rounded-full">⚠️ No: ${escapeHtml(dog.incompatibleDogs)}</span>`;
    } else {
      compatBadge = '<span class="text-[10px] font-semibold text-blue-700 bg-blue-100 px-2 py-0.2 rounded-full">🐾 Group Friendly</span>';
    }

    card.innerHTML = `
      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-white border-2 border-orange-200 flex items-center justify-center text-orange-600 font-bold text-sm shadow-2xs">
            🐾
          </div>
          <div>
            <div class="flex items-center gap-2">
              <span class="font-bold text-slate-900 text-sm">${escapeHtml(dog.name)}</span>
              ${isActive ? '<span class="text-[10px] font-extrabold bg-orange-500 text-white px-2 py-0.2 rounded-full">ACTIVE</span>' : ''}
              ${compatBadge}
            </div>
            <p class="text-xs text-slate-500">${escapeHtml(dog.breed || 'Breed')} • ${escapeHtml(dog.age || '')}</p>
          </div>
        </div>

        <div class="flex items-center gap-1.5">
          ${!isActive ? `
            <button class="set-active-dog-btn px-2.5 py-1 text-xs font-semibold text-orange-600 hover:bg-orange-100 rounded-lg transition" data-id="${escapeHtml(dog.id)}">
              Select
            </button>
          ` : ''}
          ${isAdmin ? `
            <button class="edit-dog-btn p-1.5 text-slate-400 hover:text-slate-800 rounded-lg" data-id="${escapeHtml(dog.id)}" title="Edit Dog">
              <i class="fa-solid fa-pen text-xs"></i>
            </button>
            ${appState.dogs.length > 1 ? `
              <button class="delete-dog-btn p-1.5 text-slate-400 hover:text-rose-600 rounded-lg" data-id="${escapeHtml(dog.id)}" title="Delete Dog">
                <i class="fa-solid fa-trash text-xs"></i>
              </button>
            ` : ''}
          ` : ''}
        </div>
      </div>

      ${dog.incompatibleDogs ? `
        <div class="text-[11px] text-rose-700 bg-rose-50 border border-rose-100 rounded-lg px-2.5 py-1 flex items-center gap-1.5">
          <i class="fa-solid fa-ban text-[10px]"></i>
          <span><strong>Does NOT walk with:</strong> ${escapeHtml(dog.incompatibleDogs)}</span>
        </div>
      ` : ''}
    `;

    card.querySelector('.set-active-dog-btn')?.addEventListener('click', () => {
      appState.activeDogId = dog.id;
      appState.montage.taggedDogId = dog.id;
      saveToLocalStorage();
      renderAll();
      showToast(`Selected ${escapeHtml(dog.name)} as active dog!`, 'info');
    });

    card.querySelector('.edit-dog-btn')?.addEventListener('click', () => openDogModal(dog));
    card.querySelector('.delete-dog-btn')?.addEventListener('click', () => {
      if (confirm(`Remove ${dog.name}?`)) {
        appState.dogs = appState.dogs.filter(d => d.id !== dog.id);
        if (appState.activeDogId === dog.id) appState.activeDogId = appState.dogs[0].id;
        saveToLocalStorage();
        renderAll();
      }
    });

    elements.dogsListContainer.appendChild(card);
  });

  // 2. Render Walker Contacts List
  elements.contactsListContainer.innerHTML = '';
  appState.contacts.forEach(contact => {
    const isActive = contact.id === appState.activeContactId;
    const card = document.createElement('div');
    card.className = `p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
      isActive ? 'border-orange-400 bg-orange-50/40 shadow-xs' : 'border-slate-200 bg-slate-50/60'
    }`;

    card.innerHTML = `
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-full bg-white border-2 border-orange-200 flex items-center justify-center text-orange-600 font-bold text-sm shadow-2xs">
          ${escapeHtml(contact.name ? contact.name[0].toUpperCase() : 'W')}
        </div>
        <div>
          <div class="flex items-center gap-2">
            <span class="font-bold text-slate-900 text-sm">${escapeHtml(contact.name)}</span>
            <span class="text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">${escapeHtml(contact.currency)}${Number(contact.ratePerWalk).toFixed(2)}/walk</span>
            ${isActive ? '<span class="text-[10px] font-extrabold bg-orange-500 text-white px-2 py-0.2 rounded-full">ACTIVE</span>' : ''}
          </div>
          <p class="text-xs text-slate-500">
            <span class="text-pink-600 font-medium"><i class="fa-brands fa-instagram"></i> @${escapeHtml(contact.instagramHandle.replace(/^@/, ''))}</span> • 
            <span class="text-emerald-600 font-medium"><i class="fa-brands fa-whatsapp"></i> ${escapeHtml(contact.whatsAppNumber)}</span>
          </p>
        </div>
      </div>

      <div class="flex items-center gap-1.5">
        ${!isActive ? `
          <button class="set-active-contact-btn px-2.5 py-1 text-xs font-semibold text-orange-600 hover:bg-orange-100 rounded-lg transition" data-id="${escapeHtml(contact.id)}">
            Select
          </button>
        ` : ''}
        ${isAdmin ? `
          <button class="edit-contact-btn p-1.5 text-slate-400 hover:text-slate-800 rounded-lg" data-id="${escapeHtml(contact.id)}" title="Edit Contact">
            <i class="fa-solid fa-pen text-xs"></i>
          </button>
          ${appState.contacts.length > 1 ? `
            <button class="delete-contact-btn p-1.5 text-slate-400 hover:text-rose-600 rounded-lg" data-id="${escapeHtml(contact.id)}" title="Delete Contact">
              <i class="fa-solid fa-trash text-xs"></i>
            </button>
          ` : ''}
        ` : ''}
      </div>
    `;

    card.querySelector('.set-active-contact-btn')?.addEventListener('click', () => {
      appState.activeContactId = contact.id;
      appState.montage.taggedWalkerId = contact.id;
      saveToLocalStorage();
      renderAll();
      showToast(`Selected ${escapeHtml(contact.name)} as active walker!`, 'info');
    });

    card.querySelector('.edit-contact-btn')?.addEventListener('click', () => openContactModal(contact));
    card.querySelector('.delete-contact-btn')?.addEventListener('click', () => {
      if (confirm(`Remove ${contact.name}?`)) {
        appState.contacts = appState.contacts.filter(c => c.id !== contact.id);
        if (appState.activeContactId === contact.id) appState.activeContactId = appState.contacts[0].id;
        saveToLocalStorage();
        renderAll();
      }
    });

    elements.contactsListContainer.appendChild(card);
  });

  // 3. Render User Accounts List (RBAC)
  elements.usersListContainer.innerHTML = '';
  appState.users.forEach(u => {
    const isSelf = appState.currentUser && appState.currentUser.id === u.id;
    const isUserAdmin = u.role === 'admin';
    const card = document.createElement('div');
    card.className = `p-3 rounded-xl border flex items-center justify-between gap-3 ${
      isSelf ? 'border-purple-300 bg-purple-50/40' : 'border-slate-200 bg-slate-50/60'
    }`;

    card.innerHTML = `
      <div class="flex items-center gap-2.5">
        <div class="w-8 h-8 rounded-full ${isUserAdmin ? 'bg-purple-600 text-white' : 'bg-emerald-600 text-white'} flex items-center justify-center font-bold text-xs shadow-2xs">
          ${escapeHtml(u.fullName ? u.fullName[0].toUpperCase() : 'U')}
        </div>
        <div>
          <div class="flex items-center gap-1.5">
            <span class="font-bold text-slate-900 text-xs">${escapeHtml(u.fullName)}</span>
            <span class="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded ${
              isUserAdmin ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-700'
            }">${escapeHtml(u.role)}</span>
          </div>
          <p class="text-[11px] text-slate-400 font-mono">@${escapeHtml(u.username)}</p>
        </div>
      </div>

      <div class="flex items-center gap-1">
        ${isAdmin && !isSelf && appState.users.length > 1 ? `
          <button class="delete-user-btn p-1.5 text-slate-400 hover:text-rose-600 rounded-lg text-xs" data-id="${escapeHtml(u.id)}" title="Delete User">
            <i class="fa-solid fa-trash"></i>
          </button>
        ` : ''}
        ${isSelf ? '<span class="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">YOU</span>' : ''}
      </div>
    `;

    card.querySelector('.delete-user-btn')?.addEventListener('click', () => {
      if (confirm(`Remove account for @${u.username}?`)) {
        appState.users = appState.users.filter(usr => usr.id !== u.id);
        saveToLocalStorage();
        renderProfilesList();
        showToast(`Deleted user @${escapeHtml(u.username)}`, 'info');
      }
    });

    elements.usersListContainer.appendChild(card);
  });
}

// Dog Modal
function openDogModal(dog = null) {
  if (dog) {
    elements.dogModalTitle.textContent = 'Edit Dog Profile & Compatibility';
    elements.dogEditId.value = dog.id;
    elements.dogNameInput.value = dog.name;
    elements.dogBreedInput.value = dog.breed || '';
    elements.dogAgeInput.value = dog.age || '';
    elements.dogWalkPreferenceInput.value = dog.walkPreference || 'group';
    elements.dogIncompatibleInput.value = dog.incompatibleDogs || '';
    elements.dogFriendsInput.value = dog.favoriteFriends || '';
    elements.dogNotesInput.value = dog.notes || '';
  } else {
    elements.dogModalTitle.textContent = 'Add Dog Profile & Compatibility';
    elements.dogEditId.value = '';
    elements.dogNameInput.value = '';
    elements.dogBreedInput.value = '';
    elements.dogAgeInput.value = '';
    elements.dogWalkPreferenceInput.value = 'group';
    elements.dogIncompatibleInput.value = '';
    elements.dogFriendsInput.value = '';
    elements.dogNotesInput.value = '';
  }
  elements.dogModal.classList.remove('hidden');
}

function saveDogModal() {
  const name = elements.dogNameInput.value.trim();
  if (!name) {
    showToast('Please enter a dog name.', 'warning');
    return;
  }

  const editId = elements.dogEditId.value;
  if (editId) {
    const existing = appState.dogs.find(d => d.id === editId);
    if (existing) {
      existing.name = name;
      existing.breed = elements.dogBreedInput.value.trim();
      existing.age = elements.dogAgeInput.value.trim();
      existing.walkPreference = elements.dogWalkPreferenceInput.value;
      existing.incompatibleDogs = elements.dogIncompatibleInput.value.trim();
      existing.favoriteFriends = elements.dogFriendsInput.value.trim();
      existing.notes = elements.dogNotesInput.value.trim();
    }
  } else {
    const newDog = {
      id: `dog-${Date.now()}`,
      name: name,
      breed: elements.dogBreedInput.value.trim(),
      age: elements.dogAgeInput.value.trim(),
      walkPreference: elements.dogWalkPreferenceInput.value,
      incompatibleDogs: elements.dogIncompatibleInput.value.trim(),
      favoriteFriends: elements.dogFriendsInput.value.trim(),
      notes: elements.dogNotesInput.value.trim()
    };
    appState.dogs.push(newDog);
    appState.activeDogId = newDog.id;
  }

  elements.dogModal.classList.add('hidden');
  saveToLocalStorage();
  renderAll();
  showToast('Dog profile & safety rules saved!', 'success');
}

// Contact Modal
function openContactModal(contact = null) {
  if (contact) {
    elements.contactModalTitle.textContent = 'Edit Walker Contact';
    elements.contactEditId.value = contact.id;
    elements.contactNameInput.value = contact.name;
    elements.contactInstagramInput.value = contact.instagramHandle;
    elements.contactWhatsAppInput.value = contact.whatsAppNumber;
    elements.contactCurrencyInput.value = contact.currency || '£';
    elements.contactRateInput.value = contact.ratePerWalk;
    elements.contactNotesInput.value = contact.notes || '';
  } else {
    elements.contactModalTitle.textContent = 'Add Walker Contact';
    elements.contactEditId.value = '';
    elements.contactNameInput.value = '';
    elements.contactInstagramInput.value = '';
    elements.contactWhatsAppInput.value = '+44';
    elements.contactCurrencyInput.value = '£';
    elements.contactRateInput.value = '15.00';
    elements.contactNotesInput.value = '';
  }
  elements.contactModal.classList.remove('hidden');
}

function saveContactModal() {
  const name = elements.contactNameInput.value.trim();
  if (!name) {
    showToast('Please enter a walker name.', 'warning');
    return;
  }

  const editId = elements.contactEditId.value;
  if (editId) {
    const existing = appState.contacts.find(c => c.id === editId);
    if (existing) {
      existing.name = name;
      existing.instagramHandle = elements.contactInstagramInput.value.trim();
      existing.whatsAppNumber = elements.contactWhatsAppInput.value.trim();
      existing.currency = elements.contactCurrencyInput.value;
      existing.ratePerWalk = parseFloat(elements.contactRateInput.value) || 15.00;
      existing.notes = elements.contactNotesInput.value.trim();
    }
  } else {
    const newContact = {
      id: `contact-${Date.now()}`,
      name: name,
      instagramHandle: elements.contactInstagramInput.value.trim(),
      whatsAppNumber: elements.contactWhatsAppInput.value.trim(),
      currency: elements.contactCurrencyInput.value,
      ratePerWalk: parseFloat(elements.contactRateInput.value) || 15.00,
      notes: elements.contactNotesInput.value.trim()
    };
    appState.contacts.push(newContact);
    appState.activeContactId = newContact.id;
  }

  elements.contactModal.classList.add('hidden');
  saveToLocalStorage();
  renderAll();
  showToast('Walker contact saved!', 'success');
}

function openSwitchModal() {
  elements.modalActiveDogSelect.innerHTML = '';
  appState.dogs.forEach(d => {
    const opt = document.createElement('option');
    opt.value = d.id;
    opt.textContent = `${d.name} (${d.breed || 'Dog'})`;
    if (d.id === appState.activeDogId) opt.selected = true;
    elements.modalActiveDogSelect.appendChild(opt);
  });

  elements.modalActiveWalkerSelect.innerHTML = '';
  appState.contacts.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = `${c.name} (@${c.instagramHandle.replace(/^@/, '')})`;
    if (c.id === appState.activeContactId) opt.selected = true;
    elements.modalActiveWalkerSelect.appendChild(opt);
  });

  elements.switchContextModal.classList.remove('hidden');
}

// --- EVENT LISTENERS ---
function attachEventListeners() {
  // Auth Listeners
  elements.loginForm?.addEventListener('submit', handleLoginSubmit);
  elements.logoutBtn?.addEventListener('click', handleLogout);
  elements.headerLogoBtn?.addEventListener('click', () => switchTab('tab-menu'));

  // Menu Hub Action Tile Listeners
  document.querySelectorAll('.menu-action-card[data-target-tab]').forEach(card => {
    card.addEventListener('click', () => {
      const target = card.getAttribute('data-target-tab');
      if (target) switchTab(target);
    });
  });

  elements.menuAddDogTile?.addEventListener('click', () => {
    const isAdmin = appState.currentUser && appState.currentUser.role === 'admin';
    if (isAdmin) {
      openDogModal(null);
    } else {
      switchTab('tab-contacts');
    }
  });

  elements.menuAddContactTile?.addEventListener('click', () => {
    const isAdmin = appState.currentUser && appState.currentUser.role === 'admin';
    if (isAdmin) {
      openContactModal(null);
    } else {
      switchTab('tab-contacts');
    }
  });

  elements.menuGoToPaperTile?.addEventListener('click', () => openPaperPrintModal('today'));
  elements.todayPrintBtn?.addEventListener('click', () => openPaperPrintModal('today'));
  elements.quickPaperPrintBtn?.addEventListener('click', () => openPaperPrintModal('today'));
  elements.schedulePaperPrintBtn?.addEventListener('click', () => openPaperPrintModal('week'));

  elements.menuExportExcelTile?.addEventListener('click', exportAllToExcelCsv);
  elements.quickExcelExportBtn?.addEventListener('click', exportAllToExcelCsv);
  elements.scheduleExcelExportBtn?.addEventListener('click', exportAllToExcelCsv);

  // Paper Print Modal Listeners
  elements.closePaperPrintModalBtn?.addEventListener('click', () => elements.paperPrintModal.classList.add('hidden'));
  elements.cancelPaperPrintModalBtn?.addEventListener('click', () => elements.paperPrintModal.classList.add('hidden'));
  
  elements.printScopeTodayBtn?.addEventListener('click', () => openPaperPrintModal('today'));
  elements.printScopeWeekBtn?.addEventListener('click', () => openPaperPrintModal('week'));
  
  elements.triggerWindowPrintBtn?.addEventListener('click', () => {
    window.print();
  });

  // Admin Registration Modal Listeners (Only accessible once Admin is logged in)
  elements.openAddUserModalBtn?.addEventListener('click', () => {
    if (!appState.currentUser || appState.currentUser.role !== 'admin') {
      showToast('⛔ Only Administrators can register new accounts.', 'warning');
      return;
    }
    elements.adminRegisterUserModal.classList.remove('hidden');
  });

  elements.closeAdminUserModalBtn?.addEventListener('click', () => {
    elements.adminRegisterUserModal.classList.add('hidden');
  });

  elements.cancelAdminUserModalBtn?.addEventListener('click', () => {
    elements.adminRegisterUserModal.classList.add('hidden');
  });

  elements.adminRegisterForm?.addEventListener('submit', handleAdminRegisterSubmit);

  // Navigation Tabs
  elements.navTabs.forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.getAttribute('data-tab')));
  });

  elements.mobileNavTabs.forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.getAttribute('data-tab')));
  });

  if (elements.pwaInstallBtn) {
    elements.pwaInstallBtn.addEventListener('click', async () => {
      if (deferredPwaPrompt) {
        deferredPwaPrompt.prompt();
        const { outcome } = await deferredPwaPrompt.userChoice;
        if (outcome === 'accepted') {
          showToast('🎉 Dog Walking App installed to Home Screen!', 'success');
        }
        deferredPwaPrompt = null;
      } else {
        showToast('To install: On iOS tap "Share ➔ Add to Home Screen". On Android tap "Install App".', 'info');
      }
    });
  }

  elements.switchWalkerOrDogBtn?.addEventListener('click', openSwitchModal);
  elements.closeSwitchModalBtn?.addEventListener('click', () => elements.switchContextModal.classList.add('hidden'));
  elements.confirmSwitchBtn?.addEventListener('click', () => {
    appState.activeDogId = elements.modalActiveDogSelect.value;
    appState.activeContactId = elements.modalActiveWalkerSelect.value;
    appState.montage.taggedDogId = appState.activeDogId;
    appState.montage.taggedWalkerId = appState.activeContactId;
    elements.switchContextModal.classList.add('hidden');
    saveToLocalStorage();
    renderAll();
    showToast('Active Dog & Walker updated!', 'success');
  });

  elements.parseScheduleBtn?.addEventListener('click', () => parseScheduleText(elements.rawScheduleInput.value));
  elements.clearInputBtn?.addEventListener('click', () => {
    elements.rawScheduleInput.value = '';
    elements.rawScheduleInput.focus();
  });

  elements.loadSampleBtn?.addEventListener('click', () => {
    const sampleText = `Let me know if these times work for you next week?\n\nMonday 7.30 am with Bella\nTuesday 7 am with Milo\nWednesday 8.30 am (solo)\nThursday 7 am with Daisy\nFriday 8.30am with Bella`;
    elements.rawScheduleInput.value = sampleText;
    parseScheduleText(sampleText);
  });

  elements.loadSampleConflictBtn?.addEventListener('click', () => {
    const sampleConflictText = `Hi! Here are the proposed walk slots for next week:\n\nMonday 7.30 am with Bella\nTuesday 7 am with Buster\nWednesday 8.30 am with Bruno\nThursday 7 am (solo)\nFriday 8.30am with Bella`;
    elements.rawScheduleInput.value = sampleConflictText;
    parseScheduleText(sampleConflictText);
    showToast('⚠️ Tested schedule containing incompatible dogs (Buster & Bruno)!', 'warning');
  });

  elements.targetWeekSelect?.addEventListener('change', (e) => {
    appState.targetWeek = e.target.value;
    if (e.target.value === 'custom') {
      elements.customDateContainer.classList.remove('hidden');
      if (!elements.customStartDate.value) {
        const nextMon = getTargetMondayDate();
        elements.customStartDate.value = nextMon.toISOString().slice(0, 10);
        appState.customMonday = elements.customStartDate.value;
      }
    } else {
      elements.customDateContainer.classList.add('hidden');
    }
    initializeWeekDays();
    if (elements.rawScheduleInput.value.trim()) {
      parseScheduleText(elements.rawScheduleInput.value);
    } else {
      renderSchedule();
      renderMenuHub();
    }
  });

  elements.customStartDate?.addEventListener('change', (e) => {
    appState.customMonday = e.target.value;
    initializeWeekDays();
    if (elements.rawScheduleInput.value.trim()) {
      parseScheduleText(elements.rawScheduleInput.value);
    } else {
      renderSchedule();
      renderMenuHub();
    }
  });

  elements.walkDurationSelect?.addEventListener('change', (e) => {
    appState.walkDuration = parseInt(e.target.value, 10);
    appState.days.forEach(d => {
      if (d.hasWalk) d.duration = appState.walkDuration;
    });
    renderSchedule();
    renderMenuHub();
  });

  elements.walkerNotesInput?.addEventListener('input', () => updateReplyPreview(checkAnyConflicts()));
  elements.replyWhatsAppBtn?.addEventListener('click', handleWhatsAppReply);
  elements.replyInstagramBtn?.addEventListener('click', handleInstagramReply);
  elements.copyMessageBtn?.addEventListener('click', () => {
    navigator.clipboard.writeText(elements.replyMessagePreview.value).then(() => {
      showToast('📋 Copied confirmation text to clipboard!', 'success');
    });
  });

  elements.downloadIcsBtn?.addEventListener('click', downloadIcsFile);
  elements.syncGoogleBtn?.addEventListener('click', openGoogleCalendarModal);
  elements.closeGoogleModalBtn?.addEventListener('click', () => elements.googleEventsModal.classList.add('hidden'));
  elements.openAllGoogleEventsBtn?.addEventListener('click', openAllGoogleEventsInTabs);

  elements.markAllConfirmedBtn?.addEventListener('click', () => {
    appState.days.forEach(d => {
      if (d.dayIndex < 5) {
        d.hasWalk = true;
        d.status = 'confirmed';
        d.walkStatus = 'scheduled';
      }
    });
    renderSchedule();
    renderMenuHub();
    showToast('Scheduled Monday to Friday walks!', 'info');
  });

  elements.addNewWalkSlotBtn?.addEventListener('click', () => {
    const emptyDay = appState.days.find(d => !d.hasWalk);
    if (emptyDay) {
      emptyDay.hasWalk = true;
      emptyDay.status = 'confirmed';
      emptyDay.walkStatus = 'scheduled';
      renderSchedule();
      renderMenuHub();
    } else {
      showToast('All days currently have walks scheduled!', 'info');
    }
  });

  elements.resetScheduleBtn?.addEventListener('click', () => {
    if (confirm('Reset the current week schedule?')) {
      initializeWeekDays();
      renderSchedule();
      renderMenuHub();
      showToast('Schedule reset.', 'info');
    }
  });

  elements.saveCurrentScheduleBtn?.addEventListener('click', saveCurrentScheduleToHistory);

  // Montage Listeners
  elements.montagePhotoUpload?.addEventListener('change', handlePhotoUpload);
  elements.loadSamplePhotosBtn?.addEventListener('click', loadSampleMontagePhotos);
  elements.refreshCanvasBtn?.addEventListener('click', renderMontageCanvas);

  elements.montageStyleBtns?.forEach(btn => {
    btn.addEventListener('click', () => {
      elements.montageStyleBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      appState.montage.style = btn.getAttribute('data-style');
      renderMontageCanvas();
      saveToLocalStorage();
    });
  });

  elements.montageDogSelect?.addEventListener('change', (e) => {
    appState.montage.taggedDogId = e.target.value;
    renderMontageCanvas();
    saveToLocalStorage();
  });

  elements.montageWalkerSelect?.addEventListener('change', (e) => {
    appState.montage.taggedWalkerId = e.target.value;
    renderMontageCanvas();
    renderHeaderAndRibbon();
    saveToLocalStorage();
  });

  elements.montageTitleInput?.addEventListener('input', renderMontageCanvas);
  elements.montageSubtitleInput?.addEventListener('input', renderMontageCanvas);
  elements.montageDateInput?.addEventListener('change', renderMontageCanvas);
  elements.montageThemeSelect?.addEventListener('change', (e) => {
    appState.montage.theme = e.target.value;
    renderMontageCanvas();
    saveToLocalStorage();
  });

  elements.nativeShareBtn?.addEventListener('click', shareMontageNative);
  elements.montageWhatsAppBtn?.addEventListener('click', shareMontageWhatsApp);
  elements.montageInstagramBtn?.addEventListener('click', shareMontageInstagram);
  elements.downloadMontageImgBtn?.addEventListener('click', downloadMontageImage);

  // Video Demonstration Modal triggers & Desktop/Mobile Switcher
  const videoModal = document.getElementById('videoDemoModal');
  const demoPlayer = document.getElementById('demoVideoPlayer');
  const videoTabDesktopBtn = document.getElementById('videoTabDesktopBtn');
  const videoTabMobileBtn = document.getElementById('videoTabMobileBtn');
  const videoModeBadge = document.getElementById('videoModeBadge');
  const downloadVideoMp4Link = document.getElementById('downloadVideoMp4Link');
  const downloadVideoWebmLink = document.getElementById('downloadVideoWebmLink');
  const videoSourceWebm = document.getElementById('videoSourceWebm');
  const videoSourceMp4 = document.getElementById('videoSourceMp4');
  
  function switchVideoMode(mode) {
    if (!demoPlayer) return;
    demoPlayer.pause();
    
    if (mode === 'mobile') {
      videoTabMobileBtn?.classList.add('bg-orange-500', 'text-white');
      videoTabMobileBtn?.classList.remove('bg-slate-800', 'text-slate-300');
      videoTabDesktopBtn?.classList.remove('bg-orange-500', 'text-white');
      videoTabDesktopBtn?.classList.add('bg-slate-800', 'text-slate-300');
      
      if (videoModeBadge) videoModeBadge.textContent = '📱 Mobile App Mode (iPhone/Android Touch View)';
      if (videoSourceWebm) videoSourceWebm.src = 'dog_walker_mobile_demo.webm';
      if (videoSourceMp4) videoSourceMp4.src = 'dog_walker_mobile_demo.mp4';
      if (downloadVideoMp4Link) {
        downloadVideoMp4Link.href = 'dog_walker_mobile_demo.mp4';
        downloadVideoMp4Link.download = 'dog_walker_mobile_demo.mp4';
      }
      if (downloadVideoWebmLink) {
        downloadVideoWebmLink.href = 'dog_walker_mobile_demo.webm';
        downloadVideoWebmLink.download = 'dog_walker_mobile_demo.webm';
      }
    } else {
      videoTabDesktopBtn?.classList.add('bg-orange-500', 'text-white');
      videoTabDesktopBtn?.classList.remove('bg-slate-800', 'text-slate-300');
      videoTabMobileBtn?.classList.remove('bg-orange-500', 'text-white');
      videoTabMobileBtn?.classList.add('bg-slate-800', 'text-slate-300');
      
      if (videoModeBadge) videoModeBadge.textContent = '🎬 Desktop View (1280x720 30FPS HD)';
      if (videoSourceWebm) videoSourceWebm.src = 'dog_walker_app_demo.webm';
      if (videoSourceMp4) videoSourceMp4.src = 'dog_walker_app_demo.mp4';
      if (downloadVideoMp4Link) {
        downloadVideoMp4Link.href = 'dog_walker_app_demo.mp4';
        downloadVideoMp4Link.download = 'dog_walker_app_demo.mp4';
      }
      if (downloadVideoWebmLink) {
        downloadVideoWebmLink.href = 'dog_walker_app_demo.webm';
        downloadVideoWebmLink.download = 'dog_walker_app_demo.webm';
      }
    }

    demoPlayer.load();
    demoPlayer.play().catch(() => {});
  }

  videoTabDesktopBtn?.addEventListener('click', () => switchVideoMode('desktop'));
  videoTabMobileBtn?.addEventListener('click', () => switchVideoMode('mobile'));

  document.getElementById('openVideoDemoBtn')?.addEventListener('click', () => {
    if (videoModal) {
      videoModal.classList.remove('hidden');
      switchVideoMode('desktop');
    }
  });

  document.getElementById('closeVideoDemoModalBtn')?.addEventListener('click', () => {
    if (videoModal) {
      videoModal.classList.add('hidden');
      if (demoPlayer) demoPlayer.pause();
    }
  });

  // Dog & Contact Modal triggers
  elements.openAddDogModalBtn?.addEventListener('click', () => openDogModal(null));
  elements.closeDogModalBtn?.addEventListener('click', () => elements.dogModal.classList.add('hidden'));
  elements.cancelDogModalBtn?.addEventListener('click', () => elements.dogModal.classList.add('hidden'));
  elements.saveDogBtn?.addEventListener('click', saveDogModal);

  elements.openAddContactModalBtn?.addEventListener('click', () => openContactModal(null));
  elements.closeContactModalBtn?.addEventListener('click', () => elements.contactModal.classList.add('hidden'));
  elements.cancelContactModalBtn?.addEventListener('click', () => elements.contactModal.classList.add('hidden'));
  elements.saveContactBtn?.addEventListener('click', saveContactModal);
}

function checkAnyConflicts() {
  const dog = getActiveDog();
  return appState.days.some(d => checkSlotConflict(d, dog).hasConflict);
}

// --- UTILITY FORMATTERS ---
function formatTimeTo12Hour(time24) {
  if (!time24) return '7:30 AM';
  const [hStr, mStr] = time24.split(':');
  let hours = parseInt(hStr, 10);
  const minutes = mStr || '00';
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${hours}:${minutes} ${ampm}`;
}

function formatIcsDate(date) {
  const pad = (n) => String(n).padStart(2, '0');
  const year = date.getUTCFullYear();
  const month = pad(date.getUTCMonth() + 1);
  const day = pad(date.getUTCDate());
  const hours = pad(date.getUTCHours());
  const minutes = pad(date.getUTCMinutes());
  const seconds = pad(date.getUTCSeconds());
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

function formatGcalDate(date) {
  const pad = (n) => String(n).padStart(2, '0');
  const year = date.getUTCFullYear();
  const month = pad(date.getUTCMonth() + 1);
  const day = pad(date.getUTCDate());
  const hours = pad(date.getUTCHours());
  const minutes = pad(date.getUTCMinutes());
  const seconds = pad(date.getUTCSeconds());
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  const bgColors = {
    success: 'bg-emerald-800 border-emerald-600 text-white',
    warning: 'bg-amber-800 border-amber-600 text-white',
    info: 'bg-slate-800 border-slate-700 text-white'
  };

  const icons = {
    success: 'fa-circle-check text-emerald-400',
    warning: 'fa-triangle-exclamation text-amber-400',
    info: 'fa-circle-info text-blue-400'
  };

  toast.className = `toast-enter pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-lg text-xs font-semibold ${bgColors[type] || bgColors.info}`;
  toast.innerHTML = `
    <i class="fa-solid ${icons[type] || icons.info} text-sm"></i>
    <span>${escapeHtml(message)}</span>
  `;

  elements.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.remove('toast-enter');
    toast.classList.add('toast-exit');
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 250);
  }, 3500);
}
