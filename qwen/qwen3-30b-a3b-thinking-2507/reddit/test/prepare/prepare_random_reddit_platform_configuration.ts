import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformConfiguration";
export function prepare_random_reddit_platform_configuration(
  input?: DeepPartial<IRedditPlatformConfiguration.ICreate>,
): IRedditPlatformConfiguration.ICreate {
  return {
    configKey:
      input?.configKey ??
      RandomGenerator.pick([
        "feature_flag",
        "threshold_user_count",
        "user_experience_parameter",
      ] as const),
    value:
      input?.value ??
      RandomGenerator.pick([
        "true",
        "false",
        "500",
        "user-friendly",
        "24h",
      ] as const),
  };
}
