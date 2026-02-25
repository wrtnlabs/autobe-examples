import { ICommunityPlatformFeatureFlagEnvironmentDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlagEnvironmentDetail";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_feature_flag_environment_detail(
  input?:
    | DeepPartial<ICommunityPlatformFeatureFlagEnvironmentDetail.ICreate>
    | undefined,
): ICommunityPlatformFeatureFlagEnvironmentDetail.ICreate {
  input;
  return {};
}
