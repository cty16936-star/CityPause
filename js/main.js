const $ = id => document.getElementById(id);
const t = (key, values) => window.t(key, values);
const cityDisplayName = city => document.documentElement.lang === 'zh'
  ? city.name
  : city.name_en || city.geo_name || city.name;
let CITIES = [];
const WORLD  = window.WORLD_CITIES || [];

const PROGRESS_KEY = 'city_mirror_progress_v4';
const LOG_KEY = 'city_mirror_log';

const SUPABASE_URL  = "https://YOUR-PROJECT.supabase.co";
const SUPABASE_ANON = "YOUR-ANON-KEY";

let progress = (() => {
  try { return JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}'); }
  catch { return {}; }
})();
function saveProgress() { localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress)); }

let state = { city: null, visited: {}, reactions: {} };
let activeStoryNode = null;
let mapState = { scale: 1, offsetX: 0, offsetY: 0, dragging: false, lastX: 0, lastY: 0 };

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  $(id).classList.add('active');
}

/* ============ 出生地 ============ */
const CONTINENT_ORDER = ['ASIA','EUROPE','AFRICA','NORTH_AMERICA','SOUTH_AMERICA','OCEANIA'];
const CONTINENT_CN = { ASIA:'亚洲', EUROPE:'欧洲', AFRICA:'非洲', NORTH_AMERICA:'北美洲', SOUTH_AMERICA:'南美洲', OCEANIA:'大洋洲' };

function renderBirthPicker(preserveSearch = false) {
  const list = $('birth-list'), search = $('birth-search');
  const currentSearch = preserveSearch ? search.value : '';
  search.value = currentSearch;

  function draw(kw = '') {
    list.innerHTML = '';
    const k = kw.toLowerCase().trim();
    const matches = CITIES.filter(c => {
      if (!k) return true;
      const wc = WORLD.find(w => w.name === c.geo_name);
      return cityDisplayName(c).toLowerCase().includes(k)
          || c.name.toLowerCase().includes(k)
          || (c.geo_name || '').toLowerCase().includes(k)
          || (wc && wc.country.toLowerCase().includes(k));
    });
    if (!matches.length) {
      const empty = document.createElement('p');
      empty.className = 'hint';
      empty.textContent = t('no_match');
      list.replaceChildren(empty);
      return;
    }

    const groups = Object.create(null);
    matches.forEach(c => {
      const wc = WORLD.find(w => w.name === c.geo_name);
      const cont = wc ? wc.continent : 'OTHER';
      (groups[cont] = groups[cont] || []).push({ city: c, wc });
    });
    CONTINENT_ORDER.forEach(cont => {
      const items = groups[cont];
      if (!items) return;
      const lbl = document.createElement('div');
      lbl.className = 'birth-group-label';
      lbl.textContent = t(`continent_${cont}`) || CONTINENT_CN[cont] || cont;
      list.appendChild(lbl);
      items.forEach(({ city, wc }) => {
        const card = document.createElement('button');
        card.className = 'birth-card';
        card.type = 'button';
        const name = document.createElement('div');
        name.className = 'b-name';
        name.textContent = cityDisplayName(city);
        const country = document.createElement('span');
        country.className = 'b-country';
        country.textContent = wc ? wc.country : city.country;
        name.appendChild(country);
        const description = document.createElement('div');
        description.className = 'b-desc';
        description.textContent = wc ? wc.desc : cityDisplayName(city);
        card.append(name, description);
        card.onclick = () => chooseBirth(city, wc);
        list.appendChild(card);
      });
    });
  }
  search.oninput = () => draw(search.value);
  draw(currentSearch);
  showScreen('screen-birth');
}

function chooseBirth(city, wc) {
  progress.home = city.city_id;
  progress.completed = [];
  progress.unlocked = [city.city_id];
  if (wc) progress.unlocked.push(wc.id);
  saveProgress();
  unlockNextStoryCities(city);
  myPresence.home = wc ? wc.id : city.city_id;
  trackPresence({});
  renderMap();
}

/* ============ 解锁（核心修复） ============ */
function haversine(a, b, c, d) {
  const R = 6371, t = x => x * Math.PI / 180;
  const dLat = t(c - a), dLng = t(d - b);
  const h = Math.sin(dLat/2)**2 + Math.cos(t(a)) * Math.cos(t(c)) * Math.sin(dLng/2)**2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function findWC(geoName) {
  if (!geoName) return null;
  return WORLD.find(w => w.name === geoName)
      || WORLD.find(w => w.name.toLowerCase() === geoName.toLowerCase());
}

function unlockNextStoryCities(currentCity) {
  const currentWC = findWC(currentCity.geo_name);
  if (!currentWC) return;

  const completed = new Set(progress.completed || []);
  const unlocked = new Set(progress.unlocked || []);
  unlocked.add(currentCity.city_id);
  unlocked.add(currentWC.id);

  // 策略 1：最近 2 个未解锁城市
  const near = CITIES
    .filter(c => !completed.has(c.city_id) && !unlocked.has(c.city_id))
    .map(c => {
      const wc = findWC(c.geo_name);
      if (!wc) return null;
      return {
        cityId: c.city_id,
        worldId: wc.id,
        dist: haversine(currentWC.lat, currentWC.lng, wc.lat, wc.lng),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 2);

  // 策略 2：同洲再补 1 个（鼓励洲内探索）
  const sameContinent = CITIES
    .filter(c => {
      if (completed.has(c.city_id) || unlocked.has(c.city_id)) return false;
      if (near.some(n => n.cityId === c.city_id)) return false;
      const wc = findWC(c.geo_name);
      return wc && wc.continent === currentWC.continent;
    })
    .map(c => {
      const wc = findWC(c.geo_name);
      return {
        cityId: c.city_id,
        worldId: wc.id,
        dist: haversine(currentWC.lat, currentWC.lng, wc.lat, wc.lng),
      };
    })
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 1);

  [...near, ...sameContinent].forEach(u => {
    unlocked.add(u.cityId);
    unlocked.add(u.worldId);
  });
  progress.unlocked = [...unlocked];
  saveProgress();
  console.log('🔓 解锁:', [...near, ...sameContinent].map(u => u.cityId).join('、') || '（无）');
}

/* ============ 地图 ============ */
function project(lat, lng, w, h) { return { x: ((lng + 180) / 360) * w, y: ((90 - lat) / 180) * h }; }
function storyByGeo(name) { return CITIES.find(c => c.geo_name === name); }
function isHome(wc) { const s = storyByGeo(wc.name); return s && progress.home === s.city_id; }
function isCompleted(wc) { const s = storyByGeo(wc.name); return s && (progress.completed || []).includes(s.city_id); }
function isUnlocked(wc) { return (progress.unlocked || []).includes(wc.id); }

function renderMap() {
  const vp = $('map-viewport'), canvas = $('map-canvas');
  showScreen('screen-map');
  const mapArt = canvas.querySelector('.map-art');
  const cw = vp.clientWidth * 2, ch = vp.clientHeight * 2;
  canvas.style.width = cw + 'px'; canvas.style.height = ch + 'px';
  const frag = document.createDocumentFragment();

  // 1. 所有有剧本的城市（20 个）— 始终可见
  CITIES.forEach(sc => {
    const wc = findWC(sc.geo_name);
    if (!wc) return;
    const { x, y } = project(wc.lat, wc.lng, cw, ch);
    const dot = document.createElement('button');
    dot.className = 'city-dot playable';
    dot.type = 'button';
    dot.setAttribute('aria-label', cityDisplayName(sc));
    dot.style.left = x + 'px'; dot.style.top = y + 'px';

    if (isHome(wc)) dot.classList.add('home');
    else if (isCompleted(wc)) dot.classList.add('completed');
    else if (isUnlocked(wc)) dot.classList.add('unlocked');
    else dot.classList.add('locked-story');

    const lbl = document.createElement('span');
    lbl.className = 'dot-label'; lbl.textContent = cityDisplayName(sc);
    dot.appendChild(lbl);
    dot.onclick = e => { e.stopPropagation(); onCityClick(wc); };
    frag.appendChild(dot);
  });

  // 2. 背景城市（装饰用）
  WORLD.filter(w => w.pop >= 3000000 && !CITIES.some(sc => sc.geo_name === w.name))
    .forEach(wc => {
      const { x, y } = project(wc.lat, wc.lng, cw, ch);
      const dot = document.createElement('div');
      dot.className = 'city-dot background';
      dot.style.left = x + 'px'; dot.style.top = y + 'px';
      frag.appendChild(dot);
    });

  canvas.replaceChildren(...(mapArt ? [mapArt, frag] : [frag]));
  updateStatsPanel();
  $('map-info').textContent = t('zoom_label', { level: mapState.scale });
  applyMapTransform();
}

function applyMapTransform() {
  const vp = $('map-viewport'), canvas = $('map-canvas');
  const cw = parseFloat(canvas.style.width), ch = parseFloat(canvas.style.height);
  const bx = (vp.clientWidth - cw * mapState.scale) / 2;
  const by = (vp.clientHeight - ch * mapState.scale) / 2;
  canvas.style.transform = `translate(${bx + mapState.offsetX}px, ${by + mapState.offsetY}px) scale(${mapState.scale})`;
}

function onCityClick(wc) {
  const sc = storyByGeo(wc.name);
  if (!sc) { $('map-info').textContent = `${wc.name} · ${t('prepping_hint')}`; return; }
  if (!isUnlocked(wc) && !isHome(wc)) {
    $('map-info').textContent = `${cityDisplayName(sc)} · ${t('locked_hint')}`;
    return;
  }
  startCity(sc);
}

function updateStatsPanel() {
  const wcs = (progress.unlocked || []).map(id => WORLD.find(w => w.id === id)).filter(Boolean);
  const continents = new Set(wcs.map(w => w.continent).filter(Boolean));
  const countries = new Set(wcs.map(w => w.sovereign_cc || w.cc).filter(Boolean));
  const cities = new Set(wcs.map(w => w.id));
  const meta = window.WORLD_META || { totalCities: WORLD.length, totalCountries: 193, totalContinents: 6 };
  $('stat-continents').textContent = `${continents.size} / ${meta.totalContinents}`;
  $('stat-countries').textContent = `${countries.size} / ${meta.totalCountries}`;
  $('stat-cities').textContent = `${cities.size} / ${meta.totalCities}`;
}

/* ============ 出发 + 探索 ============ */
function startCity(city) {
  state = { city, visited: {}, reactions: {} };
  const wc = findWC(city.geo_name);
  trackPresence({ current: wc ? wc.id : city.city_id });
  $('scene-city').textContent = cityDisplayName(city);
  $('scene-tags').textContent = (city.rhythm_tags || []).join('  ·  ');
  $('travel-text').textContent = `${t('travel_prefix')} ${cityDisplayName(city)}…`;
  showScreen('screen-travel');
  setTimeout(() => renderExplore(), 2000);
}

function renderExplore() {
  const spots = $('hotspots');
  spots.innerHTML = '';
  state.city.story_nodes.forEach(n => {
    const btn = document.createElement('button');
    btn.className = 'hotspot';
    btn.type = 'button';
    btn.setAttribute('aria-label', `${t('explore_aria')}: ${n.title}`);
    if (state.visited[n.node_id]) {
      btn.classList.add('visited');
      btn.disabled = true;
    }
    btn.style.left = n.scene_pos[0] + '%';
    btn.style.top = n.scene_pos[1] + '%';
    btn.onclick = () => openStory(n);
    spots.appendChild(btn);
  });
  const total = state.city.story_nodes.length;
  const done = Object.keys(state.visited).length;
  $('explore-progress').textContent = t('explore_progress', { done, total });
  showScreen('screen-explore');
}

/* ============ 故事节点 ============ */
function updateStoryLanguageNotice() {
  const card = document.querySelector('.story-card');
  const existing = card.querySelector('.lang-notice');
  if (existing) existing.remove();

  if (document.documentElement.lang !== 'zh') {
    const notice = document.createElement('p');
    notice.className = 'lang-notice';
    notice.textContent = t('content_lang_notice');
    card.insertBefore(notice, card.querySelector('#story-body, #story-reaction-followup'));
  }
}

function openStory(node) {
  const card = document.querySelector('.story-card');
  if (!card) {
    console.error('找不到 .story-card 容器');
    return;
  }

  activeStoryNode = node;
  card.innerHTML = `
    <button id="btn-close-story" class="close-btn" type="button" aria-label="关闭故事">×</button>
    <h2 id="story-title"></h2>
    <p id="story-body"></p>
    <p id="story-source" class="story-source"></p>
    <p id="story-reaction-question" class="story-question"></p>
    <div id="story-reaction-options" class="emotion-row"></div>
  `;

  card.querySelector('#btn-close-story').onclick = () => showScreen('screen-explore');
  card.querySelector('#story-title').textContent = node.title;
  card.querySelector('#story-body').textContent = node.body;
  card.querySelector('#story-source').textContent = node.source_note
    ? `${t('source_prefix')}${node.source_note}`
    : '';
  card.querySelector('#story-reaction-question').textContent = t('story_question') || '此刻你会…';
  updateStoryLanguageNotice();
  const row = card.querySelector('.emotion-row');
  const opts = node.reaction_options && node.reaction_options.length
    ? node.reaction_options
    : [{ id: 'ok', label: t('continue_explore') || '继续', followup: '' }];

  opts.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'emo-btn';
    btn.textContent = opt.label;
    btn.onclick = () => {
      state.reactions[node.node_id] = opt;
      if (opt.followup) showNodeFollowup(node, opt);
      else completeNode(node);
    };
    row.appendChild(btn);
  });
  showScreen('screen-story');
}

function showNodeFollowup(node, opt) {
  const card = document.querySelector('.story-card');
  if (!card) return;

  card.innerHTML = `
    <button id="btn-close-story" class="close-btn" type="button" aria-label="关闭故事">×</button>
    <h2 id="story-title"></h2>
    <p id="story-source" class="story-source"></p>
    <p id="story-reaction-followup" class="node-followup"></p>
    <div class="emotion-row">
      <button class="emo-btn" id="node-back" type="button"></button>
    </div>
  `;

  card.querySelector('#btn-close-story').onclick = () => showScreen('screen-explore');
  card.querySelector('#story-title').textContent = node.title;
  card.querySelector('#story-source').textContent = node.source_note
    ? `${t('source_prefix')}${node.source_note}`
    : '';
  card.querySelector('#story-reaction-followup').textContent = opt.followup;
  card.querySelector('#node-back').textContent = t('continue_explore') || '继续探索';
  card.querySelector('#node-back').onclick = () => completeNode(node);
  updateStoryLanguageNotice();
}

function completeNode(node) {
  if (state.visited[node.node_id]) return;
  state.visited[node.node_id] = true;
  if (Object.keys(state.visited).length >= state.city.story_nodes.length) {
    completeCity();
  } else {
    renderExplore();
  }
}

/* ============ 完成城市（核心修复） ============ */
function completeCity() {
  const city = state.city;
  const entry = {
    city_id: city.city_id, city_name: cityDisplayName(city),
    date: new Date().toISOString(),
    reactions: state.reactions
  };
  const log = JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
  log.push(entry);
  localStorage.setItem(LOG_KEY, JSON.stringify(log));

  if (!(progress.completed || []).includes(city.city_id)) {
    progress.completed = [...(progress.completed || []), city.city_id];
  }
  unlockNextStoryCities(city);
  saveProgress();
  trackPresence({ current: null });

  $('end-note').textContent = city.session_end_note || t('session_end_default');
  resetLeaveButton();
  showScreen('screen-end');
}

/* ============ 长按离开 ============ */
const HOLD_MS = 3000;
let holdRAF = null, holdStart = 0, holdActive = false;
function resetLeaveButton() {
  document.querySelector('.leave-fill').style.width = '0%';
  document.querySelector('.leave-label').textContent = t('leave_hold');
  holdActive = false;
  if (holdRAF) cancelAnimationFrame(holdRAF);
}
function setupLeaveButton() {
  const btn = $('btn-leave'), fill = document.querySelector('.leave-fill'), lbl = document.querySelector('.leave-label');
  function begin(e) {
    if (holdActive) return;
    e.preventDefault(); holdActive = true; holdStart = performance.now();
    function tick(ts) {
      if (!holdActive) return;
      const pct = Math.min(100, ((ts - holdStart) / HOLD_MS) * 100);
      fill.style.width = pct + '%';
      if (pct >= 100) { holdActive = false; lbl.textContent = t('leave_done'); setTimeout(() => { resetLeaveButton(); renderMap(); }, 600); return; }
      holdRAF = requestAnimationFrame(tick);
    }
    holdRAF = requestAnimationFrame(tick);
  }
  function end(e) { if (e) e.preventDefault(); if (!holdActive) return; holdActive = false; if (holdRAF) cancelAnimationFrame(holdRAF); fill.style.width = '0%'; }
  btn.onpointerdown = begin; btn.onpointerup = end; btn.onpointerleave = end; btn.onpointercancel = end;
  btn.onkeydown = e => { if ((e.code === 'Space' || e.code === 'Enter') && !e.repeat) begin(e); };
  btn.onkeyup = e => { if (e.code === 'Space' || e.code === 'Enter') end(e); };
}

/* ============ 地图拖拽 / 缩放 ============ */
function setupMapDrag() {
  const vp = $('map-viewport');
  vp.addEventListener('pointerdown', e => {
    if (e.target.closest('.city-dot')) return;
    mapState.dragging = true;
    mapState.lastX = e.clientX;
    mapState.lastY = e.clientY;
    vp.setPointerCapture(e.pointerId);
  });
  vp.addEventListener('pointermove', e => {
    if (!mapState.dragging) return;
    mapState.offsetX += e.clientX - mapState.lastX;
    mapState.offsetY += e.clientY - mapState.lastY;
    mapState.lastX = e.clientX; mapState.lastY = e.clientY;
    applyMapTransform();
  });
  const end = () => mapState.dragging = false;
  vp.addEventListener('pointerup', end);
  vp.addEventListener('pointercancel', end);
}
function setupMapZoom() {
  $('btn-zoom-in').onclick = () => { if (mapState.scale < 4) { mapState.scale++; applyMapTransform(); } };
  $('btn-zoom-out').onclick = () => { if (mapState.scale > 1) { mapState.scale--; applyMapTransform(); } };
  $('btn-reset').onclick = () => {
    if (!confirm(t('reset_confirm'))) return;
    localStorage.removeItem(PROGRESS_KEY);
    progress = {};
    mapState = { scale: 1, offsetX: 0, offsetY: 0, dragging: false, lastX: 0, lastY: 0 };
    myPresence.home = null;
    trackPresence({ current: null });
    renderBirthPicker();
  };
}

/* ============ 实时人数 ============ */
function getPlayerId() {
  let id = localStorage.getItem('city_mirror_pid');
  if (!id) { id = 'p_' + Math.random().toString(36).slice(2, 10); localStorage.setItem('city_mirror_pid', id); }
  return id;
}
const PLAYER_ID = getPlayerId();
let presenceChannel = null, presenceState = {}, myPresence = { home: null, current: null };

function startPresence() {
  if (!window.supabase || SUPABASE_URL.includes('YOUR-PROJECT')) return;
  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
  presenceChannel = client.channel('lobby', { config: { presence: { key: PLAYER_ID } } });
  presenceChannel
    .on('presence', { event: 'sync' }, () => { presenceState = presenceChannel.presenceState(); computePresence(); })
    .subscribe(async s => { if (s === 'SUBSCRIBED') await presenceChannel.track({ ...myPresence, ts: Date.now() }); });
}

async function trackPresence(patch) {
  myPresence = { ...myPresence, ...patch, ts: Date.now() };
  if (presenceChannel) await presenceChannel.track(myPresence);
  computePresence();
}

function computePresence() {
  const homeStory = progress.home ? CITIES.find(c => c.city_id === progress.home) : null;
  const homeWC = homeStory ? findWC(homeStory.geo_name) : null;
  const homeId = homeWC ? homeWC.id : null;
  const current = myPresence.current;
  const inHome = current && homeId && current === homeId;
  let othersSame = 0, othersHome = 0;
  for (const [pid, states] of Object.entries(presenceState)) {
    if (pid === PLAYER_ID) continue;
    const s = (states && states[0]) || {};
    if (current && s.current === current) othersSame++;
    if (homeId && s.current === homeId) othersHome++;
  }
  const sameCount = current ? othersSame + 1 : 0;
  const homeCount = homeId ? othersHome + (inHome ? 1 : 0) : 0;
  const currentWC = current ? WORLD.find(w => w.id === current) : null;
  const currentStory = currentWC ? storyByGeo(currentWC.name) : null;
  const cityName = currentStory ? cityDisplayName(currentStory) : currentWC?.name || '';
  $('presence-same-city').textContent = current
    ? t('presence_same_city', { n: sameCount, city: cityName })
    : t('presence_map');
  $('presence-home').textContent = homeId
    ? t('presence_home', { n: homeCount, city: cityDisplayName(homeStory) })
    : t('presence_home', { n: 0, city: '—' });
}

/* ============ 初始化 ============ */
setupLeaveButton();
setupMapDrag();
setupMapZoom();
$('btn-map').addEventListener('click', () => {
  trackPresence({ current: null });
  renderMap();
});
$('btn-close-story').addEventListener('click', () => showScreen('screen-explore'));
window.addEventListener('keydown', event => {
  if (event.key === 'Escape' && $('screen-story').classList.contains('active')) {
    showScreen('screen-explore');
  }
});
window.addEventListener('resize', () => {
  if ($('screen-map').classList.contains('active')) renderMap();
});
window.addEventListener('languagechange', () => {
  if ($('screen-birth').classList.contains('active')) renderBirthPicker(true);
  if ($('screen-map').classList.contains('active')) renderMap();
  if ($('screen-explore').classList.contains('active')) renderExplore();
  if (state.city) $('scene-city').textContent = cityDisplayName(state.city);
  if ($('screen-travel').classList.contains('active') && state.city) {
    $('travel-text').textContent = `${t('travel_prefix')} ${cityDisplayName(state.city)}…`;
  }
  if ($('screen-end').classList.contains('active') && state.city && !state.city.session_end_note) {
    $('end-note').textContent = t('session_end_default');
  }
  if ($('screen-story').classList.contains('active') && activeStoryNode) {
    updateStoryLanguageNotice();
    $('story-source').textContent = activeStoryNode.source_note
      ? `${t('source_prefix')}${activeStoryNode.source_note}`
      : '';
  }
  if (CITIES.length) computePresence();
});

window.CITIES_DATA_PROMISE.then(data => {
  if (!Array.isArray(data) || data.length === 0) throw new Error('City data must be a non-empty array.');
  if (!Array.isArray(WORLD) || WORLD.length === 0) throw new Error('World city data must be a non-empty array.');
  CITIES = data;
  startPresence();
  $('birth-status').textContent = '';
  $('map-status').textContent = '';
  if (!progress.home) {
    renderBirthPicker();
    return;
  }
  const homeCity = CITIES.find(city => city.city_id === progress.home);
  if (!homeCity) throw new Error(`Saved birthplace is not available: ${progress.home}`);
  const homeWorldCity = findWC(homeCity.geo_name);
  myPresence.home = homeWorldCity ? homeWorldCity.id : homeCity.city_id;
  renderMap();
  trackPresence({});
}).catch(error => {
  console.error('Unable to initialize City Mirror:', error);
  $('birth-status').textContent = t('load_error');
  $('map-status').textContent = t('load_error');
});