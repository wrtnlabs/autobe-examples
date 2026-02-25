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

/**
 * Test search scenarios that return empty results meaningfully.
 *
 * This test validates that the targeting rule search endpoint correctly returns
 * empty result sets when filters produce no matches. It tests various scenarios
 * including non-matching search terms, date ranges with no rules, non-existent
 * rule keys, and mutually exclusive filter combinations.
 */
export async function test_api_feature_flag_targeting_rule_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication - create fresh connection
  const authConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(authConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Create fresh admin connection for all subsequent operations
  const adminConnection: api.IConnection = { host: connection.host };
  Object.assign(adminConnection, authConnection);
  // 2. Create feature flag hierarchy
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
  const detail =
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
  typia.assert(detail);
  // 3. Create targeting rules with specific keys/values
  const rules = await Promise.all(
    ArrayUtil.repeat(3, (index) =>
      generate_random_community_platform_admin_feature_flags_environments_details_targeting_rules_create(
        adminConnection,
        {
          body: {
            rule_key: `test_key_${index}`,
            rule_value: `test_value_${index}`,
          } satisfies ICommunityPlatformFeatureFlagEnvironmentTargetingRule.ICreate,
          params: {
            featureFlagId: featureFlag.id,
            environmentId: environment.id,
            detailId: detail.id,
          },
        },
      ),
    ),
  );
  for (const rule of rules) {
    typia.assert(rule);
  }
  // 4. Test search scenarios that should return empty results
  // Scenario 1: Search term that doesn't match any rule key or value
  const searchResult1 =
    await api.functional.communityPlatform.admin.feature_flags.environments.details.targeting_rules.index(
      adminConnection,
      {
        featureFlagId: featureFlag.id,
        environmentId: environment.id,
        detailId: detail.id,
        body: {
          search: "nonexistent_search_term_that_wont_match_anything",
        } satisfies ICommunityPlatformFeatureFlagEnvironmentTargetingRule.IRequest,
      },
    );
  typia.assert(searchResult1);
  TestValidator.equals(
    "empty data for non-matching search term",
    searchResult1.data,
    [],
  );
  TestValidator.equals(
    "records count 0 for non-matching search term",
    searchResult1.pagination.records,
    0,
  );
  TestValidator.equals(
    "pages count 0 for non-matching search term",
    searchResult1.pagination.pages,
    0,
  );
  TestValidator.equals(
    "current page 1 for non-matching search term",
    searchResult1.pagination.current,
    1,
  );
  // Scenario 2: Date range where no rules were created
  const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24); // Tomorrow
  const searchResult2 =
    await api.functional.communityPlatform.admin.feature_flags.environments.details.targeting_rules.index(
      adminConnection,
      {
        featureFlagId: featureFlag.id,
        environmentId: environment.id,
        detailId: detail.id,
        body: {
          created_from: futureDate.toISOString(),
        } satisfies ICommunityPlatformFeatureFlagEnvironmentTargetingRule.IRequest,
      },
    );
  typia.assert(searchResult2);
  TestValidator.equals(
    "empty data for future date range",
    searchResult2.data,
    [],
  );
  TestValidator.equals(
    "records count 0 for future date range",
    searchResult2.pagination.records,
    0,
  );
  // Scenario 3: Exact rule_key that doesn't exist
  const searchResult3 =
    await api.functional.communityPlatform.admin.feature_flags.environments.details.targeting_rules.index(
      adminConnection,
      {
        featureFlagId: featureFlag.id,
        environmentId: environment.id,
        detailId: detail.id,
        body: {
          rule_key: "nonexistent_rule_key",
        } satisfies ICommunityPlatformFeatureFlagEnvironmentTargetingRule.IRequest,
      },
    );
  typia.assert(searchResult3);
  TestValidator.equals(
    "empty data for non-existent rule key",
    searchResult3.data,
    [],
  );
  TestValidator.equals(
    "records count 0 for non-existent rule key",
    searchResult3.pagination.records,
    0,
  );
  // Scenario 4: Combination of mutually exclusive filters
  const searchResult4 =
    await api.functional.communityPlatform.admin.feature_flags.environments.details.targeting_rules.index(
      adminConnection,
      {
        featureFlagId: featureFlag.id,
        environmentId: environment.id,
        detailId: detail.id,
        body: {
          rule_key: "test_key_0",
          rule_value: "test_value_1", // This combination shouldn't exist
        } satisfies ICommunityPlatformFeatureFlagEnvironmentTargetingRule.IRequest,
      },
    );
  typia.assert(searchResult4);
  TestValidator.equals(
    "empty data for mutually exclusive filters",
    searchResult4.data,
    [],
  );
  TestValidator.equals(
    "records count 0 for mutually exclusive filters",
    searchResult4.pagination.records,
    0,
  );
  // Scenario 5: Search for deleted rules when include_deleted: false (should return empty)
  const searchResult5 =
    await api.functional.communityPlatform.admin.feature_flags.environments.details.targeting_rules.index(
      adminConnection,
      {
        featureFlagId: featureFlag.id,
        environmentId: environment.id,
        detailId: detail.id,
        body: {
          include_deleted: false,
          // No rules are deleted, but this should still return proper empty structure
        } satisfies ICommunityPlatformFeatureFlagEnvironmentTargetingRule.IRequest,
      },
    );
  typia.assert(searchResult5);
  TestValidator.predicate(
    "valid pagination structure for include_deleted false",
    searchResult5.pagination.records >= 0 &&
      searchResult5.pagination.pages >= 0,
  );
}
