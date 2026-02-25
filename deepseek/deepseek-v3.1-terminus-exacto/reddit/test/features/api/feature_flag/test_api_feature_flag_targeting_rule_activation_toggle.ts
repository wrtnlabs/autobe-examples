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

export async function test_api_feature_flag_targeting_rule_activation_toggle(
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
          flag_type: "boolean" as const,
          status: "active" as const,
          boolean_value: true,
        } satisfies ICommunityPlatformFeatureFlag.ICreate,
      },
    );
  typia.assert(featureFlag);
  // 3. Create initial active targeting rule
  const initialRule =
    await generate_random_community_platform_admin_feature_flags_targeting_rules_create(
      adminConnection,
      {
        body: {
          rule_key: "user_role",
          rule_value: "moderator",
          rule_operator: "equals",
          description: "Target moderators for feature access",
          priority: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          is_active: true,
        } satisfies ICommunityPlatformFeatureFlagTargetingRule.ICreate,
        params: { featureFlagId: featureFlag.id },
      },
    );
  typia.assert(initialRule);
  // 4. Deactivate the targeting rule (set is_active to false)
  const deactivatedRule =
    await api.functional.communityPlatform.admin.feature_flags.targeting_rules.putByFeatureflagidAndTargetingruleid(
      adminConnection,
      {
        featureFlagId: featureFlag.id,
        targetingRuleId: initialRule.id,
        body: {
          is_active: false,
        } satisfies ICommunityPlatformFeatureFlagTargetingRule.IUpdate,
      },
    );
  typia.assert(deactivatedRule);
  // 5. Validate deactivation
  TestValidator.equals(
    "rule should be deactivated",
    deactivatedRule.is_active,
    false,
  );
  TestValidator.equals(
    "description should be preserved",
    deactivatedRule.description,
    initialRule.description,
  );
  TestValidator.equals(
    "priority should be preserved",
    deactivatedRule.priority,
    initialRule.priority,
  );
  TestValidator.equals(
    "rule_key should be preserved",
    deactivatedRule.rule_key,
    initialRule.rule_key,
  );
  TestValidator.equals(
    "rule_value should be preserved",
    deactivatedRule.rule_value,
    initialRule.rule_value,
  );
  TestValidator.equals(
    "rule_operator should be preserved",
    deactivatedRule.rule_operator,
    initialRule.rule_operator,
  );
  TestValidator.notEquals(
    "updated_at should change after deactivation",
    deactivatedRule.updated_at,
    initialRule.updated_at,
  );
  // 6. Reactivate the targeting rule (set is_active to true)
  const reactivatedRule =
    await api.functional.communityPlatform.admin.feature_flags.targeting_rules.putByFeatureflagidAndTargetingruleid(
      adminConnection,
      {
        featureFlagId: featureFlag.id,
        targetingRuleId: initialRule.id,
        body: {
          is_active: true,
        } satisfies ICommunityPlatformFeatureFlagTargetingRule.IUpdate,
      },
    );
  typia.assert(reactivatedRule);
  // 7. Validate reactivation
  TestValidator.equals(
    "rule should be reactivated",
    reactivatedRule.is_active,
    true,
  );
  TestValidator.equals(
    "description should still be preserved",
    reactivatedRule.description,
    initialRule.description,
  );
  TestValidator.equals(
    "priority should still be preserved",
    reactivatedRule.priority,
    initialRule.priority,
  );
  TestValidator.equals(
    "rule_key should still be preserved",
    reactivatedRule.rule_key,
    initialRule.rule_key,
  );
  TestValidator.equals(
    "rule_value should still be preserved",
    reactivatedRule.rule_value,
    initialRule.rule_value,
  );
  TestValidator.equals(
    "rule_operator should still be preserved",
    reactivatedRule.rule_operator,
    initialRule.rule_operator,
  );
  TestValidator.notEquals(
    "updated_at should change after reactivation",
    reactivatedRule.updated_at,
    deactivatedRule.updated_at,
  );
  // 8. Test partial update with only is_active field
  const finalDeactivation =
    await api.functional.communityPlatform.admin.feature_flags.targeting_rules.putByFeatureflagidAndTargetingruleid(
      adminConnection,
      {
        featureFlagId: featureFlag.id,
        targetingRuleId: initialRule.id,
        body: {
          is_active: false,
        } satisfies ICommunityPlatformFeatureFlagTargetingRule.IUpdate,
      },
    );
  typia.assert(finalDeactivation);
  // 9. Validate partial update preserves all other fields
  TestValidator.equals(
    "rule should be deactivated again",
    finalDeactivation.is_active,
    false,
  );
  TestValidator.equals(
    "description preserved after partial update",
    finalDeactivation.description,
    initialRule.description,
  );
  TestValidator.equals(
    "priority preserved after partial update",
    finalDeactivation.priority,
    initialRule.priority,
  );
  TestValidator.equals(
    "rule_key preserved after partial update",
    finalDeactivation.rule_key,
    initialRule.rule_key,
  );
  TestValidator.equals(
    "rule_value preserved after partial update",
    finalDeactivation.rule_value,
    initialRule.rule_value,
  );
  TestValidator.equals(
    "rule_operator preserved after partial update",
    finalDeactivation.rule_operator,
    initialRule.rule_operator,
  );
}
