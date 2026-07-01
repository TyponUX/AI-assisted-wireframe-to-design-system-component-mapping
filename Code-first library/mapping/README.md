# Adapter Layer

## Files
- `adapter-contract.schema.json`: canonical adapter schema
- `adapter-compatibility.matrix.json`: semantic-contract compatibility map for adapters
- `client-adapter.baseline.json`: baseline complete adapter example
- `client-adapter.template.json`: starter template for new client adapters

## Naming
Use `client-adapter.<client>.json` for concrete adapters.

## Quality Gate
`react-wireframe-lib/scripts/contract-check.mjs` validates:
- schema validity
- semantic/state/slot coverage
- adapter compatibility against semantic contract version

## Fallback Strategy
Each adapter rule should include:
- `fallback`: deterministic primary fallback component
- `fallback_chain`: ordered secondary candidates
- `confidence`: mapping confidence from `0` to `1`
