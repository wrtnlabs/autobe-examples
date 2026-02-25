import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlag";
import type { ICommunityPlatformFeatureFlagEnvironment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlagEnvironment";
import type { ICommunityPlatformFeatureFlagEnvironmentDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlagEnvironmentDetail";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_community_platform_admin_feature_flags_create } from "../../../generate/generate_random_community_platform_admin_feature_flags_create";
import { generate_random_community_platform_admin_feature_flags_environments_create } from "../../../generate/generate_random_community_platform_admin_feature_flags_environments_create";
import { prepare_random_community_platform_feature_flag } from "../../../prepare/prepare_random_community_platform_feature_flag";
import { prepare_random_community_platform_feature_flag_environment } from "../../../prepare/prepare_random_community_platform_feature_flag_environment";

export async function test_api_feature_flag_environment_details_update_rollout_configuration(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication setup
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create user-specific feature flag configuration
  const featureFlag =
    await generate_random_community_platform_admin_feature_flags_create(
      adminConnection,
      {
        body: {
          name: `feature_${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          flag_type: "user_specific" as const,
          status: "active" as const,
        } satisfies ICommunityPlatformFeatureFlag.ICreate,
      },
    );
  typia.assert(featureFlag);
  // 3. Create environment configuration with partial rollout
  const environment =
    await generate_random_community_platform_admin_feature_flags_environments_create(
      adminConnection,
      {
        params: { featureFlagId: featureFlag.id },
        body: {
          is_enabled: true,
          rollout_percentage: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<50>
          >(),
        } satisfies ICommunityPlatformFeatureFlagEnvironment.ICreate,
      },
    );
  typia.assert(environment);
  // 4. Update environment details configuration
  const updatedDetails =
    await api.functional.communityPlatform.admin.feature_flags.environments.details.patchByFeatureflagidAndEnvironmentid(
      adminConnection,
      {
        featureFlagId: featureFlag.id,
        environmentId: environment.id,
        body: {} satisfies ICommunityPlatformFeatureFlagEnvironmentDetail.IUpdate,
      },
    );
  typia.assert(updatedDetails);
  // 5. Validate the updated configuration
  TestValidator.equals(
    "feature flag reference preserved",
    updatedDetails.featureFlag.id,
    featureFlag.id,
  );
  TestValidator.equals(
    "environment reference preserved",
    updatedDetails.environment.id,
    environment.id,
  );
  TestValidator.predicate(
    "environment is enabled",
    updatedDetails.environment.is_enabled,
  );
  TestValidator.notEquals(
    "updated timestamp should be different",
    updatedDetails.updated_at,
    updatedDetails.created_at,
  );
  TestValidator.predicate(
    "updated timestamp is after creation",
    new Date(updatedDetails.updated_at) > new Date(updatedDetails.created_at),
  );
}
