# Code-First Library

This folder is the execution starter for the semantic wireframe contract.

## What Is In Here
- semantic-contract/schema: JSON Schemas for semantic components and screen trees
- semantic-contract/catalog: Initial semantic component catalog and a starter flow
- mapping: Mapping schemas and a client adapter template
- typescript: TypeScript types for React implementation
- typescript/authoring-library.ts: Authoring helpers (builders, validators, serializer)

## How To Use This Contract
1. Build React wireframe components that implement semantic IDs from the catalog.
2. Require every component instance to emit semantic metadata.
3. Serialize each screen into the screen-tree format.
4. Use mapping rules to translate semantic components into a client design system.
5. Use the authoring library helpers to create and validate components/screens consistently.

## Definition Of Done For Phase 1
- 12 to 15 neutral components implemented in React
- All components expose states and slots from the contract
- At least 2 interactive flows exported as semantic screen trees
- One client adapter draft created from the mapping template
