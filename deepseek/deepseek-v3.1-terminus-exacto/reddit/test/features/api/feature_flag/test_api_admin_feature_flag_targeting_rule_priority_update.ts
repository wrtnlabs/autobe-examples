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

export async function test_api_admin_feature_flag_targeting_rule_priority_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
      display_name: RandomGenerator.name(),
      permissions_level: "super_admin",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // 2. Create a boolean feature flag using generation function
  const featureFlag =
    await generate_random_community_platform_admin_feature_flags_create(
      adminConnection,
      {
        body: {
          name: `test_flag_${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          flag_type: "boolean",
          status: "active",
          boolean_value: true,
        },
      },
    );
  typia.assert(featureFlag);
  // 3. Create feature flag environment using generation function
  const environment =
    await generate_random_community_platform_admin_feature_flags_environments_create(
      adminConnection,
      {
        params: { featureFlagId: featureFlag.id },
        body: {
          is_enabled: true,
          rollout_percentage: 100,
        },
      },
    );
  typia.assert(environment);
  // 4. Create three targeting rules using generation functions
  const lowPriorityRule =
    await generate_random_community_platform_admin_feature_flags_environments_targeting_rules_create(
      adminConnection,
      {
        params: {
          featureFlagId: featureFlag.id,
          environmentId: environment.id,
        },
        body: {
          rule_key: "user_role",
          rule_value: "admin",
        },
      },
    );
  typia.assert(lowPriorityRule);
  const mediumPriorityRule =
    await generate_random_community_platform_admin_feature_flags_environments_targeting_rules_create(
      adminConnection,
      {
        params: {
          featureFlagId: featureFlag.id,
          environmentId: environment.id,
        },
        body: {
          rule_key: "karma_threshold",
          rule_value: "100",
        },
      },
    );
  typia.assert(mediumPriorityRule);
  const highPriorityRule =
    await generate_random_community_platform_admin_feature_flags_environments_targeting_rules_create(
      adminConnection,
      {
        params: {
          featureFlagId: featureFlag.id,
          environmentId: environment.id,
        },
        body: {
          rule_key: "geo_location",
          rule_value: "US",
        },
      },
    );
  typia.assert(highPriorityRule);
  // 5. Update the medium priority rule to become the highest priority
  const updateResponse =
    await api.functional.communityPlatform.admin.feature_flags.environments.targeting_rules.update(
      adminConnection,
      {
        featureFlagId: featureFlag.id,
        environmentId: environment.id,
        targetingRuleId: mediumPriorityRule.id,
        body: {
          priority: 0,
          description: "Updated to highest priority",
        } satisfies ICommunityPlatformFeatureFlagTargetingRule.IUpdate,
      },
    );
  typia.assert(updateResponse);
  // 6. Validate the update was successful
  TestValidator.equals(
    "updated rule should have new priority",
    updateResponse.priority,
    0,
  );
  TestValidator.notEquals(
    "updated_at should be newer than created_at",
    updateResponse.updated_at,
    mediumPriorityRule.created_at,
  );
  TestValidator.predicate(
    "rule_key should remain unchanged",
    updateResponse.rule_key === mediumPriorityRule.rule_key,
  );
  TestValidator.predicate(
    "rule_value should remain unchanged",
    updateResponse.rule_value === mediumPriorityRule.rule_value,
  );
  TestValidator.equals(
    "id should remain the same",
    updateResponse.id,
    mediumPriorityRule.id,
  );
  // 7. Validate that priority constraints prevent invalid values
  await TestValidator.error("should reject negative priority", async () => {
    await api.functional.communityPlatform.admin.feature_flags.environments.targeting_rules.update(
      adminConnection,
      {
        featureFlagId: featureFlag.id,
        environmentId: environment.id,
        targetingRuleId: highPriorityRule.id,
        body: {
          priority: -1,
        } satisfies ICommunityPlatformFeatureFlagTargetingRule.IUpdate,
      },
    );
  });
}
