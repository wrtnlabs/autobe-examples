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

export async function test_api_feature_flag_targeting_rule_inactive_flag_rejection(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for all operations
  const adminConnection: api.IConnection = { host: connection.host };
  // Admin registration using SDK directly since utility function may not be available
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16) satisfies string as string &
      tags.Format<"password">,
    display_name: RandomGenerator.name(),
    permissions_level: null,
  } satisfies ICommunityPlatformAdmin.IJoin;
  const admin = await api.functional.communityPlatform.auth.admin.join(
    adminConnection,
    { body: adminCredentials },
  );
  typia.assert(admin);
  // Create inactive feature flag using SDK directly
  const inactiveFlagBody = {
    name: `flag_inactive_${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    flag_type: "boolean" as const,
    status: "inactive" as const,
    boolean_value: true,
  } satisfies ICommunityPlatformFeatureFlag.ICreate;
  const inactiveFlag =
    await api.functional.communityPlatform.admin.feature_flags.create(
      adminConnection,
      { body: inactiveFlagBody },
    );
  typia.assert(inactiveFlag);
  // Attempt to create targeting rule for inactive flag - should fail
  await TestValidator.error(
    "targeting rule creation for inactive flag should fail",
    async () => {
      const targetingRuleBody = {
        rule_key: "user_role",
        rule_value: "admin",
        rule_operator: "equals",
        description: "Target admin users",
        priority: 1,
        is_active: true,
      } satisfies ICommunityPlatformFeatureFlagTargetingRule.ICreate;
      await api.functional.communityPlatform.admin.feature_flags.targeting_rules.create(
        adminConnection,
        {
          featureFlagId: inactiveFlag.id,
          body: targetingRuleBody,
        },
      );
    },
  );
  // Create archived feature flag
  const archivedFlagBody = {
    name: `flag_archived_${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    flag_type: "percentage" as const,
    status: "archived" as const,
    percentage_value: 50,
  } satisfies ICommunityPlatformFeatureFlag.ICreate;
  const archivedFlag =
    await api.functional.communityPlatform.admin.feature_flags.create(
      adminConnection,
      { body: archivedFlagBody },
    );
  typia.assert(archivedFlag);
  // Attempt to create targeting rule for archived flag - should also fail
  await TestValidator.error(
    "targeting rule creation for archived flag should fail",
    async () => {
      const targetingRuleBody = {
        rule_key: "karma_threshold",
        rule_value: "100",
        rule_operator: "greater_than",
        description: "Target high karma users",
        priority: 2,
        is_active: true,
      } satisfies ICommunityPlatformFeatureFlagTargetingRule.ICreate;
      await api.functional.communityPlatform.admin.feature_flags.targeting_rules.create(
        adminConnection,
        {
          featureFlagId: archivedFlag.id,
          body: targetingRuleBody,
        },
      );
    },
  );
  // Create active feature flag - should succeed
  const activeFlagBody = {
    name: `flag_active_${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    flag_type: "user_specific" as const,
    status: "active" as const,
  } satisfies ICommunityPlatformFeatureFlag.ICreate;
  const activeFlag =
    await api.functional.communityPlatform.admin.feature_flags.create(
      adminConnection,
      { body: activeFlagBody },
    );
  typia.assert(activeFlag);
  // Create targeting rule for active flag - should succeed
  const targetingRuleBody = {
    rule_key: "join_date",
    rule_value: "2024-01-01",
    rule_operator: "greater_than",
    description: "Target users who joined after 2024",
    priority: 3,
    is_active: true,
  } satisfies ICommunityPlatformFeatureFlagTargetingRule.ICreate;
  const targetingRule =
    await api.functional.communityPlatform.admin.feature_flags.targeting_rules.create(
      adminConnection,
      {
        featureFlagId: activeFlag.id,
        body: targetingRuleBody,
      },
    );
  typia.assert(targetingRule);
  // Validate the created targeting rule
  TestValidator.equals(
    "targeting rule matches active flag",
    targetingRule.rule_key,
    "join_date",
  );
}
