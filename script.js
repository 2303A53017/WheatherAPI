/* Redesigned Weather Dashboard script
   API key included as requested. If you want to change it later, edit API_KEY.
   NOTE: Do not share your API key publicly if it's sensitive.
*/
const API_KEY = 'a25d8792202a60e3899306d94f421172';
const BASE = 'https://api.openweathermap.org/data/2.5';

document.addEventListener('DOMContentLoaded', () => {
  const loadFixedBtn = document.getElementById('load-fixed');
  const searchBtn = document.getElementById('search-btn');
  const cityInput = document.getElementById('city-input');
  const unitsSelect = document.getElementById('units-select');
  const currentWeather = document.getElementById('current-weather');
  const forecastDiv = document.getElementById('forecast');
  const testBtn = document.getElementById('test-btn');
  const testOutput = document.getElementById('test-output');

  // Default: let Enter in input trigger search
  cityInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); searchBtn.click(); } });

  // Load fixed city (Version 1)
  loadFixedBtn.addEventListener('click', async () => {
    await showCityWeather('New Delhi', 'metric');
  });

  // Search (Version 2)
  searchBtn.addEventListener('click', async () => {
    const city = cityInput.value.trim();
    if (!city) {
      shake(cityInput);
      return;
    }
    const units = unitsSelect.value;
    await showCityWeather(city, units);
  });

  // Tests
  testBtn.addEventListener('click', () => {
    const out = runTests();
    testOutput.textContent = out;
    console.log(out);
  });

  // Quick helper: initial sample
  // showCityWeather('London', 'metric'); // uncomment to auto-load
});

/* --- Core flow: fetch and render --- */
async function showCityWeather(city, units='metric') {
  const currentWeather = document.getElementById('current-weather');
  const forecastDiv = document.getElementById('forecast');

  currentWeather.innerHTML = `<div class="stub">Loading ${city}...</div>`;
  forecastDiv.innerHTML = '';

  try {
    const [cw, fc] = await Promise.all([
      fetchCurrentWeather(city, units),
      fetchForecast(city, units)
    ]);
    renderCurrent(cw, units);
    const daily = aggregateToDaily(fc);
    renderForecast(daily, units);
  } catch (err) {
    currentWeather.innerHTML = `<div class="stub">Error: ${escapeHtml(err.message)}</div>`;
  }
}

/* --- API helpers --- */
async function fetchCurrentWeather(city, units='metric') {
  const url = `${BASE}/weather?q=${encodeURIComponent(city)}&units=${units}&appid=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(()=>({message:res.statusText}));
    throw new Error(body.message || `API error ${res.status}`);
  }
  return res.json();
}
async function fetchForecast(city, units='metric') {
  const url = `${BASE}/forecast?q=${encodeURIComponent(city)}&units=${units}&appid=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(()=>({message:res.statusText}));
    throw new Error(body.message || `API error ${res.status}`);
  }
  return res.json();
}

/* --- Renderers --- */
function renderCurrent(data, units='metric') {
  const currentWeather = document.getElementById('current-weather');
  const humi = document.getElementById('humi');
  const wind = document.getElementById('wind');
  const feels = document.getElementById('feels');

  const name = `${data.name}${data.sys?.country ? ', ' + data.sys.country : ''}`;
  const icon = data.weather?.[0]?.icon;
  const desc = capitalize(data.weather?.[0]?.description || '');
  const temp = Math.round(data.main?.temp);
  const unit = units === 'imperial' ? '°F' : '°C';

  currentWeather.innerHTML = `
    <img src="https://openweathermap.org/img/wn/${icon}@2x.png" alt="${desc}">
    <div class="current-info">
      <div class="city">${escapeHtml(name)}</div>
      <div class="temp">${temp}${unit}</div>
      <div class="desc">${escapeHtml(desc)}</div>
    </div>
  `;
  humi.textContent = data.main?.humidity + '%';
  wind.textContent = (data.wind?.speed ?? '—') + (units === 'imperial' ? ' mph' : ' m/s');
  feels.textContent = Math.round(data.main?.feels_like) + unit;
}

function renderForecast(days, units='metric') {
  const forecastDiv = document.getElementById('forecast');
  if (!days || days.length === 0) {
    forecastDiv.innerHTML = '<div class="forecast-item">No forecast available</div>';
    return;
  }
  forecastDiv.innerHTML = days.map(d => {
    const icon = d.icon ? `<img src="https://openweathermap.org/img/wn/${d.icon}.png" alt="">` : '';
    const t = Math.round(d.temp);
    const unit = units === 'imperial' ? '°F' : '°C';
    return `<div class="forecast-item">
      <div class="day">${formatDateShort(d.dateISO)}</div>
      ${icon}
      <div class="t">${t}${unit}</div>
      <div class="desc">${capitalize(d.desc)}</div>
    </div>`;
  }).join('');
}

/* --- Data processing --- */
function aggregateToDaily(forecastJson) {
  if (!forecastJson || !forecastJson.list) return [];
  const map = {};
  forecastJson.list.forEach(item => {
    const date = item.dt_txt.split(' ')[0];
    if (!map[date]) map[date] = [];
    map[date].push(item);
  });
  const days = Object.keys(map).map(date => {
    const items = map[date];
    let chosen = items.find(it => it.dt_txt.includes('12:00:00')) || items[Math.floor(items.length/2)];
    const temps = items.map(it => it.main.temp);
    const avg = temps.reduce((a,b)=>a+b,0) / temps.length;
    return {
      dateISO: date,
      temp: avg,
      min: Math.min(...temps),
      max: Math.max(...temps),
      icon: chosen.weather?.[0]?.icon,
      desc: chosen.weather?.[0]?.description
    };
  });
  return days.slice(0,5);
}

/* --- Utility functions --- */
function cToF(c){ return (c * 9/5) + 32; }
function fToC(f){ return (f - 32) * 5/9; }
function capitalize(s=''){ return String(s).split(' ').map(p=> p ? p[0].toUpperCase() + p.slice(1) : '').join(' '); }
function formatDateShort(iso){
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {weekday:'short', day:'numeric', month:'short'});
}
function escapeHtml(s=''){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function shake(el){
  el.classList.add('shake');
  setTimeout(()=>el.classList.remove('shake'), 600);
}

/* --- Tests --- */
function runTests(){
  const logs = [];
  logs.push(`cToF(0) => ${Math.round(cToF(0))} (expected 32)`);
  logs.push(`fToC(212) => ${Math.round(fToC(212))} (expected 100)`);

  const mock = { list: [
    { dt_txt:'2025-12-01 00:00:00', main:{temp:10}, weather:[{icon:'01d',description:'clear sky'}] },
    { dt_txt:'2025-12-01 12:00:00', main:{temp:14}, weather:[{icon:'02d',description:'few clouds'}] },
    { dt_txt:'2025-12-02 12:00:00', main:{temp:16}, weather:[{icon:'03d',description:'scattered clouds'}] }
  ]};
  const daily = aggregateToDaily(mock);
  logs.push(`aggregateToDaily -> ${daily.length} days (expected 2)`);
  return logs.join('\n');
}

/* expose tools for debugging */
if (typeof window !== 'undefined') {
  window.__clima = { cToF, fToC, aggregateToDaily, fetchCurrentWeather, fetchForecast, formatDateShort };
}
