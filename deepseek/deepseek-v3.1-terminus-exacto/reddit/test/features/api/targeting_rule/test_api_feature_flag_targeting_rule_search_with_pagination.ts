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

export async function test_api_feature_flag_targeting_rule_search_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication with isolated connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await api.functional.communityPlatform.auth.admin.join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        permissions_level: null,
      },
    },
  );
  typia.assert(adminAuth);
  // 2. Create feature flag hierarchy
  const featureFlag =
    await api.functional.communityPlatform.admin.feature_flags.create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          flag_type: "boolean" as const,
          status: "active" as const,
          boolean_value: true,
        },
      },
    );
  typia.assert(featureFlag);
  const environment =
    await api.functional.communityPlatform.admin.feature_flags.environments.create(
      adminConnection,
      {
        featureFlagId: featureFlag.id,
        body: {
          is_enabled: true,
          rollout_percentage: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<100>
          >(),
        },
      },
    );
  typia.assert(environment);
  const detail =
    await api.functional.communityPlatform.admin.feature_flags.environments.details.create(
      adminConnection,
      {
        featureFlagId: featureFlag.id,
        environmentId: environment.id,
        body: {},
      },
    );
  typia.assert(detail);
  // 3. Create multiple targeting rules with varied keys for search
  const ruleKeys = [
    "user_role",
    "geo_location",
    "karma_threshold",
    "subscription_tier",
  ] as const;
  const searchTerm = "user"; // Will match 'user_role'
  const createdRules = [];
  for (let i = 0; i < 8; i++) {
    const ruleKey = RandomGenerator.pick(ruleKeys);
    const ruleValue =
      ruleKey === "user_role"
        ? RandomGenerator.pick(["admin", "moderator", "user"] as const)
        : ruleKey === "geo_location"
          ? RandomGenerator.pick(["US", "EU", "JP"] as const)
          : ruleKey === "karma_threshold"
            ? typia
                .random<number & tags.Type<"int32"> & tags.Minimum<0>>()
                .toString()
            : RandomGenerator.pick(["basic", "premium", "enterprise"] as const);
    const rule =
      await api.functional.communityPlatform.admin.feature_flags.environments.details.targeting_rules.create(
        adminConnection,
        {
          featureFlagId: featureFlag.id,
          environmentId: environment.id,
          detailId: detail.id,
          body: {
            rule_key: ruleKey,
            rule_value: ruleValue,
          },
        },
      );
    typia.assert(rule);
    createdRules.push(rule);
  }
  // 4. Test search with pagination - first page
  const page1Result =
    await api.functional.communityPlatform.admin.feature_flags.environments.details.targeting_rules.index(
      adminConnection,
      {
        featureFlagId: featureFlag.id,
        environmentId: environment.id,
        detailId: detail.id,
        body: {
          search: searchTerm,
          page: 1,
          limit: 5,
        },
      },
    );
  typia.assert(page1Result);
  // Validate pagination structure
  TestValidator.equals(
    "pagination has correct structure",
    page1Result.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    page1Result.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "total records should be positive",
    page1Result.pagination.records > 0,
  );
  TestValidator.predicate(
    "page count should be positive",
    page1Result.pagination.pages > 0,
  );
  TestValidator.equals(
    "page count calculation",
    page1Result.pagination.pages,
    Math.ceil(page1Result.pagination.records / page1Result.pagination.limit),
  );
  TestValidator.predicate(
    "data array size ≤ limit",
    page1Result.data.length <= page1Result.pagination.limit,
  );
  // Validate summary fields
  for (const summary of page1Result.data) {
    typia.assert(summary);
    TestValidator.predicate(
      "summary has rule_key",
      typeof summary.rule_key === "string" && summary.rule_key.length > 0,
    );
    TestValidator.predicate(
      "summary has rule_value",
      typeof summary.rule_value === "string" && summary.rule_value.length > 0,
    );
    TestValidator.predicate(
      "summary has created_at",
      typeof summary.created_at === "string" && summary.created_at.length > 0,
    );
    TestValidator.predicate(
      "rule_key should match search term",
      summary.rule_key.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }
  // 5. Test pagination - second page
  if (page1Result.pagination.pages > 1) {
    const page2Result =
      await api.functional.communityPlatform.admin.feature_flags.environments.details.targeting_rules.index(
        adminConnection,
        {
          featureFlagId: featureFlag.id,
          environmentId: environment.id,
          detailId: detail.id,
          body: {
            search: searchTerm,
            page: 2,
            limit: 5,
          },
        },
      );
    typia.assert(page2Result);
    TestValidator.equals(
      "second page current page",
      page2Result.pagination.current,
      2,
    );
    TestValidator.equals(
      "second page same limit",
      page2Result.pagination.limit,
      5,
    );
    TestValidator.equals(
      "second page same total records",
      page2Result.pagination.records,
      page1Result.pagination.records,
    );
    TestValidator.predicate(
      "second page has different data than first page",
      page2Result.data.length > 0 &&
        page1Result.data.length > 0 &&
        page2Result.data.every(
          (item2) => !page1Result.data.some((item1) => item1.id === item2.id),
        ),
    );
  }
  // 6. Test without search term (get all)
  const allResult =
    await api.functional.communityPlatform.admin.feature_flags.environments.details.targeting_rules.index(
      adminConnection,
      {
        featureFlagId: featureFlag.id,
        environmentId: environment.id,
        detailId: detail.id,
        body: {
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(allResult);
  TestValidator.predicate(
    "all rules count should be ≥ search results count",
    allResult.pagination.records >= page1Result.pagination.records,
  );
}
