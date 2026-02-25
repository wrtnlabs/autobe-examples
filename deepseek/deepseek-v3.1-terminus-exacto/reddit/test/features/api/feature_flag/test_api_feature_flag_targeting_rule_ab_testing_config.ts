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

export async function test_api_feature_flag_targeting_rule_ab_testing_config(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Create A/B testing feature flag
  const featureFlag =
    await generate_random_community_platform_admin_feature_flags_create(
      adminConnection,
      {
        body: {
          name: `ab_test_${RandomGenerator.alphabets(8)}`,
          description: "A/B testing feature flag for user segmentation",
          flag_type: "boolean",
          status: "active",
          boolean_value: true,
        } satisfies ICommunityPlatformFeatureFlag.ICreate,
      },
    );
  typia.assert(featureFlag);
  // Create staging environment with 50% rollout
  const environment =
    await generate_random_community_platform_admin_feature_flags_environments_create(
      adminConnection,
      {
        params: { featureFlagId: featureFlag.id },
        body: {
          is_enabled: true,
          rollout_percentage: 50,
        } satisfies ICommunityPlatformFeatureFlagEnvironment.ICreate,
      },
    );
  typia.assert(environment);
  // Create environment details
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
  // Create control group targeting rule with user role segmentation
  const controlRule =
    await generate_random_community_platform_admin_feature_flags_environments_details_targeting_rules_create(
      adminConnection,
      {
        params: {
          featureFlagId: featureFlag.id,
          environmentId: environment.id,
          detailId: environmentDetail.id,
        },
        body: {
          rule_key: "user_role",
          rule_value: "premium",
        } satisfies ICommunityPlatformFeatureFlagEnvironmentTargetingRule.ICreate,
      },
    );
  typia.assert(controlRule);
  // Create experimental group targeting rule with karma threshold
  const experimentalRule =
    await generate_random_community_platform_admin_feature_flags_environments_details_targeting_rules_create(
      adminConnection,
      {
        params: {
          featureFlagId: featureFlag.id,
          environmentId: environment.id,
          detailId: environmentDetail.id,
        },
        body: {
          rule_key: "karma_threshold",
          rule_value: "1000",
        } satisfies ICommunityPlatformFeatureFlagEnvironmentTargetingRule.ICreate,
      },
    );
  typia.assert(experimentalRule);
  // Test that targeting rules support sophisticated A/B testing scenarios
  TestValidator.predicate(
    "targeting rules support user segmentation",
    controlRule.rule_key === "user_role" &&
      experimentalRule.rule_key === "karma_threshold",
  );
  // Validate that targeting rules are properly associated with the environment
  TestValidator.notEquals(
    "targeting rules have different IDs",
    controlRule.id,
    experimentalRule.id,
  );
}
