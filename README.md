# CBG Opportunity Desk

Internal front-end for exploring CBG plant locations, biomass surplus, pipeline proximity, GA coverage, M&A shortlists and business insights.

Built from `data/CBG Analysis with Summary 3Y. incl.xlsx`.

## Pages

1. **Best locations** — tweak Control-sheet style thresholds; ranked districts + India map
2. **States & districts** — select/highlight a state, inspect district demand / surplus / pipeline, nearby districts
3. **GAs** — same flow for Geographical Areas
4. **M&A options** — parameterised plant shortlist joined to district context
5. **Insights** — charts and pipeline snapshot

## Local run

```bash
npm install
npm run data    # regenerate public/data/dataset.json from the Excel
npm run dev
```

## GitHub Pages

```bash
# build with repo base path
npm run build:gh
```

Or push to `main` and let `.github/workflows/deploy-pages.yml` publish.

Site URL (after Pages is enabled):

`https://<org-or-user>.github.io/cbg-opportunity-tool/`

## Refresh data

Replace `data/CBG Analysis with Summary 3Y. incl.xlsx`, then:

```bash
npm run data
```
