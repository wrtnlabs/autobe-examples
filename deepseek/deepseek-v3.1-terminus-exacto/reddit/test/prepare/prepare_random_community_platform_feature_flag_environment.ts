import { ICommunityPlatformFeatureFlagEnvironment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlagEnvironment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_feature_flag_environment(
  input?: DeepPartial<ICommunityPlatformFeatureFlagEnvironment.ICreate>,
): ICommunityPlatformFeatureFlagEnvironment.ICreate {
  return {
    is_enabled: input?.is_enabled ?? typia.random<boolean>(),
    rollout_percentage:
      input?.rollout_percentage ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<100>
      >(),
  };
}
