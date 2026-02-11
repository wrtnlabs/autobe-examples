import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformSystematicConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformSystematicConfig";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_platform_systematic_config(
  input?: DeepPartial<IRedditPlatformSystematicConfig.ICreate>,
): IRedditPlatformSystematicConfig.ICreate {
  return {
    config_key: input?.config_key ?? RandomGenerator.alphaNumeric(10),
    config_value:
      input?.config_value ?? RandomGenerator.paragraph({ sentences: 2 }),
    config_type:
      input?.config_type ??
      RandomGenerator.pick([
        "string",
        "int",
        "double",
        "boolean",
        "json",
      ] as const),
    description:
      input?.description ??
      (RandomGenerator.pick([true, false] as const)
        ? RandomGenerator.paragraph({ sentences: 1 })
        : null),
    is_active: input?.is_active ?? RandomGenerator.pick([true, false] as const),
  };
}
