import Ajv2020 from "ajv/dist/2020";
import componentSchema from "../../../semantic-contract/schema/semantic-component.schema.json";
import screenSchema from "../../../semantic-contract/schema/screen-instance.schema.json";

const ajv = new Ajv2020({ allErrors: true });

const validateComponent = ajv.compile(componentSchema);
const validateScreen = ajv.compile(screenSchema);

export function validateContracts(
  componentCatalog: unknown[],
  screen: unknown,
): string[] {
  const errors: string[] = [];

  componentCatalog.forEach((component) => {
    const id =
      typeof component === "object" && component !== null && "semantic_id" in component
        ? String((component as { semantic_id: unknown }).semantic_id)
        : "unknown_component";
    const valid = validateComponent(component);
    if (!valid && validateComponent.errors) {
      validateComponent.errors.forEach((error) => {
        errors.push(
          `component ${id}: ${error.instancePath || "/"} ${error.message || "validation error"}`,
        );
      });
    }
  });

  const screenId =
    typeof screen === "object" && screen !== null && "screen_id" in screen
      ? String((screen as { screen_id: unknown }).screen_id)
      : "unknown_screen";
  const screenValid = validateScreen(screen);
  if (!screenValid && validateScreen.errors) {
    validateScreen.errors.forEach((error) => {
      errors.push(
        `screen ${screenId}: ${error.instancePath || "/"} ${error.message || "validation error"}`,
      );
    });
  }

  return errors;
}
