const CONGRESS_URL = 'https://unitedstates.github.io/congress-legislators/legislators-current.json';
const DISTRICT_CENTROIDS_URL = 'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Legislative/MapServer/0/query?where=1%3D1&outFields=STATE%2CCD119%2CCENTLAT%2CCENTLON%2CCDTYP&returnGeometry=false&f=pjson';
const STATES_GEOJSON_URL = 'https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json';
const GOVERNORS_URL = './data/governors.json';

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

const STATE_TO_FIPS = {
  AL: '01', AK: '02', AZ: '04', AR: '05', CA: '06', CO: '08', CT: '09', DE: '10', FL: '12',
  GA: '13', HI: '15', ID: '16', IL: '17', IN: '18', IA: '19', KS: '20', KY: '21', LA: '22',
  ME: '23', MD: '24', MA: '25', MI: '26', MN: '27', MS: '28', MO: '29', MT: '30', NE: '31',
  NV: '32', NH: '33', NJ: '34', NM: '35', NY: '36', NC: '37', ND: '38', OH: '39', OK: '40',
  OR: '41', PA: '42', RI: '44', SC: '45', SD: '46', TN: '47', TX: '48', UT: '49', VT: '50',
  VA: '51', WA: '53', WV: '54', WI: '55', WY: '56', DC: '11'
};

const map = L.map('map', {
  zoomControl: false,
  minZoom: 3,
  maxZoom: 9,
  maxBounds: [[22, -128], [52, -64]],
  maxBoundsViscosity: 1.0,
  zoomSnap: 0.5
}).setView([39.3, -98.4], 5);

L.control.zoom({ position: 'topright' }).addTo(map);

L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; OpenStreetMap &copy; CARTO',
  subdomains: 'abcd',
  maxZoom: 20
}).addTo(map);

L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png', {
  subdomains: 'abcd',
  maxZoom: 20,
  opacity: 0.86,
  pane: 'overlayPane'
}).addTo(map);

const houseLayer = L.layerGroup().addTo(map);
const senateLayer = L.layerGroup().addTo(map);
const governorsLayer = L.layerGroup().addTo(map);
const statusEl = document.getElementById('status');
const partySliderEl = document.getElementById('party-slider');
const partyModeLabelEl = document.getElementById('party-mode-label');

function normalizeParty(party) {
  if (!party) return 'Other';
  const p = party.toLowerCase();
  if (p.includes('rep')) return 'Republican';
  if (p.includes('dem')) return 'Democrat';
  return 'Other';
}

function partyColor(party) {
  if (party === 'Democrat') return '#2f7dff';
  if (party === 'Republican') return '#ff3b30';
  return '#9aa8b5';
}

function partyMode() {
  const v = Number(partySliderEl.value);
  if (v === 0) return 'democrat-only';
  if (v === 2) return 'republican-only';
  return 'both';
}

function updatePartyModeLabel() {
  partyModeLabelEl.textContent = 'Both';
}

function partyPass(party) {
  const mode = partyMode();
  if (mode === 'both') return true;
  if (mode === 'democrat-only') return party === 'Democrat';
  if (mode === 'republican-only') return party === 'Republican';
  return true;
}

function currentTerm(legislator) {
  const terms = legislator.terms || [];
  const now = new Date().toISOString().slice(0, 10);
  const active = terms.find((t) => t.start <= now && t.end >= now);
  return active || terms[terms.length - 1] || null;
}

function senateOffset(index) {
  return index % 2 === 0 ? [-0.32, 0.14] : [0.32, -0.14];
}

function houseFallbackOffset(districtNumber) {
  const n = Number.isFinite(districtNumber) ? districtNumber : 1;
  const angle = n * 2.3999632297;
  const radius = 0.1 + Math.sqrt(n) * 0.05;
  const latOffset = Math.sin(angle) * radius;
  const lonOffset = Math.cos(angle) * radius * 1.2;
  return [lonOffset, latOffset];
}

function districtKey(stateAbbr, districtRaw) {
  const fips = STATE_TO_FIPS[stateAbbr];
  if (!fips) return null;
  const n = Number.parseInt(String(districtRaw ?? '0'), 10);
  const district = Number.isNaN(n) ? '00' : String(n).padStart(2, '0');
  return `${fips}-${district}`;
}

function createDot(lat, lon, party, radius, popupHtml, extraClass = '') {
  const color = partyColor(party);
  const className = `${party === 'Republican' ? 'party-dot-rep' : 'party-dot-dem'} ${extraClass}`.trim();

  return L.circleMarker([lat, lon], {
    radius,
    color,
    fillColor: color,
    fillOpacity: 0.95,
    weight: 0,
    opacity: 0,
    className
  }).bindPopup(popupHtml);
}

function formatName(person) {
  return `${person.first || ''} ${person.last || ''}`.trim();
}

function parseDistrictCentroids(payload) {
  const mapCentroids = new Map();
  (payload.features || []).forEach((f) => {
    const a = f.attributes || {};
    if ((a.CDTYP || '').toUpperCase() !== 'O') return;
    const state = String(a.STATE || '').padStart(2, '0');
    const cd = String(a.CD119 || '00').padStart(2, '0');
    const lat = Number(String(a.CENTLAT || '').replace('+', ''));
    const lon = Number(String(a.CENTLON || '').replace('+', ''));
    if (Number.isFinite(lat) && Number.isFinite(lon)) mapCentroids.set(`${state}-${cd}`, [lat, lon]);
  });
  return mapCentroids;
}

function congressPhotoUrl(bioguideId) {
  if (!bioguideId) return '';
  const id = String(bioguideId).toUpperCase();
  const first = id[0];
  return `https://bioguide.congress.gov/bioguide/photo/${first}/${id}.jpg`;
}

function avatarFallbackUrl(name) {
  const encoded = encodeURIComponent(name || 'Politician');
  return `https://ui-avatars.com/api/?name=${encoded}&background=0b1a2e&color=d9eaff&size=128&bold=true`;
}

function buildPopup({ name, office, locationLabel, party, extra = '', photoUrl = '' }) {
  const fallback = avatarFallbackUrl(name);
  const img = `<img class="popup-photo" src="${photoUrl || fallback}" alt="${name}" onerror="this.onerror=null;this.src='${fallback}';" />`;

  return `
    <div class="popup-card">
      ${img}
      <div class="popup-name">${name}</div>
      <div class="popup-meta">${office} • ${locationLabel}</div>
      <div class="popup-party ${party === 'Republican' ? 'party-rep' : 'party-dem'}">${party}</div>
      ${extra ? `<div class="popup-id">${extra}</div>` : ''}
    </div>
  `;
}

async function addStateOutlineLayer() {
  const response = await fetch(STATES_GEOJSON_URL);
  if (!response.ok) throw new Error(`State outlines failed: HTTP ${response.status}`);
  const geojson = await response.json();

  L.geoJSON(geojson, {
    style: {
      color: '#7edcff',
      weight: 1.2,
      opacity: 0.62,
      fillOpacity: 0
    },
    interactive: false
  }).addTo(map);
}

function rebuildLayers(members, districtCentroids, governors) {
  houseLayer.clearLayers();
  senateLayer.clearLayers();
  governorsLayer.clearLayers();

  const senateCounterByState = {};
  let houseCount = 0;
  let senateCount = 0;
  let governorCount = 0;

  members.forEach((member) => {
    const { term, party, bioguideId } = member;
    const state = term.state;
    if (!STATE_CENTROIDS[state] || !partyPass(party)) return;

    if (term.type === 'sen') {
      const [baseLat, baseLon] = STATE_CENTROIDS[state];
      const key = `${state}-sen`;
      const idx = senateCounterByState[key] || 0;
      senateCounterByState[key] = idx + 1;
      const [lonOff, latOff] = senateOffset(idx);

      const memberName = formatName(member.person);
      senateLayer.addLayer(createDot(
        baseLat + latOff,
        baseLon + lonOff,
        party,
        5.8,
        buildPopup({
          name: memberName,
          office: 'United States Senate',
          locationLabel: state,
          party,
          extra: `BioGuide: ${bioguideId || 'n/a'}`,
          photoUrl: congressPhotoUrl(bioguideId)
        })
      ));
      senateCount += 1;
      return;
    }

    if (term.type === 'rep') {
      const district = Number.parseInt(term.district || '0', 10);
      const key = districtKey(state, district);
      let lat;
      let lon;

      if (key && districtCentroids.has(key)) {
        [lat, lon] = districtCentroids.get(key);
      } else {
        const [baseLat, baseLon] = STATE_CENTROIDS[state];
        const [lonOff, latOff] = houseFallbackOffset(district || 1);
        lat = baseLat + latOff;
        lon = baseLon + lonOff;
      }

      const districtLabel = district === 0 ? 'At-Large' : `District ${district}`;
      const memberName = formatName(member.person);
      houseLayer.addLayer(createDot(
        lat,
        lon,
        party,
        4.2,
        buildPopup({
          name: memberName,
          office: 'U.S. House of Representatives',
          locationLabel: `${state} ${districtLabel}`,
          party,
          extra: `BioGuide: ${bioguideId || 'n/a'}`,
          photoUrl: congressPhotoUrl(bioguideId)
        })
      ));
      houseCount += 1;
    }
  });

  governors.forEach((gov) => {
    const party = normalizeParty(gov.party);
    if (!partyPass(party)) return;

    const center = STATE_CENTROIDS[gov.state_abbr];
    if (!center) return;

    const [lat, lon] = [center[0] + 0.31, center[1]];
    governorsLayer.addLayer(createDot(
      lat,
      lon,
      party,
      5,
      buildPopup({
        name: gov.name,
        office: 'State Governor',
        locationLabel: `${gov.state} (${gov.state_abbr})`,
        party,
        extra: `In office since: ${gov.start_date || 'n/a'}`,
        photoUrl: ''
      }),
      'gov-dot'
    ));
    governorCount += 1;
  });

  const showHouse = document.getElementById('toggle-house').checked;
  const showSenate = document.getElementById('toggle-senate').checked;
  const showGovernors = document.getElementById('toggle-governors').checked;

  if (showHouse && !map.hasLayer(houseLayer)) map.addLayer(houseLayer);
  if (!showHouse && map.hasLayer(houseLayer)) map.removeLayer(houseLayer);
  if (showSenate && !map.hasLayer(senateLayer)) map.addLayer(senateLayer);
  if (!showSenate && map.hasLayer(senateLayer)) map.removeLayer(senateLayer);
  if (showGovernors && !map.hasLayer(governorsLayer)) map.addLayer(governorsLayer);
  if (!showGovernors && map.hasLayer(governorsLayer)) map.removeLayer(governorsLayer);

  statusEl.textContent = `Loaded ${houseCount} House + ${senateCount} Senate + ${governorCount} Governors.`;
}

async function init() {
  try {
    statusEl.textContent = 'Loading congressional + governors data...';

    const [congressRes, districtRes, governorsRes] = await Promise.all([
      fetch(CONGRESS_URL),
      fetch(DISTRICT_CENTROIDS_URL),
      fetch(GOVERNORS_URL)
    ]);

    if (!congressRes.ok) throw new Error(`Congress data HTTP ${congressRes.status}`);
    if (!districtRes.ok) throw new Error(`District data HTTP ${districtRes.status}`);
    if (!governorsRes.ok) throw new Error(`Governors data HTTP ${governorsRes.status}`);

    const [rawCongress, districtPayload, governorsPayload] = await Promise.all([
      congressRes.json(),
      districtRes.json(),
      governorsRes.json()
    ]);

    const districtCentroids = parseDistrictCentroids(districtPayload);
    const governors = Array.isArray(governorsPayload.governors) ? governorsPayload.governors : [];

    const members = rawCongress
      .map((legislator) => {
        const term = currentTerm(legislator);
        if (!term || !['rep', 'sen'].includes(term.type) || !STATE_CENTROIDS[term.state]) return null;
        return {
          person: legislator.name,
          bioguideId: legislator.id?.bioguide || '',
          term,
          party: normalizeParty(term.party)
        };
      })
      .filter(Boolean);

    await addStateOutlineLayer();
    updatePartyModeLabel();
    rebuildLayers(members, districtCentroids, governors);

    ['toggle-house', 'toggle-senate', 'toggle-governors'].forEach((id) => {
      document.getElementById(id).addEventListener('change', () => rebuildLayers(members, districtCentroids, governors));
    });

    partySliderEl.addEventListener('input', () => {
      updatePartyModeLabel();
      rebuildLayers(members, districtCentroids, governors);
    });
  } catch (err) {
    console.error(err);
    statusEl.textContent = `Failed to load data: ${err.message}`;
  }
}

init();
