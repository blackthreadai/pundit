const CONGRESS_URL = 'https://unitedstates.github.io/congress-legislators/legislators-current.json';

const STATE_CENTROIDS = {
  AL: [32.806671, -86.79113], AK: [61.370716, -152.404419], AZ: [33.729759, -111.431221],
  AR: [34.969704, -92.373123], CA: [36.116203, -119.681564], CO: [39.059811, -105.311104],
  CT: [41.597782, -72.755371], DE: [39.318523, -75.507141], FL: [27.766279, -81.686783],
  GA: [33.040619, -83.643074], HI: [21.094318, -157.498337], ID: [44.240459, -114.478828],
  IL: [40.349457, -88.986137], IN: [39.849426, -86.258278], IA: [42.011539, -93.210526],
  KS: [38.5266, -96.726486], KY: [37.66814, -84.670067], LA: [31.169546, -91.867805],
  ME: [44.693947, -69.381927], MD: [39.063946, -76.802101], MA: [42.230171, -71.530106],
  MI: [43.326618, -84.536095], MN: [45.694454, -93.900192], MS: [32.741646, -89.678696],
  MO: [38.456085, -92.288368], MT: [46.921925, -110.454353], NE: [41.12537, -98.268082],
  NV: [38.313515, -117.055374], NH: [43.452492, -71.563896], NJ: [40.298904, -74.521011],
  NM: [34.840515, -106.248482], NY: [42.165726, -74.948051], NC: [35.630066, -79.806419],
  ND: [47.528912, -99.784012], OH: [40.388783, -82.764915], OK: [35.565342, -96.928917],
  OR: [44.572021, -122.070938], PA: [40.590752, -77.209755], RI: [41.680893, -71.51178],
  SC: [33.856892, -80.945007], SD: [44.299782, -99.438828], TN: [35.747845, -86.692345],
  TX: [31.054487, -97.563461], UT: [40.150032, -111.862434], VT: [44.045876, -72.710686],
  VA: [37.769337, -78.169968], WA: [47.400902, -121.490494], WV: [38.491226, -80.954453],
  WI: [44.268543, -89.616508], WY: [42.755966, -107.30249], DC: [38.9072, -77.0369]
};

const map = L.map('map', {
  zoomControl: true,
  minZoom: 3,
  maxZoom: 9,
  maxBounds: [[22, -128], [52, -64]],
  maxBoundsViscosity: 1.0,
  zoomSnap: 0.5
}).setView([39.3, -98.4], 5);

L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; OpenStreetMap &copy; CARTO',
  subdomains: 'abcd',
  maxZoom: 20
}).addTo(map);

L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png', {
  subdomains: 'abcd',
  maxZoom: 20,
  opacity: 0.82,
  pane: 'overlayPane'
}).addTo(map);

const houseLayer = L.layerGroup().addTo(map);
const senateLayer = L.layerGroup().addTo(map);
const statusEl = document.getElementById('status');

const stateDistrictCounters = {};

function normalizeParty(party) {
  if (!party) return 'Democrat';
  if (party.toLowerCase().startsWith('rep')) return 'Republican';
  return 'Democrat';
}

function partyColor(party) {
  if (party === 'Democrat') return '#2f7dff';
  if (party === 'Republican') return '#ff3b30';
  return '#9aa8b5';
}

function currentTerm(legislator) {
  const terms = legislator.terms || [];
  const now = new Date().toISOString().slice(0, 10);
  const active = terms.find((t) => t.start <= now && t.end >= now);
  return active || terms[terms.length - 1] || null;
}

function senateOffset(index) {
  if (index % 2 === 0) return [-0.28, 0.12];
  return [0.28, -0.12];
}

function houseOffset(districtNumber) {
  const n = Number.isFinite(districtNumber) ? districtNumber : 1;
  const golden = 2.3999632297;
  const angle = n * golden;
  const radius = 0.1 + Math.sqrt(n) * 0.05;
  const latOffset = Math.sin(angle) * radius;
  const lonOffset = Math.cos(angle) * radius * 1.2;
  return [lonOffset, latOffset];
}

function createDot(lat, lon, party, radius, popupHtml) {
  const color = partyColor(party);
  const className = party === 'Republican' ? 'party-dot-rep' : 'party-dot-dem';

  return L.circleMarker([lat, lon], {
    radius,
    color,
    fillColor: color,
    fillOpacity: 0.96,
    weight: 1.2,
    opacity: 1,
    className
  }).bindPopup(popupHtml);
}

function formatName(person) {
  const first = person.first || '';
  const last = person.last || '';
  return `${first} ${last}`.trim();
}

function shouldShowParty(party) {
  if (party === 'Democrat') return document.getElementById('toggle-dem').checked;
  if (party === 'Republican') return document.getElementById('toggle-rep').checked;
  return false;
}

function rebuildLayers(members) {
  houseLayer.clearLayers();
  senateLayer.clearLayers();

  Object.keys(stateDistrictCounters).forEach((k) => delete stateDistrictCounters[k]);

  let houseCount = 0;
  let senateCount = 0;

  members.forEach(({ person, term, party }) => {
    const state = term.state;
    if (!STATE_CENTROIDS[state]) return;
    if (!shouldShowParty(party)) return;

    const [baseLat, baseLon] = STATE_CENTROIDS[state];

    if (term.type === 'sen') {
      const key = `${state}-sen`;
      const idx = stateDistrictCounters[key] || 0;
      stateDistrictCounters[key] = idx + 1;

      const [lonOff, latOff] = senateOffset(idx);
      const marker = createDot(
        baseLat + latOff,
        baseLon + lonOff,
        party,
        6,
        `<strong>${formatName(person)}</strong><br/>Senate • ${state}<br/>${party}`
      );
      senateLayer.addLayer(marker);
      senateCount += 1;
      return;
    }

    if (term.type === 'rep') {
      const district = Number.parseInt(term.district || '1', 10);
      const [lonOff, latOff] = houseOffset(district);
      const labelDistrict = district === 0 ? 'At-Large' : `District ${district}`;
      const marker = createDot(
        baseLat + latOff,
        baseLon + lonOff,
        party,
        4.5,
        `<strong>${formatName(person)}</strong><br/>House • ${state} ${labelDistrict}<br/>${party}`
      );
      houseLayer.addLayer(marker);
      houseCount += 1;
    }
  });

  const showHouse = document.getElementById('toggle-house').checked;
  const showSenate = document.getElementById('toggle-senate').checked;

  if (showHouse && !map.hasLayer(houseLayer)) map.addLayer(houseLayer);
  if (!showHouse && map.hasLayer(houseLayer)) map.removeLayer(houseLayer);
  if (showSenate && !map.hasLayer(senateLayer)) map.addLayer(senateLayer);
  if (!showSenate && map.hasLayer(senateLayer)) map.removeLayer(senateLayer);

  statusEl.textContent = `Loaded ${houseCount} House + ${senateCount} Senate members.`;
}

async function init() {
  try {
    const response = await fetch(CONGRESS_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const raw = await response.json();
    const members = raw
      .map((legislator) => {
        const term = currentTerm(legislator);
        if (!term) return null;
        if (!['rep', 'sen'].includes(term.type)) return null;

        return {
          person: legislator.name,
          term,
          party: normalizeParty(term.party)
        };
      })
      .filter(Boolean)
      .filter((m) => Boolean(STATE_CENTROIDS[m.term.state]));

    rebuildLayers(members);

    ['toggle-house', 'toggle-senate', 'toggle-dem', 'toggle-rep'].forEach((id) => {
      document.getElementById(id).addEventListener('change', () => rebuildLayers(members));
    });
  } catch (err) {
    console.error(err);
    statusEl.textContent = `Failed to load data: ${err.message}`;
  }
}

init();
