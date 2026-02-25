import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlag";
import type { ICommunityPlatformFeatureFlagTargetingRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlagTargetingRule";
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
import { generate_random_community_platform_admin_feature_flags_targeting_rules_create } from "../../../generate/generate_random_community_platform_admin_feature_flags_targeting_rules_create";
import { prepare_random_community_platform_feature_flag } from "../../../prepare/prepare_random_community_platform_feature_flag";
import { prepare_random_community_platform_feature_flag_targeting_rule } from "../../../prepare/prepare_random_community_platform_feature_flag_targeting_rule";

export async function test_api_feature_flag_targeting_rule_priority_order_competition(
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
  // Create a feature flag
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
  // Create targeting rules with different priorities in non-sequential order
  const rule1 =
    await generate_random_community_platform_admin_feature_flags_targeting_rules_create(
      adminConnection,
      {
        params: { featureFlagId: featureFlag.id },
        body: {
          rule_key: "karma_threshold",
          rule_value: "100",
          rule_operator: "greater_than",
          priority: 3,
          is_active: true,
          description: "User karma must be greater than 100",
        } satisfies ICommunityPlatformFeatureFlagTargetingRule.ICreate,
      },
    );
  typia.assert(rule1);
  const rule2 =
    await generate_random_community_platform_admin_feature_flags_targeting_rules_create(
      adminConnection,
      {
        params: { featureFlagId: featureFlag.id },
        body: {
          rule_key: "join_date",
          rule_value: "2024-01-01",
          rule_operator: "greater_than",
          priority: 1,
          is_active: true,
          description: "User joined after 2024-01-01",
        } satisfies ICommunityPlatformFeatureFlagTargetingRule.ICreate,
      },
    );
  typia.assert(rule2);
  const rule3 =
    await generate_random_community_platform_admin_feature_flags_targeting_rules_create(
      adminConnection,
      {
        params: { featureFlagId: featureFlag.id },
        body: {
          rule_key: "user_role",
          rule_value: "admin",
          rule_operator: "equals",
          priority: 2,
          is_active: true,
          description: "User has admin role",
        } satisfies ICommunityPlatformFeatureFlagTargetingRule.ICreate,
      },
    );
  typia.assert(rule3);
  // Validate all rules have valid UUIDs
  TestValidator.predicate(
    "rule1 has valid UUID",
    /^[0-9a-f-]{36}$/i.test(rule1.id),
  );
  TestValidator.predicate(
    "rule2 has valid UUID",
    /^[0-9a-f-]{36}$/i.test(rule2.id),
  );
  TestValidator.predicate(
    "rule3 has valid UUID",
    /^[0-9a-f-]{36}$/i.test(rule3.id),
  );
  // Validate priority values
  TestValidator.equals("rule1 priority", rule1.priority, 3);
  TestValidator.equals("rule2 priority", rule2.priority, 1);
  TestValidator.equals("rule3 priority", rule3.priority, 2);
  // Validate rule configurations
  TestValidator.equals("rule1 key", rule1.rule_key, "karma_threshold");
  TestValidator.equals("rule1 value", rule1.rule_value, "100");
  TestValidator.equals("rule1 operator", rule1.rule_operator, "greater_than");
  TestValidator.equals("rule2 key", rule2.rule_key, "join_date");
  TestValidator.equals("rule2 value", rule2.rule_value, "2024-01-01");
  TestValidator.equals("rule2 operator", rule2.rule_operator, "greater_than");
  TestValidator.equals("rule3 key", rule3.rule_key, "user_role");
  TestValidator.equals("rule3 value", rule3.rule_value, "admin");
  TestValidator.equals("rule3 operator", rule3.rule_operator, "equals");
  // Validate active status
  TestValidator.predicate("rule1 active", rule1.is_active);
  TestValidator.predicate("rule2 active", rule2.is_active);
  TestValidator.predicate("rule3 active", rule3.is_active);
  // Validate descriptions
  TestValidator.equals(
    "rule1 description",
    rule1.description,
    "User karma must be greater than 100",
  );
  TestValidator.equals(
    "rule2 description",
    rule2.description,
    "User joined after 2024-01-01",
  );
  TestValidator.equals(
    "rule3 description",
    rule3.description,
    "User has admin role",
  );
  // Test duplicate rule prevention
  await TestValidator.error(
    "duplicate rule_key-rule_value combination",
    async () => {
      await generate_random_community_platform_admin_feature_flags_targeting_rules_create(
        adminConnection,
        {
          params: { featureFlagId: featureFlag.id },
          body: {
            rule_key: "karma_threshold",
            rule_value: "100",
            rule_operator: "greater_than",
            priority: 4,
            is_active: true,
          } satisfies ICommunityPlatformFeatureFlagTargetingRule.ICreate,
        },
      );
    },
  );
}
