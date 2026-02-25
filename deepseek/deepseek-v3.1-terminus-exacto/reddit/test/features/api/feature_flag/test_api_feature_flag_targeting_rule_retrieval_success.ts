import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlag";
import type { ICommunityPlatformFeatureFlagEnvironment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlagEnvironment";
import type { ICommunityPlatformFeatureFlagEnvironmentDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlagEnvironmentDetail";
import type { ICommunityPlatformFeatureFlagEnvironmentTargetingRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlagEnvironmentTargetingRule";
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
import { generate_random_community_platform_admin_feature_flags_environments_details_create } from "../../../generate/generate_random_community_platform_admin_feature_flags_environments_details_create";
import { generate_random_community_platform_admin_feature_flags_environments_details_targeting_rules_create } from "../../../generate/generate_random_community_platform_admin_feature_flags_environments_details_targeting_rules_create";
import { prepare_random_community_platform_feature_flag } from "../../../prepare/prepare_random_community_platform_feature_flag";
import { prepare_random_community_platform_feature_flag_environment } from "../../../prepare/prepare_random_community_platform_feature_flag_environment";
import { prepare_random_community_platform_feature_flag_environment_detail } from "../../../prepare/prepare_random_community_platform_feature_flag_environment_detail";
import { prepare_random_community_platform_feature_flag_environment_targeting_rule } from "../../../prepare/prepare_random_community_platform_feature_flag_environment_targeting_rule";

export async function test_api_feature_flag_targeting_rule_retrieval_success(
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
  // Create feature flag with descriptive name
  const featureFlag =
    await generate_random_community_platform_admin_feature_flags_create(
      adminConnection,
      {
        body: {
          name: `feature_${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          flag_type: "boolean",
          status: "active",
          boolean_value: true,
        } satisfies ICommunityPlatformFeatureFlag.ICreate,
      },
    );
  typia.assert(featureFlag);
  // Create environment configuration
  const environment =
    await generate_random_community_platform_admin_feature_flags_environments_create(
      adminConnection,
      {
        body: {
          is_enabled: true,
          rollout_percentage: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<100>
          >(),
        } satisfies ICommunityPlatformFeatureFlagEnvironment.ICreate,
        params: { featureFlagId: featureFlag.id },
      },
    );
  typia.assert(environment);
  // Create environment detail configuration
  const environmentDetail =
    await generate_random_community_platform_admin_feature_flags_environments_details_create(
      adminConnection,
      {
        body: {} satisfies ICommunityPlatformFeatureFlagEnvironmentDetail.ICreate,
        params: {
          featureFlagId: featureFlag.id,
          environmentId: environment.id,
        },
      },
    );
  typia.assert(environmentDetail);
  // Create targeting rule with meaningful key-value pair
  const targetingRule =
    await generate_random_community_platform_admin_feature_flags_environments_details_targeting_rules_create(
      adminConnection,
      {
        body: {
          rule_key: "user_role",
          rule_value: "admin",
        } satisfies ICommunityPlatformFeatureFlagEnvironmentTargetingRule.ICreate,
        params: {
          featureFlagId: featureFlag.id,
          environmentId: environment.id,
          detailId: environmentDetail.id,
        },
      },
    );
  typia.assert(targetingRule);
  // Retrieve the targeting rule
  const retrievedTargetingRule =
    await api.functional.communityPlatform.admin.feature_flags.environments.details.targeting_rules.at(
      adminConnection,
      {
        featureFlagId: featureFlag.id,
        environmentId: environment.id,
        detailId: environmentDetail.id,
        targetingRuleId: targetingRule.id,
      },
    );
  typia.assert(retrievedTargetingRule);
  // Validate response structure and content
  TestValidator.equals(
    "targeting rule ID matches",
    retrievedTargetingRule.id,
    targetingRule.id,
  );
  TestValidator.equals(
    "rule key matches",
    retrievedTargetingRule.rule_key,
    targetingRule.rule_key,
  );
  TestValidator.equals(
    "rule value matches",
    retrievedTargetingRule.rule_value,
    targetingRule.rule_value,
  );
  TestValidator.predicate("created_at is valid ISO date", () => {
    const date = new Date(retrievedTargetingRule.created_at);
    return date instanceof Date && !isNaN(date.getTime());
  });
  TestValidator.predicate("updated_at is valid ISO date", () => {
    const date = new Date(retrievedTargetingRule.updated_at);
    return date instanceof Date && !isNaN(date.getTime());
  });
  TestValidator.equals(
    "deleted_at is null for active rule",
    retrievedTargetingRule.deleted_at,
    null,
  );
  // Validate hierarchical relationships through property access
  TestValidator.predicate("created_at is before updated_at", () => {
    const created = new Date(retrievedTargetingRule.created_at);
    const updated = new Date(retrievedTargetingRule.updated_at);
    return created <= updated;
  });
}
