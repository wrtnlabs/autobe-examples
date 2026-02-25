import { IEcommerceCacheConfigurationParameterDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfigurationParameterDefinition";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_ecommerce_cache_configuration_parameter_definition(
  input?: DeepPartial<IEcommerceCacheConfigurationParameterDefinition.ICreate>,
): IEcommerceCacheConfigurationParameterDefinition.ICreate {
  return {
    parameter_name:
      input?.parameter_name ?? RandomGenerator.alphaNumeric(12).toLowerCase(),
    data_type:
      input?.data_type ??
      RandomGenerator.pick([
        "string",
        "integer",
        "boolean",
        "array",
        "object",
      ] as const),
    description:
      input?.description ??
      RandomGenerator.paragraph({ sentences: 2, wordMin: 5, wordMax: 12 }),
    default_value:
      input?.default_value ??
      (() => {
        const type =
          input?.data_type ??
          RandomGenerator.pick([
            "string",
            "integer",
            "boolean",
            "array",
            "object",
          ] as const);
        switch (type) {
          case "string":
            return RandomGenerator.alphabets(8);
          case "integer":
            return typia.random<number & tags.Type<"uint32">>().toString();
          case "boolean":
            return RandomGenerator.pick(["true", "false"] as const);
          case "array":
            return "[]";
          case "object":
            return "{}";
          default:
            return null;
        }
      })(),
    validation_rules:
      input?.validation_rules ??
      RandomGenerator.pick([
        '{"maxLength": 255}',
        '{"min": 0}',
        '{"pattern": "^[a-zA-Z0-9_]+$"}',
        '{"items": {"type": "string"}}',
      ] as const),
    is_required:
      input?.is_required ?? RandomGenerator.pick([true, true, false] as const),
    min_value:
      input?.min_value ??
      (input?.data_type === "integer"
        ? typia
            .random<
              number &
                tags.Type<"uint32"> &
                tags.Minimum<0> &
                tags.Maximum<1000>
            >()
            .toString()
        : null),
    max_value:
      input?.max_value ??
      (input?.data_type === "integer"
        ? typia
            .random<
              number &
                tags.Type<"uint32"> &
                tags.Minimum<100> &
                tags.Maximum<10000>
            >()
            .toString()
        : null),
    allowed_values:
      input?.allowed_values ??
      RandomGenerator.pick([
        '["GET", "POST", "PUT", "DELETE"]',
        '["production", "development", "staging"]',
        '["low", "medium", "high"]',
        null,
      ] as const),
    pattern:
      input?.pattern ??
      RandomGenerator.pick([
        "^[a-zA-Z][a-zA-Z0-9_]*$",
        "^[0-9]{1,5}$",
        "^https?://.+",
        null,
      ] as const),
  };
}
