import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlag";
import type { ICommunityPlatformFeatureFlagEnvironment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlagEnvironment";
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
import { generate_random_community_platform_admin_feature_flags_environments_targeting_rules_create } from "../../../generate/generate_random_community_platform_admin_feature_flags_environments_targeting_rules_create";
import { prepare_random_community_platform_feature_flag } from "../../../prepare/prepare_random_community_platform_feature_flag";
import { prepare_random_community_platform_feature_flag_environment } from "../../../prepare/prepare_random_community_platform_feature_flag_environment";
import { prepare_random_community_platform_feature_flag_environment_targeting_rule } from "../../../prepare/prepare_random_community_platform_feature_flag_environment_targeting_rule";

export async function test_api_feature_flag_environment_targeting_rules_search_paginated(
  connection: api.IConnection,
): Promise<void> {
  // Setup admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: "Test Admin",
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Create feature flag
  const featureFlag =
    await generate_random_community_platform_admin_feature_flags_create(
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
  // Create feature flag environment
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
  // Create multiple targeting rules with different keys/values
  const ruleData = [
    { rule_key: "user_role", rule_value: "admin" },
    { rule_key: "user_role", rule_value: "moderator" },
    { rule_key: "geo_location", rule_value: "US" },
    { rule_key: "geo_location", rule_value: "EU" },
    { rule_key: "karma_threshold", rule_value: "100" },
    { rule_key: "account_age", rule_value: "30" },
    { rule_key: "subscription", rule_value: "premium" },
    { rule_key: "subscription", rule_value: "basic" },
  ] as const;
  const createdRules: ICommunityPlatformFeatureFlagEnvironmentTargetingRule[] =
    [];
  for (const rule of ruleData) {
    const targetingRule =
      await generate_random_community_platform_admin_feature_flags_environments_targeting_rules_create(
        adminConnection,
        {
          params: {
            featureFlagId: featureFlag.id,
            environmentId: environment.id,
          },
          body: rule satisfies ICommunityPlatformFeatureFlagEnvironmentTargetingRule.ICreate,
        },
      );
    typia.assert(targetingRule);
    createdRules.push(targetingRule);
    // Add small delay to ensure distinct timestamps
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  // Wait for all rules to be created before searching
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Test 1: Search with pattern matching
  const searchResults =
    await api.functional.communityPlatform.admin.feature_flags.environments.targeting_rules.index(
      adminConnection,
      {
        featureFlagId: featureFlag.id,
        environmentId: environment.id,
        body: {
          search: "user",
        } satisfies ICommunityPlatformFeatureFlagEnvironmentTargetingRule.IRequest,
      },
    );
  typia.assert(searchResults);
  // Should find rules with 'user' in key or value
  const userRules = createdRules.filter(
    (rule) =>
      rule.rule_key.includes("user") || rule.rule_value.includes("user"),
  );
  TestValidator.equals(
    "search pattern matching",
    searchResults.data.length,
    userRules.length,
  );
  // Test 2: Exact rule_key filter
  const keyFilterResults =
    await api.functional.communityPlatform.admin.feature_flags.environments.targeting_rules.index(
      adminConnection,
      {
        featureFlagId: featureFlag.id,
        environmentId: environment.id,
        body: {
          rule_key: "geo_location",
        } satisfies ICommunityPlatformFeatureFlagEnvironmentTargetingRule.IRequest,
      },
    );
  typia.assert(keyFilterResults);
  const geoLocationRules = createdRules.filter(
    (rule) => rule.rule_key === "geo_location",
  );
  TestValidator.equals(
    "exact rule_key filter",
    keyFilterResults.data.length,
    geoLocationRules.length,
  );
  // Test 3: Exact rule_value filter
  const valueFilterResults =
    await api.functional.communityPlatform.admin.feature_flags.environments.targeting_rules.index(
      adminConnection,
      {
        featureFlagId: featureFlag.id,
        environmentId: environment.id,
        body: {
          rule_value: "admin",
        } satisfies ICommunityPlatformFeatureFlagEnvironmentTargetingRule.IRequest,
      },
    );
  typia.assert(valueFilterResults);
  const adminValueRules = createdRules.filter(
    (rule) => rule.rule_value === "admin",
  );
  TestValidator.equals(
    "exact rule_value filter",
    valueFilterResults.data.length,
    adminValueRules.length,
  );
  // Test 4: Pagination with page 1, limit 3
  const page1Results =
    await api.functional.communityPlatform.admin.feature_flags.environments.targeting_rules.index(
      adminConnection,
      {
        featureFlagId: featureFlag.id,
        environmentId: environment.id,
        body: {
          page: 1,
          limit: 3,
        } satisfies ICommunityPlatformFeatureFlagEnvironmentTargetingRule.IRequest,
      },
    );
  typia.assert(page1Results);
  TestValidator.equals("page 1 limit", page1Results.pagination.limit, 3);
  TestValidator.equals(
    "page 1 current page",
    page1Results.pagination.current,
    1,
  );
  TestValidator.equals("page 1 data length", page1Results.data.length, 3);
  // Test 5: Pagination with page 2, limit 3
  const page2Results =
    await api.functional.communityPlatform.admin.feature_flags.environments.targeting_rules.index(
      adminConnection,
      {
        featureFlagId: featureFlag.id,
        environmentId: environment.id,
        body: {
          page: 2,
          limit: 3,
        } satisfies ICommunityPlatformFeatureFlagEnvironmentTargetingRule.IRequest,
      },
    );
  typia.assert(page2Results);
  TestValidator.equals("page 2 limit", page2Results.pagination.limit, 3);
  TestValidator.equals(
    "page 2 current page",
    page2Results.pagination.current,
    2,
  );
  TestValidator.predicate(
    "page 2 has expected data length",
    page2Results.data.length <= 3 && page2Results.data.length > 0,
  );
  // Verify pagination metadata consistency
  TestValidator.equals(
    "total records consistent",
    page1Results.pagination.records,
    page2Results.pagination.records,
  );
  TestValidator.equals(
    "total pages consistent",
    page1Results.pagination.pages,
    page2Results.pagination.pages,
  );
  // Verify data integrity - no duplicates between pages
  const page1Ids = new Set(page1Results.data.map((rule) => rule.id));
  const page2Ids = new Set(page2Results.data.map((rule) => rule.id));
  const intersection = [...page1Ids].filter((id) => page2Ids.has(id));
  TestValidator.equals(
    "no duplicate rules between pages",
    intersection.length,
    0,
  );
  // Test 6: Verify summary fields exist
  const allResults =
    await api.functional.communityPlatform.admin.feature_flags.environments.targeting_rules.index(
      adminConnection,
      {
        featureFlagId: featureFlag.id,
        environmentId: environment.id,
        body: {
          limit: 100,
        } satisfies ICommunityPlatformFeatureFlagEnvironmentTargetingRule.IRequest,
      },
    );
  typia.assert(allResults);
  // Verify each rule summary has required fields
  for (const rule of allResults.data) {
    TestValidator.predicate(
      "rule has id",
      typeof rule.id === "string" && rule.id.length > 0,
    );
    TestValidator.predicate(
      "rule has rule_key",
      typeof rule.rule_key === "string" && rule.rule_key.length > 0,
    );
    TestValidator.predicate(
      "rule has rule_value",
      typeof rule.rule_value === "string" && rule.rule_value.length > 0,
    );
    TestValidator.predicate(
      "rule has created_at",
      typeof rule.created_at === "string" && rule.created_at.length > 0,
    );
  }
  // Test 7: Date range filtering
  const firstRule = createdRules[0];
  const lastRule = createdRules[createdRules.length - 1];
  const dateFilterResults =
    await api.functional.communityPlatform.admin.feature_flags.environments.targeting_rules.index(
      adminConnection,
      {
        featureFlagId: featureFlag.id,
        environmentId: environment.id,
        body: {
          created_from: firstRule.created_at,
          created_to: lastRule.created_at,
        } satisfies ICommunityPlatformFeatureFlagEnvironmentTargetingRule.IRequest,
      },
    );
  typia.assert(dateFilterResults);
  TestValidator.predicate(
    "date range returns expected results",
    dateFilterResults.data.length >= createdRules.length,
  );
}
