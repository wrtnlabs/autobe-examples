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

export async function test_api_feature_flag_targeting_rule_priority_adjustment(
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
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
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
  // 3. Create initial targeting rule with medium priority
  const initialRule =
    await generate_random_community_platform_admin_feature_flags_targeting_rules_create(
      adminConnection,
      {
        body: {
          rule_key: "user_role",
          rule_value: "moderator",
          rule_operator: "equals",
          description: "Target moderators",
          priority: 5,
          is_active: true,
        } satisfies ICommunityPlatformFeatureFlagTargetingRule.ICreate,
        params: { featureFlagId: featureFlag.id },
      },
    );
  typia.assert(initialRule);
  // 4. Test moving to higher priority (lower number - 2 is higher priority than 5)
  const higherPriorityUpdate =
    await api.functional.communityPlatform.admin.feature_flags.targeting_rules.putByFeatureflagidAndTargetingruleid(
      adminConnection,
      {
        featureFlagId: featureFlag.id,
        targetingRuleId: initialRule.id,
        body: {
          priority: 2,
        } satisfies ICommunityPlatformFeatureFlagTargetingRule.IUpdate,
      },
    );
  typia.assert(higherPriorityUpdate);
  // 5. Validate higher priority update
  TestValidator.equals(
    "priority updated to higher value",
    higherPriorityUpdate.priority,
    2,
  );
  TestValidator.equals(
    "rule_key unchanged",
    higherPriorityUpdate.rule_key,
    initialRule.rule_key,
  );
  TestValidator.equals(
    "rule_value unchanged",
    higherPriorityUpdate.rule_value,
    initialRule.rule_value,
  );
  TestValidator.equals(
    "rule_operator unchanged",
    higherPriorityUpdate.rule_operator,
    initialRule.rule_operator,
  );
  TestValidator.equals(
    "description unchanged",
    higherPriorityUpdate.description,
    initialRule.description,
  );
  TestValidator.equals(
    "is_active unchanged",
    higherPriorityUpdate.is_active,
    initialRule.is_active,
  );
  // 6. Test moving to lower priority (higher number - 8 is lower priority than 2)
  const lowerPriorityUpdate =
    await api.functional.communityPlatform.admin.feature_flags.targeting_rules.putByFeatureflagidAndTargetingruleid(
      adminConnection,
      {
        featureFlagId: featureFlag.id,
        targetingRuleId: initialRule.id,
        body: {
          priority: 8,
        } satisfies ICommunityPlatformFeatureFlagTargetingRule.IUpdate,
      },
    );
  typia.assert(lowerPriorityUpdate);
  // 7. Validate lower priority update
  TestValidator.equals(
    "priority updated to lower value",
    lowerPriorityUpdate.priority,
    8,
  );
  TestValidator.equals(
    "rule_key unchanged",
    lowerPriorityUpdate.rule_key,
    initialRule.rule_key,
  );
  TestValidator.equals(
    "rule_value unchanged",
    lowerPriorityUpdate.rule_value,
    initialRule.rule_value,
  );
  TestValidator.equals(
    "rule_operator unchanged",
    lowerPriorityUpdate.rule_operator,
    initialRule.rule_operator,
  );
  TestValidator.equals(
    "description unchanged",
    lowerPriorityUpdate.description,
    initialRule.description,
  );
  TestValidator.equals(
    "is_active unchanged",
    lowerPriorityUpdate.is_active,
    initialRule.is_active,
  );
  // 8. Test priority validation - positive integer constraint
  TestValidator.predicate(
    "priority is positive integer",
    lowerPriorityUpdate.priority > 0,
  );
  TestValidator.predicate(
    "priority is integer",
    Number.isInteger(lowerPriorityUpdate.priority),
  );
  // 9. Test partial update with only priority field
  const finalPriorityUpdate =
    await api.functional.communityPlatform.admin.feature_flags.targeting_rules.putByFeatureflagidAndTargetingruleid(
      adminConnection,
      {
        featureFlagId: featureFlag.id,
        targetingRuleId: initialRule.id,
        body: {
          priority: 3,
        } satisfies ICommunityPlatformFeatureFlagTargetingRule.IUpdate,
      },
    );
  typia.assert(finalPriorityUpdate);
  // 10. Validate final partial update
  TestValidator.equals(
    "final priority updated",
    finalPriorityUpdate.priority,
    3,
  );
  TestValidator.equals(
    "all other fields remain unchanged",
    {
      rule_key: finalPriorityUpdate.rule_key,
      rule_value: finalPriorityUpdate.rule_value,
      rule_operator: finalPriorityUpdate.rule_operator,
      description: finalPriorityUpdate.description,
      is_active: finalPriorityUpdate.is_active,
    },
    {
      rule_key: initialRule.rule_key,
      rule_value: initialRule.rule_value,
      rule_operator: initialRule.rule_operator,
      description: initialRule.description,
      is_active: initialRule.is_active,
    },
  );
  // 11. Test that priority change doesn't affect uniqueness constraints
  // Create a second rule with different key/value to test uniqueness is maintained
  const secondRule =
    await generate_random_community_platform_admin_feature_flags_targeting_rules_create(
      adminConnection,
      {
        body: {
          rule_key: "karma_threshold",
          rule_value: "100",
          rule_operator: "greater_than",
          description: "Target high karma users",
          priority: 4,
          is_active: true,
        } satisfies ICommunityPlatformFeatureFlagTargetingRule.ICreate,
        params: { featureFlagId: featureFlag.id },
      },
    );
  typia.assert(secondRule);
  // Update priority of second rule - should succeed since key/value combination is unique
  const updatedSecondRule =
    await api.functional.communityPlatform.admin.feature_flags.targeting_rules.putByFeatureflagidAndTargetingruleid(
      adminConnection,
      {
        featureFlagId: featureFlag.id,
        targetingRuleId: secondRule.id,
        body: {
          priority: 1,
        } satisfies ICommunityPlatformFeatureFlagTargetingRule.IUpdate,
      },
    );
  typia.assert(updatedSecondRule);
  TestValidator.equals(
    "second rule priority updated",
    updatedSecondRule.priority,
    1,
  );
  TestValidator.equals(
    "second rule key unchanged",
    updatedSecondRule.rule_key,
    secondRule.rule_key,
  );
  TestValidator.equals(
    "second rule value unchanged",
    updatedSecondRule.rule_value,
    secondRule.rule_value,
  );
}
