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

export async function test_api_feature_flag_targeting_rule_basic_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
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
  // 3. Create initial targeting rule
  const initialRule =
    await api.functional.communityPlatform.admin.feature_flags.targeting_rules.create(
      adminConnection,
      {
        featureFlagId: featureFlag.id,
        body: {
          rule_key: RandomGenerator.alphabets(8),
          rule_value: RandomGenerator.alphabets(6),
          rule_operator: "equals",
          description: RandomGenerator.paragraph({ sentences: 1 }),
          priority: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          is_active: true,
        } satisfies ICommunityPlatformFeatureFlagTargetingRule.ICreate,
      },
    );
  typia.assert(initialRule);
  // 4. Update targeting rule with new values
  const updateData: ICommunityPlatformFeatureFlagTargetingRule.IUpdate = {
    rule_key: RandomGenerator.alphabets(8),
    rule_value: RandomGenerator.alphabets(6),
    rule_operator: "greater_than",
    description: RandomGenerator.paragraph({ sentences: 1 }),
  };
  const updatedRule =
    await api.functional.communityPlatform.admin.feature_flags.targeting_rules.putByFeatureflagidAndTargetingruleid(
      adminConnection,
      {
        featureFlagId: featureFlag.id,
        targetingRuleId: initialRule.id,
        body: updateData,
      },
    );
  typia.assert(updatedRule);
  // 5. Validate update results
  TestValidator.equals(
    "id should remain the same",
    updatedRule.id,
    initialRule.id,
  );
  TestValidator.equals(
    "rule_key should be updated",
    updatedRule.rule_key,
    updateData.rule_key,
  );
  TestValidator.equals(
    "rule_value should be updated",
    updatedRule.rule_value,
    updateData.rule_value,
  );
  TestValidator.equals(
    "rule_operator should be updated",
    updatedRule.rule_operator,
    updateData.rule_operator,
  );
  TestValidator.equals(
    "description should be updated",
    updatedRule.description,
    updateData.description,
  );
  TestValidator.equals(
    "priority should remain unchanged",
    updatedRule.priority,
    initialRule.priority,
  );
  TestValidator.equals(
    "is_active should remain unchanged",
    updatedRule.is_active,
    initialRule.is_active,
  );
  TestValidator.notEquals(
    "updated_at should be newer",
    updatedRule.updated_at,
    initialRule.updated_at,
  );
  // 6. Test uniqueness constraint with different key-value combination
  const secondRule =
    await api.functional.communityPlatform.admin.feature_flags.targeting_rules.create(
      adminConnection,
      {
        featureFlagId: featureFlag.id,
        body: {
          rule_key: RandomGenerator.alphabets(8),
          rule_value: RandomGenerator.alphabets(6),
          rule_operator: "after",
          description: RandomGenerator.paragraph({ sentences: 1 }),
          priority: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          is_active: false,
        } satisfies ICommunityPlatformFeatureFlagTargetingRule.ICreate,
      },
    );
  typia.assert(secondRule);
  // 7. Verify uniqueness constraint allows different key-value combinations
  TestValidator.notEquals(
    "different rules should have different IDs",
    updatedRule.id,
    secondRule.id,
  );
  TestValidator.notEquals(
    "different rules should have different keys",
    updatedRule.rule_key,
    secondRule.rule_key,
  );
  TestValidator.notEquals(
    "different rules should have different values",
    updatedRule.rule_value,
    secondRule.rule_value,
  );
}
