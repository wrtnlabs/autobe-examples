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
import { prepare_random_community_platform_feature_flag } from "../../../prepare/prepare_random_community_platform_feature_flag";

export async function test_api_admin_feature_flags_targeting_rule_partial_update(
  connection: api.IConnection,
): Promise<void> {
  // Setup admin connection using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Create a feature flag using generation function
  const featureFlag =
    await generate_random_community_platform_admin_feature_flags_create(
      adminConnection,
      {
        body: {
          name: "test_partial_update_flag",
          description: "Test flag for partial update functionality",
          flag_type: "boolean",
          status: "active",
          boolean_value: true,
        } satisfies ICommunityPlatformFeatureFlag.ICreate,
      },
    );
  typia.assert(featureFlag);
  // Initial targeting rule creation
  const initialUpdate: ICommunityPlatformFeatureFlagTargetingRule.IUpdate = {
    rule_key: "user_role",
    rule_value: "admin",
    rule_operator: "equals",
    description: "Initial targeting rule for admin users",
    is_active: true,
    priority: 1,
  };
  const initialRule =
    await api.functional.communityPlatform.admin.feature_flags.targeting_rules.patchByFeatureflagid(
      adminConnection,
      {
        featureFlagId: featureFlag.id,
        body: initialUpdate,
      },
    );
  typia.assert(initialRule);
  // Validate initial rule properties
  TestValidator.equals(
    "rule_key matches initial",
    initialRule.rule_key,
    "user_role",
  );
  TestValidator.equals(
    "rule_value matches initial",
    initialRule.rule_value,
    "admin",
  );
  TestValidator.equals(
    "rule_operator matches initial",
    initialRule.rule_operator,
    "equals",
  );
  TestValidator.equals(
    "description matches initial",
    initialRule.description,
    "Initial targeting rule for admin users",
  );
  TestValidator.equals(
    "is_active matches initial",
    initialRule.is_active,
    true,
  );
  TestValidator.equals("priority matches initial", initialRule.priority, 1);
  // Partial update - only modify is_active and priority, leave others unchanged
  const partialUpdate: ICommunityPlatformFeatureFlagTargetingRule.IUpdate = {
    is_active: false,
    priority: 5,
    description: "Updated description for partial update test",
  };
  const updatedRule =
    await api.functional.communityPlatform.admin.feature_flags.targeting_rules.patchByFeatureflagid(
      adminConnection,
      {
        featureFlagId: featureFlag.id,
        body: partialUpdate,
      },
    );
  typia.assert(updatedRule);
  // Validate that unchanged properties remain the same
  TestValidator.equals(
    "rule_key remains unchanged",
    updatedRule.rule_key,
    "user_role",
  );
  TestValidator.equals(
    "rule_value remains unchanged",
    updatedRule.rule_value,
    "admin",
  );
  TestValidator.equals(
    "rule_operator remains unchanged",
    updatedRule.rule_operator,
    "equals",
  );
  // Validate that updated properties have changed
  TestValidator.equals("is_active updated", updatedRule.is_active, false);
  TestValidator.equals("priority updated", updatedRule.priority, 5);
  TestValidator.equals(
    "description updated",
    updatedRule.description,
    "Updated description for partial update test",
  );
  // Test edge case: update only one property
  const singlePropertyUpdate: ICommunityPlatformFeatureFlagTargetingRule.IUpdate =
    {
      is_active: true,
    };
  const finalRule =
    await api.functional.communityPlatform.admin.feature_flags.targeting_rules.patchByFeatureflagid(
      adminConnection,
      {
        featureFlagId: featureFlag.id,
        body: singlePropertyUpdate,
      },
    );
  typia.assert(finalRule);
  // Validate single property update
  TestValidator.equals("is_active updated to true", finalRule.is_active, true);
  TestValidator.equals("priority remains unchanged", finalRule.priority, 5);
  TestValidator.equals(
    "description remains unchanged",
    finalRule.description,
    "Updated description for partial update test",
  );
  TestValidator.equals(
    "rule_key remains unchanged",
    finalRule.rule_key,
    "user_role",
  );
  TestValidator.equals(
    "rule_value remains unchanged",
    finalRule.rule_value,
    "admin",
  );
  TestValidator.equals(
    "rule_operator remains unchanged",
    finalRule.rule_operator,
    "equals",
  );
}
