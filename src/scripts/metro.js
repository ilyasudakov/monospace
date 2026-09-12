import L from 'leaflet';

const statusEl = document.getElementById('status');

const setStatus = (text, isError = false) => {
  statusEl.textContent = text;
  statusEl.classList.toggle('err', isError);
};

const map = L.map('map', { zoomControl: true, preferCanvas: true }).setView([59.93, 30.32], 11);

L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
  attribution:
    '© <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> · © <a href="https://carto.com/attributions">Carto</a> · данные: <a href="https://overpass-api.de/">Overpass</a>',
  subdomains: 'abcd',
  maxZoom: 19,
}).addTo(map);

const lineColors = {
  1: '#d6083b',
  2: '#0078be',
  3: '#009a49',
  4: '#ea7125',
  5: '#702082',
  6: '#c9a57a',
};

const query = `
  [out:json][timeout:90];
  rel["route"="subway"]["network"~"Петербургский метрополитен|Saint Petersburg",i];
  (._;>;);
  out body;
`;

async function loadMetro() {
  let data;
  try {
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    data = await response.json();
  } catch (error) {
    setStatus(`ошибка overpass: ${error.message}`, true);
    return;
  }

  const nodes = new Map();
  const ways = new Map();
  const relations = [];

  for (const element of data.elements) {
    if (element.type === 'node') nodes.set(element.id, element);
    else if (element.type === 'way') ways.set(element.id, element);
    else if (element.type === 'relation') relations.push(element);
  }

  const lines = new Map();
  for (const relation of relations) {
    const tags = relation.tags || {};
    const ref = tags.ref || tags.ref_colour || 'x';
    if (!lines.has(ref)) {
      lines.set(ref, {
        color: lineColors[ref] || '#1b1612',
        stations: new Map(),
        tracks: [],
      });
    }

    const line = lines.get(ref);
    for (const member of relation.members || []) {
      if (member.type === 'node') {
        const node = nodes.get(member.ref);
        if (!node?.tags) continue;
        const isStation =
          node.tags.railway === 'station' ||
          node.tags.railway === 'stop' ||
          node.tags.public_transport === 'stop_position' ||
          /stop/.test(member.role || '');
        if (!isStation || line.stations.has(node.id)) continue;
        line.stations.set(node.id, {
          id: node.id,
          name: node.tags.name || '',
          lat: node.lat,
          lon: node.lon,
        });
      } else if (member.type === 'way') {
        const way = ways.get(member.ref);
        if (!way?.nodes) continue;
        const coordinates = way.nodes.map((id) => nodes.get(id)).filter(Boolean).map((node) => [node.lat, node.lon]);
        if (coordinates.length > 1) line.tracks.push(coordinates);
      }
    }
  }

  if (lines.size === 0) {
    setStatus('пустой ответ от overpass', true);
    return;
  }

  const stations = [];
  const sortedRefs = [...lines.keys()].sort((a, b) => {
    const first = Number.parseInt(a, 10);
    const second = Number.parseInt(b, 10);
    if (Number.isNaN(first) && Number.isNaN(second)) return a.localeCompare(b);
    if (Number.isNaN(first)) return 1;
    if (Number.isNaN(second)) return -1;
    return first - second;
  });
  const bounds = L.latLngBounds();

  for (const ref of sortedRefs) {
    const line = lines.get(ref);
    for (const track of line.tracks) {
      L.polyline(track, {
        color: line.color,
        weight: 3.5,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);
      track.forEach((point) => bounds.extend(point));
    }
    for (const station of line.stations.values()) stations.push({ ...station, lineRef: ref });
  }

  const thresholdMeters = 250;
  const distance = (a, b) => {
    const dy = (a.lat - b.lat) * 111320;
    const dx = (a.lon - b.lon) * 111320 * Math.cos((a.lat * Math.PI) / 180);
    return Math.hypot(dx, dy);
  };
  const parents = stations.map((_, index) => index);
  const find = (index) => (parents[index] === index ? index : (parents[index] = find(parents[index])));

  for (let first = 0; first < stations.length; first += 1) {
    for (let second = first + 1; second < stations.length; second += 1) {
      if (distance(stations[first], stations[second]) < thresholdMeters) {
        parents[find(first)] = find(second);
      }
    }
  }

  const groups = new Map();
  stations.forEach((station, index) => {
    const root = find(index);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(station);
  });

  let transferCount = 0;
  for (const group of groups.values()) {
    const lat = group.reduce((sum, station) => sum + station.lat, 0) / group.length;
    const lon = group.reduce((sum, station) => sum + station.lon, 0) / group.length;
    const names = [...new Set(group.map((station) => station.name).filter(Boolean))];
    const lineRefs = [...new Set(group.map((station) => station.lineRef))];
    const isTransfer = lineRefs.length > 1;
    if (isTransfer) transferCount += 1;

    const ring = L.circleMarker([lat, lon], {
      radius: isTransfer ? 7 : 3.5,
      color: '#1b1612',
      weight: isTransfer ? 1.6 : 1.1,
      fillColor: '#ffffff',
      fillOpacity: 1,
    }).addTo(map);

    if (isTransfer) {
      L.circleMarker([lat, lon], {
        radius: 2.8,
        color: '#1b1612',
        weight: 0,
        fillColor: '#1b1612',
        fillOpacity: 1,
        interactive: false,
      }).addTo(map);
    }

    if (names.length) {
      ring.bindTooltip(names.join(' / '), {
        permanent: true,
        direction: 'right',
        offset: [isTransfer ? 10 : 6, 0],
        className: `st-label${isTransfer ? ' st-label--tr' : ''}`,
      });
    }
    bounds.extend([lat, lon]);
  }

  if (bounds.isValid()) map.fitBounds(bounds, { padding: [30, 30] });

  const syncLabels = () => {
    const show = map.getZoom() >= 12;
    document.querySelectorAll('.st-label').forEach((label) => {
      label.style.display = show ? '' : 'none';
    });
  };
  map.on('zoomend', syncLabels);
  syncLabels();

  setStatus(`${groups.size} станций (${transferCount} пересадок) · ${sortedRefs.length} линий · OSM/Overpass`);
}

loadMetro();
