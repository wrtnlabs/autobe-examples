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

export async function test_api_feature_flag_environment_detail_scoping_validation(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Create first feature flag
  const featureFlag1 =
    await generate_random_community_platform_admin_feature_flags_create(
      adminConnection,
      {
        body: {
          name: "test-flag-1" + RandomGenerator.alphaNumeric(8),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          flag_type: "boolean",
          status: "active",
          boolean_value: true,
        } satisfies ICommunityPlatformFeatureFlag.ICreate,
      },
    );
  typia.assert(featureFlag1);
  // Create second feature flag
  const featureFlag2 =
    await generate_random_community_platform_admin_feature_flags_create(
      adminConnection,
      {
        body: {
          name: "test-flag-2" + RandomGenerator.alphaNumeric(8),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          flag_type: "percentage",
          status: "active",
          percentage_value: 50,
        } satisfies ICommunityPlatformFeatureFlag.ICreate,
      },
    );
  typia.assert(featureFlag2);
  // Create environment for first feature flag
  const environment1 =
    await generate_random_community_platform_admin_feature_flags_environments_create(
      adminConnection,
      {
        body: {
          is_enabled: true,
          rollout_percentage: 100,
        } satisfies ICommunityPlatformFeatureFlagEnvironment.ICreate,
        params: { featureFlagId: featureFlag1.id },
      },
    );
  typia.assert(environment1);
  // Create environment for second feature flag
  const environment2 =
    await generate_random_community_platform_admin_feature_flags_environments_create(
      adminConnection,
      {
        body: {
          is_enabled: false,
          rollout_percentage: 50,
        } satisfies ICommunityPlatformFeatureFlagEnvironment.ICreate,
        params: { featureFlagId: featureFlag2.id },
      },
    );
  typia.assert(environment2);
  // Create detail configuration for first environment
  const detail1 =
    await generate_random_community_platform_admin_feature_flags_environments_details_create(
      adminConnection,
      {
        body: {} satisfies ICommunityPlatformFeatureFlagEnvironmentDetail.ICreate,
        params: {
          featureFlagId: featureFlag1.id,
          environmentId: environment1.id,
        },
      },
    );
  typia.assert(detail1);
  // Create detail configuration for second environment
  const detail2 =
    await generate_random_community_platform_admin_feature_flags_environments_details_create(
      adminConnection,
      {
        body: {} satisfies ICommunityPlatformFeatureFlagEnvironmentDetail.ICreate,
        params: {
          featureFlagId: featureFlag2.id,
          environmentId: environment2.id,
        },
      },
    );
  typia.assert(detail2);
  // Test 1: Valid request should succeed
  const validDetail =
    await api.functional.communityPlatform.admin.feature_flags.environments.details.at(
      adminConnection,
      {
        featureFlagId: featureFlag1.id,
        environmentId: environment1.id,
        detailId: detail1.id,
      },
    );
  typia.assert(validDetail);
  TestValidator.equals(
    "Retrieved detail ID matches",
    validDetail.id,
    detail1.id,
  );
  // Test 2: Detail from wrong environment (same feature flag, wrong environment)
  await TestValidator.httpError(
    "Should reject detail from wrong environment",
    [404, 400],
    async () =>
      await api.functional.communityPlatform.admin.feature_flags.environments.details.at(
        adminConnection,
        {
          featureFlagId: featureFlag1.id,
          environmentId: environment1.id,
          detailId: detail2.id, // detail2 belongs to environment2
        },
      ),
  );
  // Test 3: Environment from wrong feature flag (wrong environment scope)
  await TestValidator.httpError(
    "Should reject environment from wrong feature flag",
    [404, 400],
    async () =>
      await api.functional.communityPlatform.admin.feature_flags.environments.details.at(
        adminConnection,
        {
          featureFlagId: featureFlag1.id,
          environmentId: environment2.id, // environment2 belongs to featureFlag2
          detailId: detail1.id,
        },
      ),
  );
  // Test 4: Complete mismatch (detail from different feature flag)
  await TestValidator.httpError(
    "Should reject completely mismatched combination",
    [404, 400],
    async () =>
      await api.functional.communityPlatform.admin.feature_flags.environments.details.at(
        adminConnection,
        {
          featureFlagId: featureFlag2.id,
          environmentId: environment1.id,
          detailId: detail2.id,
        },
      ),
  );
  // Test 5: Another mismatched combination (different environment and detail)
  await TestValidator.httpError(
    "Should reject another mismatched combination",
    [404, 400],
    async () =>
      await api.functional.communityPlatform.admin.feature_flags.environments.details.at(
        adminConnection,
        {
          featureFlagId: featureFlag2.id,
          environmentId: environment1.id, // environment1 belongs to featureFlag1
          detailId: detail2.id, // detail2 belongs to environment2
        },
      ),
  );
}
