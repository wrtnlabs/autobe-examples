import { ICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_configuration(
  input?: DeepPartial<ICommunityPlatformConfiguration.ICreate>,
): ICommunityPlatformConfiguration.ICreate {
  const dataType =
    input?.data_type ??
    RandomGenerator.pick([
      "boolean",
      "integer",
      "string",
      "json",
      "decimal",
    ] as const);
  const generateConfigValue = (): string => {
    switch (dataType) {
      case "boolean":
        return typia.random<boolean>() ? "true" : "false";
      case "integer":
        return typia.random<number & tags.Type<"uint32">>().toString();
      case "string":
        return RandomGenerator.alphabets(10);
      case "json":
        return JSON.stringify({ example: RandomGenerator.name() });
      case "decimal":
        return typia.random<number & tags.Type<"double">>().toFixed(2);
      default:
        return RandomGenerator.alphaNumeric(8);
    }
  };
  return {
    config_key:
      input?.config_key ?? `config_${RandomGenerator.alphaNumeric(8)}`,
    config_value: input?.config_value ?? generateConfigValue(),
    data_type: dataType,
    scope:
      input?.scope ??
      RandomGenerator.pick([
        "global",
        "environment",
        "feature",
        "user_group",
        "community",
      ] as const),
    description:
      input?.description ??
      RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
    is_active:
      input?.is_active ??
      Boolean(
        typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<1>
        >(),
      ),
  };
}
