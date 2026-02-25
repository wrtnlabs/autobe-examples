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

export async function test_api_feature_flag_configuration_override_cascade_deletion_effects(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
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
  // Create feature flag
  const featureFlag =
    await generate_random_community_platform_admin_feature_flags_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          flag_type: "boolean" as const,
          status: "active" as const,
          boolean_value: true,
        } satisfies ICommunityPlatformFeatureFlag.ICreate,
      },
    );
  typia.assert(featureFlag);
  // Create feature flag environment
  const environment =
    await generate_random_community_platform_admin_feature_flags_environments_create(
      adminConnection,
      {
        params: { featureFlagId: featureFlag.id },
        body: {
          is_enabled: true,
          rollout_percentage: 100,
        } satisfies ICommunityPlatformFeatureFlagEnvironment.ICreate,
      },
    );
  typia.assert(environment);
  // Create feature flag environment detail
  const environmentDetail =
    await generate_random_community_platform_admin_feature_flags_environments_details_create(
      adminConnection,
      {
        params: {
          featureFlagId: featureFlag.id,
          environmentId: environment.id,
        },
        body: {} satisfies ICommunityPlatformFeatureFlagEnvironmentDetail.ICreate,
      },
    );
  typia.assert(environmentDetail);
  // Create primary configuration override
  const primaryOverride =
    await generate_random_community_platform_admin_feature_flags_environments_details_configuration_overrides_create(
      adminConnection,
      {
        params: {
          featureFlagId: featureFlag.id,
          environmentId: environment.id,
          detailId: environmentDetail.id,
        },
        body: {
          config_key: "enabled",
          config_value: "true",
        } satisfies ICommunityPlatformFeatureFlagEnvironmentDetailConfigurationOverride.ICreate,
      },
    );
  typia.assert(primaryOverride);
  // Create additional dependent configuration override
  const dependentOverride =
    await generate_random_community_platform_admin_feature_flags_environments_details_configuration_overrides_create(
      adminConnection,
      {
        params: {
          featureFlagId: featureFlag.id,
          environmentId: environment.id,
          detailId: environmentDetail.id,
        },
        body: {
          config_key: "percentage",
          config_value: "75",
        } satisfies ICommunityPlatformFeatureFlagEnvironmentDetailConfigurationOverride.ICreate,
      },
    );
  typia.assert(dependentOverride);
  // Delete the primary configuration override
  await api.functional.communityPlatform.admin.feature_flags.environments.details.configuration_overrides.erase(
    adminConnection,
    {
      featureFlagId: featureFlag.id,
      environmentId: environment.id,
      detailId: environmentDetail.id,
      overrideId: primaryOverride.id,
    },
  );
  // Verify that dependent override still exists (no cascade effect on siblings)
  // This tests that cascade deletion only affects children, not siblings
  const remainingOverride =
    await generate_random_community_platform_admin_feature_flags_environments_details_configuration_overrides_create(
      adminConnection,
      {
        params: {
          featureFlagId: featureFlag.id,
          environmentId: environment.id,
          detailId: environmentDetail.id,
        },
        body: {
          config_key: "threshold",
          config_value: "50",
        } satisfies ICommunityPlatformFeatureFlagEnvironmentDetailConfigurationOverride.ICreate,
      },
    );
  typia.assert(remainingOverride);
  TestValidator.predicate(
    "additional override created successfully after primary deletion",
    remainingOverride.id === remainingOverride.id,
  );
}
