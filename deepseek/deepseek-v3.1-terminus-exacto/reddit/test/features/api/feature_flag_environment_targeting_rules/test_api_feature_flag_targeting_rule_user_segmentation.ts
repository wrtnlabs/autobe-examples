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

/***
 * Test the creation of user segmentation targeting rules for feature flag environments.
 * This scenario validates that administrators can create targeting rules based on user
 * attributes like karma thresholds, user status, and account age. First authenticate as
 * admin, then create a feature flag with percentage rollout strategy. Create an environment
 * configuration enabling the flag with rollout percentage. Create environment details to
 * establish the relationship. Finally create targeting rules with different segmentation
 * criteria to test user-specific feature availability. Validate that the rules are correctly
 * stored with proper timestamps and that duplicates are prevented for the same rule key
 * within an environment.
 */
export async function test_api_feature_flag_targeting_rule_user_segmentation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  // Step 2: Create a percentage-based feature flag
  const featureFlag =
    await generate_random_community_platform_admin_feature_flags_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          flag_type: "percentage",
          status: "active",
          percentage_value: 50 satisfies number as number,
        } satisfies ICommunityPlatformFeatureFlag.ICreate,
      },
    );
  typia.assert(featureFlag);
  // Step 3: Create environment configuration
  const environment =
    await generate_random_community_platform_admin_feature_flags_environments_create(
      adminConnection,
      {
        body: {
          is_enabled: true,
          rollout_percentage: 75 satisfies number as number,
        } satisfies ICommunityPlatformFeatureFlagEnvironment.ICreate,
        params: { featureFlagId: featureFlag.id },
      },
    );
  typia.assert(environment);
  // Step 4: Create environment details
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
  // Step 5: Create first targeting rule - karma threshold
  const rule1Body = {
    rule_key: "karma_threshold",
    rule_value: "1000",
  } satisfies ICommunityPlatformFeatureFlagEnvironmentTargetingRule.ICreate;
  const rule1 =
    await generate_random_community_platform_admin_feature_flags_environments_details_targeting_rules_create(
      adminConnection,
      {
        body: rule1Body,
        params: {
          featureFlagId: featureFlag.id,
          environmentId: environment.id,
          detailId: detail.id,
        },
      },
    );
  typia.assert(rule1);
  TestValidator.equals("rule key matches", rule1.rule_key, "karma_threshold");
  TestValidator.equals("rule value matches", rule1.rule_value, "1000");
  TestValidator.predicate(
    "has created_at timestamp",
    () => rule1.created_at !== null,
  );
  TestValidator.predicate(
    "has updated_at timestamp",
    () => rule1.updated_at !== null,
  );
  TestValidator.equals("deleted_at is null by default", rule1.deleted_at, null);
  // Step 6: Create second targeting rule - user status
  const rule2Body = {
    rule_key: "user_status",
    rule_value: "premium",
  } satisfies ICommunityPlatformFeatureFlagEnvironmentTargetingRule.ICreate;
  const rule2 =
    await generate_random_community_platform_admin_feature_flags_environments_details_targeting_rules_create(
      adminConnection,
      {
        body: rule2Body,
        params: {
          featureFlagId: featureFlag.id,
          environmentId: environment.id,
          detailId: detail.id,
        },
      },
    );
  typia.assert(rule2);
  TestValidator.equals(
    "second rule key matches",
    rule2.rule_key,
    "user_status",
  );
  TestValidator.equals(
    "second rule value matches",
    rule2.rule_value,
    "premium",
  );
  TestValidator.notEquals(
    "different rules have different IDs",
    rule1.id,
    rule2.id,
  );
  // Step 7: Test duplicate rule key prevention
  await TestValidator.error(
    "duplicate rule key should be prevented",
    async () => {
      await generate_random_community_platform_admin_feature_flags_environments_details_targeting_rules_create(
        adminConnection,
        {
          body: {
            rule_key: "karma_threshold",
            rule_value: "2000",
          } satisfies ICommunityPlatformFeatureFlagEnvironmentTargetingRule.ICreate,
          params: {
            featureFlagId: featureFlag.id,
            environmentId: environment.id,
            detailId: detail.id,
          },
        },
      );
    },
  );
  // Step 8: Create third targeting rule - account age
  const rule3Body = {
    rule_key: "account_age_days",
    rule_value: "30",
  } satisfies ICommunityPlatformFeatureFlagEnvironmentTargetingRule.ICreate;
  const rule3 =
    await generate_random_community_platform_admin_feature_flags_environments_details_targeting_rules_create(
      adminConnection,
      {
        body: rule3Body,
        params: {
          featureFlagId: featureFlag.id,
          environmentId: environment.id,
          detailId: detail.id,
        },
      },
    );
  typia.assert(rule3);
  TestValidator.equals(
    "third rule key matches",
    rule3.rule_key,
    "account_age_days",
  );
  TestValidator.equals("third rule value matches", rule3.rule_value, "30");
  // Step 9: Validate all three rules have unique IDs
  const ruleIds = [rule1.id, rule2.id, rule3.id];
  const uniqueIds = new Set(ruleIds);
  TestValidator.equals("all rule IDs are unique", uniqueIds.size, 3);
}
