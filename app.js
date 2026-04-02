// ── Helpers ──────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);

const WMO_CODES = {
  0:  { label: '快晴',       icon: '☀️' },
  1:  { label: 'ほぼ快晴',   icon: '🌤' },
  2:  { label: '一部曇り',   icon: '⛅' },
  3:  { label: '曇り',       icon: '☁️' },
  45: { label: '霧',         icon: '🌫' },
  48: { label: '霧氷',       icon: '🌫' },
  51: { label: '霧雨（弱）', icon: '🌦' },
  53: { label: '霧雨（中）', icon: '🌦' },
  55: { label: '霧雨（強）', icon: '🌧' },
  61: { label: '小雨',       icon: '🌧' },
  63: { label: '雨',         icon: '🌧' },
  65: { label: '大雨',       icon: '🌧' },
  71: { label: '小雪',       icon: '🌨' },
  73: { label: '雪',         icon: '❄️' },
  75: { label: '大雪',       icon: '❄️' },
  80: { label: 'にわか雨',   icon: '🌦' },
  81: { label: 'にわか雨（中）', icon: '🌦' },
  82: { label: 'にわか雨（強）', icon: '⛈' },
  95: { label: '雷雨',       icon: '⛈' },
  96: { label: '雷雨＋ひょう', icon: '⛈' },
  99: { label: '激しい雷雨', icon: '⛈' },
};

function wmoInfo(code) {
  return WMO_CODES[code] ?? { label: '不明', icon: '🌡' };
}

function pad(n) { return String(n).padStart(2, '0'); }

// ── Date header ───────────────────────────────────────────────────────
(function setDate() {
  const now = new Date();
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  $('currentDate').textContent =
    `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日（${days[now.getDay()]}）`;
})();

// ── Geocoding via Open-Meteo ──────────────────────────────────────────
async function geocode(city) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=ja&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('都市の検索に失敗しました');
  const data = await res.json();
  if (!data.results?.length) throw new Error(`「${city}」が見つかりませんでした`);
  return data.results[0]; // { name, latitude, longitude, country }
}

// ── Weather fetch via Open-Meteo ──────────────────────────────────────
async function fetchWeather(lat, lon) {
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    current: 'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,precipitation,visibility',
    hourly: 'temperature_2m,weather_code',
    daily: 'temperature_2m_max,temperature_2m_min',
    timezone: 'auto',
    forecast_days: 1,
  });
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!res.ok) throw new Error('天気データの取得に失敗しました');
  return res.json();
}

// ── Render ─────────────────────────────────────────────────────────────
function render(location, weather) {
  const c = weather.current;
  const info = wmoInfo(c.weather_code);

  $('cityName').textContent = `${location.name}、${location.country}`;
  $('weatherIcon').textContent = info.icon;
  $('weatherDesc').textContent = info.label;
  $('tempMain').textContent = `${Math.round(c.temperature_2m)}°`;
  $('tempMax').textContent = `${Math.round(weather.daily.temperature_2m_max[0])}°`;
  $('tempMin').textContent = `${Math.round(weather.daily.temperature_2m_min[0])}°`;
  $('humidity').textContent = `${c.relative_humidity_2m}%`;
  $('windSpeed').textContent = `${Math.round(c.wind_speed_10m)} km/h`;
  $('precipitation').textContent = `${c.precipitation} mm`;
  $('visibility').textContent = `${(c.visibility / 1000).toFixed(1)} km`;

  // Hourly
  const now = new Date();
  const currentHour = now.getHours();
  const hourlyContainer = $('hourlyList');
  hourlyContainer.innerHTML = '';

  weather.hourly.time.forEach((timeStr, i) => {
    const hour = new Date(timeStr).getHours();
    const isNow = hour === currentHour;
    const item = document.createElement('div');
    item.className = 'hourly-item' + (isNow ? ' now' : '');
    item.innerHTML = `
      <div class="hourly-time">${isNow ? '今' : pad(hour) + '時'}</div>
      <div class="hourly-icon">${wmoInfo(weather.hourly.weather_code[i]).icon}</div>
      <div class="hourly-temp">${Math.round(weather.hourly.temperature_2m[i])}°</div>
    `;
    hourlyContainer.appendChild(item);
  });

  // Scroll "now" into view
  const nowEl = hourlyContainer.querySelector('.now');
  if (nowEl) nowEl.scrollIntoView({ inline: 'center', behavior: 'smooth' });
}

// ── Load ───────────────────────────────────────────────────────────────
async function load(city) {
  $('loading').classList.remove('hidden');
  $('dashboard').classList.add('hidden');
  $('errorBox').classList.add('hidden');

  try {
    const location = await geocode(city);
    const weather = await fetchWeather(location.latitude, location.longitude);
    render(location, weather);
    $('dashboard').classList.remove('hidden');
  } catch (err) {
    $('errorMsg').textContent = err.message;
    $('errorBox').classList.remove('hidden');
  } finally {
    $('loading').classList.add('hidden');
  }
}

// ── Events ─────────────────────────────────────────────────────────────
$('searchBtn').addEventListener('click', () => {
  const city = $('cityInput').value.trim();
  if (city) load(city);
});

$('cityInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const city = $('cityInput').value.trim();
    if (city) load(city);
  }
});

// Initial load
load('Tokyo');
