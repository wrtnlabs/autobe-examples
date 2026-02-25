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

export async function test_api_feature_flag_environment_detail_authorization_enforcement(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Create feature flag using SDK directly (no utility function available)
  const featureFlag =
    await api.functional.communityPlatform.admin.feature_flags.create(
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
  // Create environment using SDK directly (no utility function available)
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
  // Create detail using SDK directly (no utility function available)
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
  // Test 1: Attempt to access without authentication
  await TestValidator.error(
    "should reject unauthenticated access",
    async () => {
      const unauthenticatedConnection: api.IConnection = {
        host: connection.host,
      };
      await api.functional.communityPlatform.admin.feature_flags.environments.details.at(
        unauthenticatedConnection,
        {
          featureFlagId: featureFlag.id,
          environmentId: environment.id,
          detailId: detail.id,
        },
      );
    },
  );
  // Test 2: Attempt to access with invalid authentication
  await TestValidator.error(
    "should reject invalid authentication",
    async () => {
      const invalidConnection: api.IConnection = { host: connection.host };
      invalidConnection.headers = { Authorization: "Bearer invalid-token" };
      await api.functional.communityPlatform.admin.feature_flags.environments.details.at(
        invalidConnection,
        {
          featureFlagId: featureFlag.id,
          environmentId: environment.id,
          detailId: detail.id,
        },
      );
    },
  );
  // Test 3: Valid admin should be able to access
  const retrievedDetail =
    await api.functional.communityPlatform.admin.feature_flags.environments.details.at(
      adminConnection,
      {
        featureFlagId: featureFlag.id,
        environmentId: environment.id,
        detailId: detail.id,
      },
    );
  typia.assert(retrievedDetail);
  // Verify the retrieved detail matches the created one
  TestValidator.equals("detail ID should match", retrievedDetail.id, detail.id);
  TestValidator.equals(
    "feature flag ID should match",
    retrievedDetail.featureFlag.id,
    featureFlag.id,
  );
  TestValidator.equals(
    "environment ID should match",
    retrievedDetail.environment.id,
    environment.id,
  );
  // Test 4: Attempt to access non-existent detail
  await TestValidator.error("should reject non-existent detail", async () => {
    await api.functional.communityPlatform.admin.feature_flags.environments.details.at(
      adminConnection,
      {
        featureFlagId: featureFlag.id,
        environmentId: environment.id,
        detailId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });
  // Test 5: Attempt to access with mismatched IDs
  await TestValidator.error(
    "should reject mismatched feature flag and environment",
    async () => {
      await api.functional.communityPlatform.admin.feature_flags.environments.details.at(
        adminConnection,
        {
          featureFlagId: typia.random<string & tags.Format<"uuid">>(),
          environmentId: typia.random<string & tags.Format<"uuid">>(),
          detailId: detail.id,
        },
      );
    },
  );
}
