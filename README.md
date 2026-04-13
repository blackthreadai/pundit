Pundit (MVP)

US-only congressional map inspired by OpenGridWorks layout style.

Current features:
- Dark futuristic dashboard-style map UI
- Floating overlay sidebar (on top of map)
- Layers: House, Senate
- Party dots: Blue = Democrat, Red = Republican
- Glow + orbital ring marker style
- Dot popups with member card (name, chamber, party, district)
- US-focused bounds and tighter default zoom
- Visible state outlines

Data sources:
- Members: https://unitedstates.github.io/congress-legislators/legislators-current.json
- District centroids: U.S. Census TIGERweb Legislative MapServer (119th Congressional Districts)
- State outlines: https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json

Run locally:
1. In repo root:
   python3 -m http.server 8080
2. Open:
   http://localhost:8080

Notes:
- This MVP places House dots using state centroid + district-index offsets.
- Next step can upgrade to true congressional district centroid geometry.
