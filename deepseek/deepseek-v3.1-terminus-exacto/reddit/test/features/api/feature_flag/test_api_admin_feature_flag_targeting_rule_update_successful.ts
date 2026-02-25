import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlag";
import type { ICommunityPlatformFeatureFlagEnvironment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlagEnvironment";
import type { ICommunityPlatformFeatureFlagEnvironmentTargetingRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlagEnvironmentTargetingRule";
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
import { generate_random_community_platform_admin_feature_flags_environments_create } from "../../../generate/generate_random_community_platform_admin_feature_flags_environments_create";
import { generate_random_community_platform_admin_feature_flags_environments_targeting_rules_create } from "../../../generate/generate_random_community_platform_admin_feature_flags_environments_targeting_rules_create";
import { prepare_random_community_platform_feature_flag } from "../../../prepare/prepare_random_community_platform_feature_flag";
import { prepare_random_community_platform_feature_flag_environment } from "../../../prepare/prepare_random_community_platform_feature_flag_environment";
import { prepare_random_community_platform_feature_flag_environment_targeting_rule } from "../../../prepare/prepare_random_community_platform_feature_flag_environment_targeting_rule";

/**
 * Test the complete workflow of updating an existing targeting rule with valid configuration changes.
 */
export async function test_api_admin_feature_flag_targeting_rule_update_successful(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
      display_name: "Test Admin",
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Step 2: Create feature flag
  const featureFlag =
    await generate_random_community_platform_admin_feature_flags_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          flag_type: "user_specific",
          status: "active",
          boolean_value: null,
          percentage_value: null,
        } satisfies ICommunityPlatformFeatureFlag.ICreate,
      },
    );
  typia.assert(featureFlag);
  // Step 3: Create feature flag environment
  const environment =
    await generate_random_community_platform_admin_feature_flags_environments_create(
      adminConnection,
      {
        body: {
          is_enabled: true,
          rollout_percentage: 100,
        } satisfies ICommunityPlatformFeatureFlagEnvironment.ICreate,
        params: { featureFlagId: featureFlag.id },
      },
    );
  typia.assert(environment);
  // Step 4: Create initial targeting rule
  const initialTargetingRule =
    await generate_random_community_platform_admin_feature_flags_environments_targeting_rules_create(
      adminConnection,
      {
        body: {
          rule_key: "user_role",
          rule_value: "user",
        } satisfies ICommunityPlatformFeatureFlagEnvironmentTargetingRule.ICreate,
        params: {
          featureFlagId: featureFlag.id,
          environmentId: environment.id,
        },
      },
    );
  typia.assert(initialTargetingRule);
  // Step 5: Update targeting rule with new configuration
  const updateData: ICommunityPlatformFeatureFlagTargetingRule.IUpdate = {
    rule_key: "karma_threshold",
    rule_value: "100",
    rule_operator: "greater_than",
    description: "Target users with karma greater than 100",
    is_active: true,
    priority: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
  };
  const updatedTargetingRule =
    await api.functional.communityPlatform.admin.feature_flags.environments.targeting_rules.update(
      adminConnection,
      {
        featureFlagId: featureFlag.id,
        environmentId: environment.id,
        targetingRuleId: initialTargetingRule.id,
        body: updateData,
      },
    );
  typia.assert(updatedTargetingRule);
  // Step 6: Validate response properties
  TestValidator.equals(
    "targeting rule ID remains unchanged",
    updatedTargetingRule.id,
    initialTargetingRule.id,
  );
  TestValidator.equals(
    "rule_key updated",
    updatedTargetingRule.rule_key,
    updateData.rule_key,
  );
  TestValidator.equals(
    "rule_value updated",
    updatedTargetingRule.rule_value,
    updateData.rule_value,
  );
  TestValidator.equals(
    "rule_operator updated",
    updatedTargetingRule.rule_operator,
    updateData.rule_operator,
  );
  TestValidator.equals(
    "description updated",
    updatedTargetingRule.description,
    updateData.description,
  );
  TestValidator.equals(
    "is_active updated",
    updatedTargetingRule.is_active,
    updateData.is_active,
  );
  TestValidator.equals(
    "priority updated",
    updatedTargetingRule.priority,
    updateData.priority,
  );
  // Step 7: Validate system timestamps
  TestValidator.predicate(
    "created_at preserved",
    updatedTargetingRule.created_at === initialTargetingRule.created_at,
  );
  TestValidator.notEquals(
    "updated_at changed after update",
    updatedTargetingRule.updated_at,
    initialTargetingRule.updated_at,
  );
  TestValidator.predicate(
    "deleted_at remains null",
    updatedTargetingRule.deleted_at === null,
  );
  // Step 8: Verify the updated rule remains associated with the same entities
  TestValidator.equals(
    "feature flag ID preserved",
    environment.feature_flag.id,
    featureFlag.id,
  );
}
