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

/**
 * Test successful targeting rule update workflow where an admin authenticates,
 * creates a feature flag, and then updates its targeting rules with valid parameters.
 * The scenario validates that the updated rule configuration is properly reflected
 * in the response and that targeting strategy can be refined based on changing
 * business requirements. Verify that the updated rule retains its unique constraint
 * validation and that the audit trail through timestamps is maintained.
 */
export async function test_api_admin_feature_flags_targeting_rule_update_success(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  // Create a feature flag using the utility function
  const featureFlag =
    await generate_random_community_platform_admin_feature_flags_create(
      adminConnection,
      {
        body: {
          name: `test_flag_${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          flag_type: "user_specific",
          status: "active",
          boolean_value: null,
          percentage_value: null,
        } satisfies ICommunityPlatformFeatureFlag.ICreate,
      },
    );
  typia.assert(featureFlag);
  // Create initial targeting rule
  const initialTargetingRule =
    await api.functional.communityPlatform.admin.feature_flags.targeting_rules.patchByFeatureflagid(
      adminConnection,
      {
        featureFlagId: featureFlag.id,
        body: {
          rule_key: "user_role",
          rule_value: "moderator",
          rule_operator: "equals",
          description: "Target users with moderator role",
          is_active: true,
          priority: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
        } satisfies ICommunityPlatformFeatureFlagTargetingRule.IUpdate,
      },
    );
  typia.assert(initialTargetingRule);
  // Update the targeting rule with new configuration
  const updatedTargetingRule =
    await api.functional.communityPlatform.admin.feature_flags.targeting_rules.patchByFeatureflagid(
      adminConnection,
      {
        featureFlagId: featureFlag.id,
        body: {
          rule_key: "user_karma",
          rule_value: "1000",
          rule_operator: "greater_than",
          description: "Target users with karma above 1000",
          is_active: false,
          priority: initialTargetingRule.priority + 1,
        } satisfies ICommunityPlatformFeatureFlagTargetingRule.IUpdate,
      },
    );
  typia.assert(updatedTargetingRule);
  // Validate that the updated rule reflects the new configuration
  TestValidator.equals(
    "rule key updated",
    updatedTargetingRule.rule_key,
    "user_karma",
  );
  TestValidator.equals(
    "rule value updated",
    updatedTargetingRule.rule_value,
    "1000",
  );
  TestValidator.equals(
    "rule operator updated",
    updatedTargetingRule.rule_operator,
    "greater_than",
  );
  TestValidator.equals(
    "description updated",
    updatedTargetingRule.description,
    "Target users with karma above 1000",
  );
  TestValidator.equals(
    "is_active updated",
    updatedTargetingRule.is_active,
    false,
  );
  TestValidator.equals(
    "priority updated",
    updatedTargetingRule.priority,
    initialTargetingRule.priority + 1,
  );
  // Validate that UUID and timestamps are maintained properly
  TestValidator.equals(
    "ID remains consistent",
    updatedTargetingRule.id,
    initialTargetingRule.id,
  );
  TestValidator.predicate(
    "created_at remains unchanged",
    updatedTargetingRule.created_at === initialTargetingRule.created_at,
  );
  TestValidator.notEquals(
    "updated_at reflects modification",
    updatedTargetingRule.updated_at,
    initialTargetingRule.updated_at,
  );
  TestValidator.equals(
    "deleted_at unaffected",
    updatedTargetingRule.deleted_at,
    null,
  );
}
