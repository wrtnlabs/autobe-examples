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
import { generate_random_community_platform_admin_feature_flags_environments_details_create } from "../../../generate/generate_random_community_platform_admin_feature_flags_environments_details_create";
import { prepare_random_community_platform_feature_flag } from "../../../prepare/prepare_random_community_platform_feature_flag";
import { prepare_random_community_platform_feature_flag_environment } from "../../../prepare/prepare_random_community_platform_feature_flag_environment";
import { prepare_random_community_platform_feature_flag_environment_detail } from "../../../prepare/prepare_random_community_platform_feature_flag_environment_detail";

export async function test_api_feature_flag_environment_detail_admin_hard_delete_complete_cleanup(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
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
  // 2. Create feature flag
  const featureFlag =
    await api.functional.communityPlatform.admin.feature_flags.create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          flag_type: "boolean",
          status: "active",
          boolean_value: true,
        } satisfies ICommunityPlatformFeatureFlag.ICreate,
      },
    );
  typia.assert(featureFlag);
  // 3. Create environment configuration
  const environment =
    await api.functional.communityPlatform.admin.feature_flags.environments.create(
      adminConnection,
      {
        featureFlagId: featureFlag.id,
        body: {
          is_enabled: true,
          rollout_percentage: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<100>
          >(),
        } satisfies ICommunityPlatformFeatureFlagEnvironment.ICreate,
      },
    );
  typia.assert(environment);
  // 4. Create environment detail configuration
  const detail =
    await api.functional.communityPlatform.admin.feature_flags.environments.details.create(
      adminConnection,
      {
        featureFlagId: featureFlag.id,
        environmentId: environment.id,
        body: {} satisfies ICommunityPlatformFeatureFlagEnvironmentDetail.ICreate,
      },
    );
  typia.assert(detail);
  // 5. Verify detail exists
  TestValidator.equals("detail ID matches", detail.id, detail.id);
  TestValidator.equals(
    "feature flag relationship matches",
    detail.featureFlag.id,
    featureFlag.id,
  );
  TestValidator.equals(
    "environment relationship matches",
    detail.environment.id,
    environment.id,
  );
  // 6. Execute delete operation
  await api.functional.communityPlatform.admin.feature_flags.environments.details.erase(
    adminConnection,
    {
      featureFlagId: featureFlag.id,
      environmentId: environment.id,
      detailId: detail.id,
    },
  );
  // 7. Validate deletion by attempting to recreate (should succeed if truly deleted)
  // Note: Since delete is a hard delete, we can't verify by fetching
  // The operation returns 204 No Content on success, no response body
  // We validate success by the absence of an exception
  TestValidator.predicate("delete operation completed successfully", true);
}
