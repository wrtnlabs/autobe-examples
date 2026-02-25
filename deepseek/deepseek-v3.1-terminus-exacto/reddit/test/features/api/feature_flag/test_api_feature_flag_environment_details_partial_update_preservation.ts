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

/**
 * Test partial update functionality of feature flag environment details with field preservation.
 * Create boolean feature flag with production environment configuration and update environment
 * details with limited configuration changes while preserving existing settings.
 */
export async function test_api_feature_flag_environment_details_partial_update_preservation(
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
    },
  });
  // Create boolean feature flag
  const featureFlag =
    await api.functional.communityPlatform.admin.feature_flags.create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          flag_type: "boolean" as const,
          status: "active" as const,
          boolean_value: true,
        },
      },
    );
  typia.assert(featureFlag);
  // Create environment configuration
  const environment =
    await api.functional.communityPlatform.admin.feature_flags.environments.create(
      adminConnection,
      {
        featureFlagId: featureFlag.id,
        body: {
          is_enabled: true,
          rollout_percentage: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<50> & tags.Maximum<100>
          >(),
        },
      },
    );
  typia.assert(environment);
  // Store original timestamps for comparison
  const originalCreatedAt = environment.created_at;
  const originalUpdatedAt = environment.updated_at;
  // Perform partial update with empty object (should preserve existing values)
  const updatedEnvironmentDetail =
    await api.functional.communityPlatform.admin.feature_flags.environments.details.patchByFeatureflagidAndEnvironmentid(
      adminConnection,
      {
        featureFlagId: featureFlag.id,
        environmentId: environment.id,
        body: {}, // Empty update to test preservation
      },
    );
  typia.assert(updatedEnvironmentDetail);
  // Validate that the update preserved existing relationships
  TestValidator.equals(
    "feature flag reference preserved",
    updatedEnvironmentDetail.featureFlag.id,
    featureFlag.id,
  );
  TestValidator.equals(
    "environment reference preserved",
    updatedEnvironmentDetail.environment.id,
    environment.id,
  );
  // Verify that environment-specific settings remain unchanged
  TestValidator.equals(
    "environment enablement preserved",
    updatedEnvironmentDetail.environment.is_enabled,
    environment.is_enabled,
  );
  TestValidator.equals(
    "rollout percentage preserved",
    updatedEnvironmentDetail.environment.rollout_percentage,
    environment.rollout_percentage,
  );
  // Validate timestamp handling
  TestValidator.equals(
    "created_at preserved",
    updatedEnvironmentDetail.created_at,
    originalCreatedAt,
  );
  TestValidator.notEquals(
    "updated_at was refreshed",
    updatedEnvironmentDetail.updated_at,
    originalUpdatedAt,
  );
  TestValidator.predicate(
    "new updated_at is valid timestamp",
    updatedEnvironmentDetail.updated_at > originalUpdatedAt,
  );
  // Verify cascade relationships are maintained
  TestValidator.notEquals(
    "new environment detail has unique ID",
    updatedEnvironmentDetail.id,
    environment.id,
  );
  TestValidator.predicate(
    "environment detail has valid feature flag summary",
    updatedEnvironmentDetail.featureFlag.name === featureFlag.name,
  );
  TestValidator.predicate(
    "environment detail has valid environment summary",
    updatedEnvironmentDetail.environment.is_enabled === environment.is_enabled,
  );
}
