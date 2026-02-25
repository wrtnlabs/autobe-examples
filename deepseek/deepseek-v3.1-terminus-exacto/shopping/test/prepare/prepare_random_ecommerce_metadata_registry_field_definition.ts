import { IEcommerceMetadataRegistryFieldDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistryFieldDefinition";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_ecommerce_metadata_registry_field_definition(
  input?:
    | DeepPartial<IEcommerceMetadataRegistryFieldDefinition.ICreate>
    | undefined,
): IEcommerceMetadataRegistryFieldDefinition.ICreate {
  return {
    field_name:
      input?.field_name ??
      RandomGenerator.paragraph({ sentences: 1, wordMin: 1, wordMax: 3 }),
    field_type:
      input?.field_type ??
      RandomGenerator.pick([
        "string",
        "number",
        "boolean",
        "object",
        "array",
      ] as const),
    description:
      input?.description ??
      RandomGenerator.paragraph({ sentences: 2, wordMin: 5, wordMax: 8 }),
    is_required:
      input?.is_required ?? RandomGenerator.pick([true, false] as const),
    default_value: input?.default_value ?? null,
    validation_rules:
      input?.validation_rules ??
      JSON.stringify({
        minLength: 1,
        maxLength: 255,
        pattern: "^[a-zA-Z0-9_-]+$",
      }),
  };
}
