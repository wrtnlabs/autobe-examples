import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlag";
import type { ICommunityPlatformFeatureFlagEnvironment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlagEnvironment";
import type { ICommunityPlatformFeatureFlagEnvironmentDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlagEnvironmentDetail";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_feature_flag_environment_detail } from "../prepare/prepare_random_community_platform_feature_flag_environment_detail";

export async function generate_random_community_platform_admin_feature_flags_environments_details_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformFeatureFlagEnvironmentDetail.ICreate>;
    params: {
      featureFlagId: string;
      environmentId: string;
    };
  },
): Promise<ICommunityPlatformFeatureFlagEnvironmentDetail> {
  const prepared: ICommunityPlatformFeatureFlagEnvironmentDetail.ICreate =
    prepare_random_community_platform_feature_flag_environment_detail(
      props.body,
    );
  const result: ICommunityPlatformFeatureFlagEnvironmentDetail =
    await api.functional.communityPlatform.admin.feature_flags.environments.details.create(
      connection,
      {
        featureFlagId: props.params.featureFlagId,
        environmentId: props.params.environmentId,
        body: prepared,
      },
    );
  return result;
}
