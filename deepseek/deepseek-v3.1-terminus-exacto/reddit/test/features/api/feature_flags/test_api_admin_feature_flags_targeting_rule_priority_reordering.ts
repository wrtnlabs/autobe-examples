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
 * Test targeting rule priority reordering scenario where administrators adjust targeting rule
 * evaluation order by modifying priority values. Validate that lower priority numbers evaluate
 * first in complex rule combinations and that priority conflicts are properly handled.
 */
export async function test_api_admin_feature_flags_targeting_rule_priority_reordering(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
      display_name: "Test Admin",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Create a feature flag as prerequisite
  const featureFlag =
    await api.functional.communityPlatform.admin.feature_flags.create(
      adminConnection,
      {
        body: {
          name: `test_flag_${RandomGenerator.alphaNumeric(8)}`,
          description: "Test flag for targeting rule priority testing",
          flag_type: "user_specific",
          status: "active",
        } satisfies ICommunityPlatformFeatureFlag.ICreate,
      },
    );
  typia.assert(featureFlag);
  // Create multiple targeting rules with different initial priorities
  const initialRules = ArrayUtil.repeat(3, (index) => ({
    rule_key: "user_karma",
    rule_value: (index * 100).toString(),
    rule_operator: "greater_than",
    description: `Test rule ${index + 1}`,
    is_active: true,
    priority: index + 1, // Priority 1, 2, 3
  }));
  // Store created rules
  const createdRules: ICommunityPlatformFeatureFlagTargetingRule[] = [];
  for (const ruleData of initialRules) {
    const rule =
      await api.functional.communityPlatform.admin.feature_flags.targeting_rules.patchByFeatureflagid(
        adminConnection,
        {
          featureFlagId: featureFlag.id,
          body: ruleData satisfies ICommunityPlatformFeatureFlagTargetingRule.IUpdate,
        },
      );
    typia.assert(rule);
    createdRules.push(rule);
  }
  // Validate initial priority order (lower numbers should have been processed first)
  TestValidator.predicate(
    "rules should have sequential priorities",
    () =>
      createdRules[0].priority === 1 &&
      createdRules[1].priority === 2 &&
      createdRules[2].priority === 3,
  );
  // Test priority reordering: swap priorities to simulate reordering
  const ruleToUpdate = createdRules[2]; // Rule with priority 3
  // Update priority from 3 to 1 (highest priority)
  const updatedRule =
    await api.functional.communityPlatform.admin.feature_flags.targeting_rules.patchByFeatureflagid(
      adminConnection,
      {
        featureFlagId: featureFlag.id,
        body: {
          priority: 1,
        } satisfies ICommunityPlatformFeatureFlagTargetingRule.IUpdate,
      },
    );
  typia.assert(updatedRule);
  // Validate priority was updated correctly
  TestValidator.equals(
    "priority should be updated to 1",
    updatedRule.priority,
    1,
  );
  TestValidator.notEquals(
    "rule should have different priority after update",
    updatedRule.priority,
    ruleToUpdate.priority,
  );
  // Test priority conflict scenario - try to assign same priority to another rule
  const conflictingRule = createdRules[1]; // Rule with priority 2
  await TestValidator.error("should handle priority conflict", async () => {
    await api.functional.communityPlatform.admin.feature_flags.targeting_rules.patchByFeatureflagid(
      adminConnection,
      {
        featureFlagId: featureFlag.id,
        body: {
          priority: 1, // Same priority as updatedRule
        } satisfies ICommunityPlatformFeatureFlagTargetingRule.IUpdate,
      },
    );
  });
  // Test valid priority update (non-conflicting)
  const finalUpdate =
    await api.functional.communityPlatform.admin.feature_flags.targeting_rules.patchByFeatureflagid(
      adminConnection,
      {
        featureFlagId: featureFlag.id,
        body: {
          priority: 5, // Higher number (lower evaluation priority)
        } satisfies ICommunityPlatformFeatureFlagTargetingRule.IUpdate,
      },
    );
  typia.assert(finalUpdate);
  // Validate final priority state
  TestValidator.equals(
    "priority should be updated to 5",
    finalUpdate.priority,
    5,
  );
  TestValidator.predicate(
    "priority 5 should be greater than 1",
    finalUpdate.priority > 1,
  );
}
