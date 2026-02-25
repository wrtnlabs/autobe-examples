import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlag";
import type { ICommunityPlatformFeatureFlagEnvironment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlagEnvironment";
import type { ICommunityPlatformFeatureFlagEnvironmentDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlagEnvironmentDetail";
import type { ICommunityPlatformFeatureFlagEnvironmentDetailConfigurationOverride } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlagEnvironmentDetailConfigurationOverride";
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
import { generate_random_community_platform_admin_feature_flags_environments_details_configuration_overrides_create } from "../../../generate/generate_random_community_platform_admin_feature_flags_environments_details_configuration_overrides_create";
import { generate_random_community_platform_admin_feature_flags_environments_details_create } from "../../../generate/generate_random_community_platform_admin_feature_flags_environments_details_create";
import { prepare_random_community_platform_feature_flag } from "../../../prepare/prepare_random_community_platform_feature_flag";
import { prepare_random_community_platform_feature_flag_environment } from "../../../prepare/prepare_random_community_platform_feature_flag_environment";
import { prepare_random_community_platform_feature_flag_environment_detail } from "../../../prepare/prepare_random_community_platform_feature_flag_environment_detail";
import { prepare_random_community_platform_feature_flag_environment_detail_configuration_override } from "../../../prepare/prepare_random_community_platform_feature_flag_environment_detail_configuration_override";

/**
 * Test feature flag configuration override deletion hierarchy validation.
 * Validates that parent entities must exist before attempting deletion.
 */
export async function test_api_feature_flag_configuration_override_hierarchy_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // 2. Create feature flag hierarchy
  const featureFlag =
    await generate_random_community_platform_admin_feature_flags_create(
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
  const environment =
    await generate_random_community_platform_admin_feature_flags_environments_create(
      adminConnection,
      {
        body: {
          is_enabled: true,
          rollout_percentage: 100,
        } satisfies ICommunityPlatformFeatureFlagEnvironment.ICreate,
        params: { featureFlagId: featureFlag.id },
      },
    );
  typia.assert(environment);
  const detail =
    await generate_random_community_platform_admin_feature_flags_environments_details_create(
      adminConnection,
      {
        body: {} satisfies ICommunityPlatformFeatureFlagEnvironmentDetail.ICreate,
        params: {
          featureFlagId: featureFlag.id,
          environmentId: environment.id,
        },
      },
    );
  typia.assert(detail);
  const configurationOverride =
    await generate_random_community_platform_admin_feature_flags_environments_details_configuration_overrides_create(
      adminConnection,
      {
        body: {
          config_key: "enabled",
          config_value: "true",
        } satisfies ICommunityPlatformFeatureFlagEnvironmentDetailConfigurationOverride.ICreate,
        params: {
          featureFlagId: featureFlag.id,
          environmentId: environment.id,
          detailId: detail.id,
        },
      },
    );
  typia.assert(configurationOverride);
  // 3. Test hierarchy validation - invalid feature flag ID
  await TestValidator.error(
    "should fail with invalid feature flag ID",
    async () => {
      await api.functional.communityPlatform.admin.feature_flags.environments.details.configuration_overrides.erase(
        adminConnection,
        {
          featureFlagId: typia.random<string & tags.Format<"uuid">>(),
          environmentId: environment.id,
          detailId: detail.id,
          overrideId: configurationOverride.id,
        },
      );
    },
  );
  // 4. Test hierarchy validation - invalid environment ID
  await TestValidator.error(
    "should fail with invalid environment ID",
    async () => {
      await api.functional.communityPlatform.admin.feature_flags.environments.details.configuration_overrides.erase(
        adminConnection,
        {
          featureFlagId: featureFlag.id,
          environmentId: typia.random<string & tags.Format<"uuid">>(),
          detailId: detail.id,
          overrideId: configurationOverride.id,
        },
      );
    },
  );
  // 5. Test hierarchy validation - invalid detail ID
  await TestValidator.error("should fail with invalid detail ID", async () => {
    await api.functional.communityPlatform.admin.feature_flags.environments.details.configuration_overrides.erase(
      adminConnection,
      {
        featureFlagId: featureFlag.id,
        environmentId: environment.id,
        detailId: typia.random<string & tags.Format<"uuid">>(),
        overrideId: configurationOverride.id,
      },
    );
  });
  // 6. Test valid deletion (should succeed)
  await api.functional.communityPlatform.admin.feature_flags.environments.details.configuration_overrides.erase(
    adminConnection,
    {
      featureFlagId: featureFlag.id,
      environmentId: environment.id,
      detailId: detail.id,
      overrideId: configurationOverride.id,
    },
  );
}
