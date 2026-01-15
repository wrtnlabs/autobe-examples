import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformConfiguration";
import { ICommunityPlatformConfigurationValue } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformConfigurationValue";
export function prepare_random_community_platform_configuration(
  input?: DeepPartial<ICommunityPlatformConfiguration.ICreate>,
): ICommunityPlatformConfiguration.ICreate {
  return {
    // Test-customizable: unique configuration key with dot notation
    key:
      input?.key ??
      ArrayUtil.repeat(
        typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
        >(),
        () =>
          RandomGenerator.alphabets(
            typia.random<
              number & tags.Type<"uint32"> & tags.Minimum<3> & tags.Maximum<10>
            >(),
          ),
      ).join("."),
    // Test-customizable: random value of permitted types (string, number, boolean)
    value:
      input?.value ??
      RandomGenerator.pick([
        () =>
          RandomGenerator.paragraph({ sentences: 1, wordMin: 3, wordMax: 6 }),
        () =>
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<1000>
          >(),
        () => RandomGenerator.pick([true, false] as const),
      ])(),
    // Test-customizable: optional description (maxLength: 1000)
    description:
      input?.description ??
      RandomGenerator.pick([
        RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 4,
          wordMax: 8,
        }),
      ]) ?? undefined,
    // Test-customizable: optional scope with valid values
    scope:
      input?.scope ??
      RandomGenerator.pick(["global", "community", "user"] as const) ?? undefined,
  };
}