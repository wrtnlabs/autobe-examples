import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlag";
import type { ICommunityPlatformFeatureFlagEnvironment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlagEnvironment";
import type { ICommunityPlatformFeatureFlagEnvironmentDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlagEnvironmentDetail";
import type { ICommunityPlatformFeatureFlagEnvironmentTargetingRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlagEnvironmentTargetingRule";
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
import { generate_random_community_platform_admin_feature_flags_environments_details_targeting_rules_create } from "../../../generate/generate_random_community_platform_admin_feature_flags_environments_details_targeting_rules_create";
import { prepare_random_community_platform_feature_flag } from "../../../prepare/prepare_random_community_platform_feature_flag";
import { prepare_random_community_platform_feature_flag_environment } from "../../../prepare/prepare_random_community_platform_feature_flag_environment";
import { prepare_random_community_platform_feature_flag_environment_detail } from "../../../prepare/prepare_random_community_platform_feature_flag_environment_detail";
import { prepare_random_community_platform_feature_flag_environment_targeting_rule } from "../../../prepare/prepare_random_community_platform_feature_flag_environment_targeting_rule";

export async function test_api_feature_flag_targeting_rule_hierarchy_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    },
  });
  // 2. Create valid feature flag hierarchy
  const featureFlag =
    await generate_random_community_platform_admin_feature_flags_create(
      adminConnection,
      {
        body: {
          name: `feature-${RandomGenerator.alphabets(10)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          flag_type: "boolean",
          status: "active",
          boolean_value: true,
        },
      },
    );
  typia.assert(featureFlag);
  const environment =
    await generate_random_community_platform_admin_feature_flags_environments_create(
      adminConnection,
      {
        params: { featureFlagId: featureFlag.id },
        body: {
          is_enabled: true,
          rollout_percentage:
            (typia.random<
              number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<100>
            >() satisfies number as number) ?? null,
        },
      },
    );
  typia.assert(environment);
  const detail =
    await generate_random_community_platform_admin_feature_flags_environments_details_create(
      adminConnection,
      {
        params: {
          featureFlagId: featureFlag.id,
          environmentId: environment.id,
        },
        body: {},
      },
    );
  typia.assert(detail);
  const targetingRule =
    await generate_random_community_platform_admin_feature_flags_environments_details_targeting_rules_create(
      adminConnection,
      {
        params: {
          featureFlagId: featureFlag.id,
          environmentId: environment.id,
          detailId: detail.id,
        },
        body: {
          rule_key: "user_role",
          rule_value: "admin",
        } satisfies ICommunityPlatformFeatureFlagEnvironmentTargetingRule.ICreate,
      },
    );
  typia.assert(targetingRule);
  // 3. Test with invalid feature flag ID (non-existent UUID)
  const invalidFeatureFlagId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "invalid feature flag ID should return 404",
    404,
    async () =>
      await api.functional.communityPlatform.admin.feature_flags.environments.details.targeting_rules.at(
        adminConnection,
        {
          featureFlagId: invalidFeatureFlagId,
          environmentId: environment.id,
          detailId: detail.id,
          targetingRuleId: targetingRule.id,
        },
      ),
  );
  // 4. Test with wrong environment ID (different environment)
  const otherEnvironment =
    await generate_random_community_platform_admin_feature_flags_environments_create(
      adminConnection,
      {
        params: { featureFlagId: featureFlag.id },
        body: {
          is_enabled: false,
          rollout_percentage: null,
        },
      },
    );
  typia.assert(otherEnvironment);
  await TestValidator.httpError(
    "wrong environment ID should return 404",
    404,
    async () =>
      await api.functional.communityPlatform.admin.feature_flags.environments.details.targeting_rules.at(
        adminConnection,
        {
          featureFlagId: featureFlag.id,
          environmentId: otherEnvironment.id,
          detailId: detail.id,
          targetingRuleId: targetingRule.id,
        },
      ),
  );
  // 5. Test with wrong detail ID (different detail)
  const otherDetail =
    await generate_random_community_platform_admin_feature_flags_environments_details_create(
      adminConnection,
      {
        params: {
          featureFlagId: featureFlag.id,
          environmentId: environment.id,
        },
        body: {},
      },
    );
  typia.assert(otherDetail);
  await TestValidator.httpError(
    "wrong detail ID should return 404",
    404,
    async () =>
      await api.functional.communityPlatform.admin.feature_flags.environments.details.targeting_rules.at(
        adminConnection,
        {
          featureFlagId: featureFlag.id,
          environmentId: environment.id,
          detailId: otherDetail.id,
          targetingRuleId: targetingRule.id,
        },
      ),
  );
  // 6. Test with mismatched relationship (valid IDs but wrong hierarchy)
  // Create another feature flag and its hierarchy
  const otherFeatureFlag =
    await generate_random_community_platform_admin_feature_flags_create(
      adminConnection,
      {
        body: {
          name: `other-${RandomGenerator.alphabets(10)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          flag_type: "percentage",
          status: "active",
          percentage_value:
            (typia.random<
              number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<100>
            >() satisfies number as number) ?? null,
        },
      },
    );
  typia.assert(otherFeatureFlag);
  const otherFeatureFlagEnvironment =
    await generate_random_community_platform_admin_feature_flags_environments_create(
      adminConnection,
      {
        params: { featureFlagId: otherFeatureFlag.id },
        body: {
          is_enabled: true,
          rollout_percentage: null,
        },
      },
    );
  typia.assert(otherFeatureFlagEnvironment);
  const otherFeatureFlagDetail =
    await generate_random_community_platform_admin_feature_flags_environments_details_create(
      adminConnection,
      {
        params: {
          featureFlagId: otherFeatureFlag.id,
          environmentId: otherFeatureFlagEnvironment.id,
        },
        body: {},
      },
    );
  typia.assert(otherFeatureFlagDetail);
  // Attempt to use targeting rule from one hierarchy with different feature flag ID
  await TestValidator.httpError(
    "mismatched feature flag ID should return 404",
    404,
    async () =>
      await api.functional.communityPlatform.admin.feature_flags.environments.details.targeting_rules.at(
        adminConnection,
        {
          featureFlagId: otherFeatureFlag.id,
          environmentId: environment.id,
          detailId: detail.id,
          targetingRuleId: targetingRule.id,
        },
      ),
  );
  // 7. Test valid retrieval to ensure the targeting rule actually exists
  const retrievedTargetingRule =
    await api.functional.communityPlatform.admin.feature_flags.environments.details.targeting_rules.at(
      adminConnection,
      {
        featureFlagId: featureFlag.id,
        environmentId: environment.id,
        detailId: detail.id,
        targetingRuleId: targetingRule.id,
      },
    );
  typia.assert(retrievedTargetingRule);
  TestValidator.equals(
    "retrieved targeting rule matches created",
    retrievedTargetingRule.id,
    targetingRule.id,
  );
  TestValidator.equals(
    "rule key matches",
    retrievedTargetingRule.rule_key,
    "user_role",
  );
  TestValidator.equals(
    "rule value matches",
    retrievedTargetingRule.rule_value,
    "admin",
  );
}
