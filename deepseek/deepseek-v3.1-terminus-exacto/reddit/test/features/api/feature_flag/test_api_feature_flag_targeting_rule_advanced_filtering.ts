import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlag";
import type { ICommunityPlatformFeatureFlagEnvironment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlagEnvironment";
import type { ICommunityPlatformFeatureFlagEnvironmentDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlagEnvironmentDetail";
import type { ICommunityPlatformFeatureFlagEnvironmentTargetingRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlagEnvironmentTargetingRule";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformFeatureFlagEnvironmentTargetingRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformFeatureFlagEnvironmentTargetingRule";
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

export async function test_api_feature_flag_targeting_rule_advanced_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  // Create feature flag
  const featureFlag =
    await generate_random_community_platform_admin_feature_flags_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          flag_type: "boolean",
          status: "active",
          boolean_value: true,
        } satisfies ICommunityPlatformFeatureFlag.ICreate,
      },
    );
  typia.assert(featureFlag);
  // Create environment
  const environment =
    await generate_random_community_platform_admin_feature_flags_environments_create(
      adminConnection,
      {
        params: { featureFlagId: featureFlag.id },
        body: {
          is_enabled: true,
          rollout_percentage: 100,
        } satisfies ICommunityPlatformFeatureFlagEnvironment.ICreate,
      },
    );
  typia.assert(environment);
  // Create detail
  const detail =
    await generate_random_community_platform_admin_feature_flags_environments_details_create(
      adminConnection,
      {
        params: {
          featureFlagId: featureFlag.id,
          environmentId: environment.id,
        },
        body: {} satisfies ICommunityPlatformFeatureFlagEnvironmentDetail.ICreate,
      },
    );
  typia.assert(detail);
  // Create targeting rules with different properties
  const rules = await ArrayUtil.asyncRepeat(6, async (index) => {
    const ruleKey = ["user_role", "geo_location", "karma_threshold"][index % 3];
    const ruleValue = ["admin", "US", "100"][index % 3];
    const rule =
      await generate_random_community_platform_admin_feature_flags_environments_details_targeting_rules_create(
        adminConnection,
        {
          params: {
            featureFlagId: featureFlag.id,
            environmentId: environment.id,
            detailId: detail.id,
          },
          body: {
            rule_key: ruleKey,
            rule_value: ruleValue,
          } satisfies ICommunityPlatformFeatureFlagEnvironmentTargetingRule.ICreate,
        },
      );
    typia.assert(rule);
    return rule;
  });
  // Test 1: Filter by rule_key exact match
  const searchResult1 =
    await api.functional.communityPlatform.admin.feature_flags.environments.details.targeting_rules.index(
      adminConnection,
      {
        featureFlagId: featureFlag.id,
        environmentId: environment.id,
        detailId: detail.id,
        body: {
          rule_key: "user_role",
          include_deleted: false,
        } satisfies ICommunityPlatformFeatureFlagEnvironmentTargetingRule.IRequest,
      },
    );
  typia.assert(searchResult1);
  TestValidator.equals(
    "should return only user_role rules",
    searchResult1.data.every((rule) => rule.rule_key === "user_role"),
    true,
  );
  TestValidator.equals(
    "should have correct pagination metadata",
    searchResult1.pagination.records >= 2,
    true,
  );
  // Test 2: Filter by rule_value exact match
  const searchResult2 =
    await api.functional.communityPlatform.admin.feature_flags.environments.details.targeting_rules.index(
      adminConnection,
      {
        featureFlagId: featureFlag.id,
        environmentId: environment.id,
        detailId: detail.id,
        body: {
          rule_value: "US",
          include_deleted: false,
        } satisfies ICommunityPlatformFeatureFlagEnvironmentTargetingRule.IRequest,
      },
    );
  typia.assert(searchResult2);
  TestValidator.equals(
    "should return only US rules",
    searchResult2.data.every((rule) => rule.rule_value === "US"),
    true,
  );
  // Test 3: Pagination testing
  const searchResult3 =
    await api.functional.communityPlatform.admin.feature_flags.environments.details.targeting_rules.index(
      adminConnection,
      {
        featureFlagId: featureFlag.id,
        environmentId: environment.id,
        detailId: detail.id,
        body: {
          page: 1,
          limit: 2,
          include_deleted: false,
        } satisfies ICommunityPlatformFeatureFlagEnvironmentTargetingRule.IRequest,
      },
    );
  typia.assert(searchResult3);
  TestValidator.equals(
    "should respect pagination limit",
    searchResult3.data.length <= 2,
    true,
  );
  TestValidator.predicate(
    "should have valid pagination metadata",
    () =>
      searchResult3.pagination.current === 1 &&
      searchResult3.pagination.limit === 2,
  );
  // Test 4: Delete one rule and test include_deleted
  const ruleToDelete = rules[0];
  await api.functional.communityPlatform.admin.feature_flags.environments.details.targeting_rules.erase(
    adminConnection,
    {
      featureFlagId: featureFlag.id,
      environmentId: environment.id,
      detailId: detail.id,
      targetingRuleId: ruleToDelete.id,
    },
  );
  const searchResult4WithoutDeleted =
    await api.functional.communityPlatform.admin.feature_flags.environments.details.targeting_rules.index(
      adminConnection,
      {
        featureFlagId: featureFlag.id,
        environmentId: environment.id,
        detailId: detail.id,
        body: {
          include_deleted: false,
        } satisfies ICommunityPlatformFeatureFlagEnvironmentTargetingRule.IRequest,
      },
    );
  typia.assert(searchResult4WithoutDeleted);
  const searchResult4WithDeleted =
    await api.functional.communityPlatform.admin.feature_flags.environments.details.targeting_rules.index(
      adminConnection,
      {
        featureFlagId: featureFlag.id,
        environmentId: environment.id,
        detailId: detail.id,
        body: {
          include_deleted: true,
        } satisfies ICommunityPlatformFeatureFlagEnvironmentTargetingRule.IRequest,
      },
    );
  typia.assert(searchResult4WithDeleted);
  TestValidator.predicate(
    "should include more records when deleted items are included",
    () =>
      searchResult4WithDeleted.pagination.records >
      searchResult4WithoutDeleted.pagination.records,
  );
  // Test 5: Combined filters with search term and logical AND behavior
  const searchResult5 =
    await api.functional.communityPlatform.admin.feature_flags.environments.details.targeting_rules.index(
      adminConnection,
      {
        featureFlagId: featureFlag.id,
        environmentId: environment.id,
        detailId: detail.id,
        body: {
          search: "admin",
          rule_key: "user_role",
          include_deleted: false,
        } satisfies ICommunityPlatformFeatureFlagEnvironmentTargetingRule.IRequest,
      },
    );
  typia.assert(searchResult5);
  TestValidator.equals(
    "should return rules matching both search and rule_key",
    searchResult5.data.every(
      (rule) =>
        rule.rule_key === "user_role" && rule.rule_value.includes("admin"),
    ),
    true,
  );
  // Test 6: Empty result when no matches
  const searchResult6 =
    await api.functional.communityPlatform.admin.feature_flags.environments.details.targeting_rules.index(
      adminConnection,
      {
        featureFlagId: featureFlag.id,
        environmentId: environment.id,
        detailId: detail.id,
        body: {
          rule_key: "nonexistent_key",
          include_deleted: false,
        } satisfies ICommunityPlatformFeatureFlagEnvironmentTargetingRule.IRequest,
      },
    );
  typia.assert(searchResult6);
  TestValidator.equals(
    "should return empty result for non-existent rule key",
    searchResult6.data.length,
    0,
  );
}
