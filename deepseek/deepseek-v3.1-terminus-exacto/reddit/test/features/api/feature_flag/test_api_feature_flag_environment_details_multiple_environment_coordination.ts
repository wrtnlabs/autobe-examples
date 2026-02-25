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

export async function test_api_feature_flag_environment_details_multiple_environment_coordination(
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
    await generate_random_community_platform_admin_feature_flags_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          flag_type: "boolean",
          status: "active",
          boolean_value: true,
        } satisfies ICommunityPlatformFeatureFlag.ICreate,
      },
    );
  typia.assert(featureFlag);
  // 3. Create development environment
  const devEnvironment =
    await generate_random_community_platform_admin_feature_flags_environments_create(
      adminConnection,
      {
        body: {
          is_enabled: true,
          rollout_percentage: 50,
        } satisfies ICommunityPlatformFeatureFlagEnvironment.ICreate,
        params: { featureFlagId: featureFlag.id },
      },
    );
  typia.assert(devEnvironment);
  // 4. Create production environment
  const prodEnvironment =
    await generate_random_community_platform_admin_feature_flags_environments_create(
      adminConnection,
      {
        body: {
          is_enabled: false,
          rollout_percentage: 0,
        } satisfies ICommunityPlatformFeatureFlagEnvironment.ICreate,
        params: { featureFlagId: featureFlag.id },
      },
    );
  typia.assert(prodEnvironment);
  // 5. Update development environment details
  const devDetailsUpdate =
    await api.functional.communityPlatform.admin.feature_flags.environments.details.patchByFeatureflagidAndEnvironmentid(
      adminConnection,
      {
        featureFlagId: featureFlag.id,
        environmentId: devEnvironment.id,
        body: {} satisfies ICommunityPlatformFeatureFlagEnvironmentDetail.IUpdate,
      },
    );
  typia.assert(devDetailsUpdate);
  // 6. Update production environment details
  const prodDetailsUpdate =
    await api.functional.communityPlatform.admin.feature_flags.environments.details.patchByFeatureflagidAndEnvironmentid(
      adminConnection,
      {
        featureFlagId: featureFlag.id,
        environmentId: prodEnvironment.id,
        body: {} satisfies ICommunityPlatformFeatureFlagEnvironmentDetail.IUpdate,
      },
    );
  typia.assert(prodDetailsUpdate);
  // 7. Validate isolation and integrity
  TestValidator.equals(
    "feature flag ID consistent across environments",
    devDetailsUpdate.featureFlag.id,
    prodDetailsUpdate.featureFlag.id,
  );
  TestValidator.equals(
    "feature flag name consistent",
    devDetailsUpdate.featureFlag.name,
    prodDetailsUpdate.featureFlag.name,
  );
  TestValidator.equals(
    "feature flag type consistent",
    devDetailsUpdate.featureFlag.flag_type,
    prodDetailsUpdate.featureFlag.flag_type,
  );
  TestValidator.equals(
    "development environment ID matches",
    devDetailsUpdate.environment.id,
    devEnvironment.id,
  );
  TestValidator.equals(
    "production environment ID matches",
    prodDetailsUpdate.environment.id,
    prodEnvironment.id,
  );
  TestValidator.predicate(
    "development environment is enabled",
    devDetailsUpdate.environment.is_enabled === true,
  );
  TestValidator.predicate(
    "production environment is disabled",
    prodDetailsUpdate.environment.is_enabled === false,
  );
  TestValidator.equals(
    "development environment rollout percentage",
    devDetailsUpdate.environment.rollout_percentage,
    50,
  );
  TestValidator.equals(
    "production environment rollout percentage",
    prodDetailsUpdate.environment.rollout_percentage,
    0,
  );
  // 8. Verify timestamps
  TestValidator.predicate(
    "development details has created_at timestamp",
    typeof devDetailsUpdate.created_at === "string" &&
      devDetailsUpdate.created_at.length > 0,
  );
  TestValidator.predicate(
    "production details has created_at timestamp",
    typeof prodDetailsUpdate.created_at === "string" &&
      prodDetailsUpdate.created_at.length > 0,
  );
  TestValidator.predicate(
    "development details has updated_at timestamp",
    typeof devDetailsUpdate.updated_at === "string" &&
      devDetailsUpdate.updated_at.length > 0,
  );
  TestValidator.predicate(
    "production details has updated_at timestamp",
    typeof prodDetailsUpdate.updated_at === "string" &&
      prodDetailsUpdate.updated_at.length > 0,
  );
  // 9. Validate environment independence
  TestValidator.notEquals(
    "environment IDs are different",
    devEnvironment.id,
    prodEnvironment.id,
  );
  TestValidator.notEquals(
    "environment details IDs are different",
    devDetailsUpdate.id,
    prodDetailsUpdate.id,
  );
}
