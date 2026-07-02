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

## Typography Role Mapping
The catalog includes `catalog/typography-role-map.json` as the neutral design-system typography source of truth.

It defines desktop and mobile values for these semantic text roles:
- `display`
- `heading_l`
- `heading_m`
- `heading_s`
- `body_l`
- `body_m`
- `body_s`
- `label`
- `caption`

Mobile values apply at and below the configured `mobile_breakpoint_px`.

The catalog also includes `catalog/typography-allocation.matrix.json`, which maps each semantic component and text/meta slot to one of the typography roles.

This allows global typography updates by changing role tokens once, while keeping component-level usage consistent.
