import { ICommunityPlatformFeatureFlagEnvironmentDetailConfigurationOverride } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlagEnvironmentDetailConfigurationOverride";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_feature_flag_environment_detail_configuration_override(
  input?: DeepPartial<ICommunityPlatformFeatureFlagEnvironmentDetailConfigurationOverride.ICreate>,
): ICommunityPlatformFeatureFlagEnvironmentDetailConfigurationOverride.ICreate {
  return {
    config_key:
      input?.config_key ??
      RandomGenerator.pick([
        "enabled",
        "percentage",
        "variant",
        "threshold",
        "timeout",
        "retries",
        "limit",
        "size",
        "mode",
        "level",
      ] as const),
    config_value: input?.config_value ?? RandomGenerator.alphaNumeric(10),
  };
}
