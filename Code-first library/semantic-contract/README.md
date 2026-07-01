# Semantic Contract

## Versioning
Current semantic contract version is tracked in `contract-version.json`.

## Maturity Fields
Every semantic component should include:
- `interaction`: events and async behavior intent
- `accessibility`: aria role, keyboard model, live region intent
- `responsive`: compact support and breakpoint intent
- `i18n`: text direction, locale-sensitive slots, truncation policy

These fields keep the core library neutral while making downstream mapping deterministic.
