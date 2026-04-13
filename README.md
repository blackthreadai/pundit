Pundit (MVP)

US-only congressional map inspired by OpenGridWorks layout style.

Current features:
- Dark dashboard-style map UI
- Layers: House, Senate
- Party dots: Blue = Democrat, Red = Republican
- Dot popups with member name + chamber + state/district
- US-focused bounds and zoom

Data source:
- https://unitedstates.github.io/congress-legislators/legislators-current.json

Run locally:
1. In repo root:
   python3 -m http.server 8080
2. Open:
   http://localhost:8080

Notes:
- This MVP places House dots using state centroid + district-index offsets.
- Next step can upgrade to true congressional district centroid geometry.
