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

/**
 * Test handling of soft-deleted targeting rules with include_deleted parameter.
 * 1. Authenticate as admin
 * 2. Create feature flag and environment
 * 3. Create multiple targeting rules
 * 4. Soft delete some targeting rules
 * 5. Test search scenarios with include_deleted parameter
 */
export async function test_api_feature_flag_environment_targeting_rules_search_soft_deleted_handling(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication - create fresh connection for admin
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
  // Create fresh connection with updated authorization headers
  const authorizedAdminConnection: api.IConnection = { host: connection.host };
  authorizedAdminConnection.headers = { Authorization: admin.token.access };
  // 2. Create feature flag
  const featureFlag =
    await generate_random_community_platform_admin_feature_flags_create(
      authorizedAdminConnection,
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
  // 3. Create environment
  const environment =
    await generate_random_community_platform_admin_feature_flags_environments_create(
      authorizedAdminConnection,
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
  // 4. Create multiple targeting rules
  const targetingRules: ICommunityPlatformFeatureFlagEnvironmentTargetingRule[] =
    [];
  for (let i = 0; i < 5; i++) {
    const rule =
      await generate_random_community_platform_admin_feature_flags_environments_targeting_rules_create(
        authorizedAdminConnection,
        {
          body: {
            rule_key: `test_key_${i}`,
            rule_value: `test_value_${i}`,
          } satisfies ICommunityPlatformFeatureFlagEnvironmentTargetingRule.ICreate,
          params: {
            featureFlagId: featureFlag.id,
            environmentId: environment.id,
          },
        },
      );
    typia.assert(rule);
    targetingRules.push(rule);
  }
  // 5. Soft delete some targeting rules (first 2)
  const deletedRuleIds = targetingRules.slice(0, 2).map((rule) => rule.id);
  for (const rule of targetingRules.slice(0, 2)) {
    await api.functional.communityPlatform.admin.feature_flags.environments.targeting_rules.erase(
      authorizedAdminConnection,
      {
        featureFlagId: featureFlag.id,
        environmentId: environment.id,
        targetingRuleId: rule.id,
      },
    );
  }
  // 6. Test search scenarios
  // 6.1 Default search (include_deleted=false) - should exclude soft-deleted rules
  const defaultSearch =
    await api.functional.communityPlatform.admin.feature_flags.environments.targeting_rules.index(
      authorizedAdminConnection,
      {
        featureFlagId: featureFlag.id,
        environmentId: environment.id,
        body: {
          include_deleted: false,
          limit: 10,
          page: 1,
        } satisfies ICommunityPlatformFeatureFlagEnvironmentTargetingRule.IRequest,
      },
    );
  typia.assert(defaultSearch);
  TestValidator.equals(
    "default search should exclude soft-deleted rules",
    defaultSearch.data.length,
    3,
  );
  TestValidator.predicate(
    "pagination should be valid",
    () =>
      defaultSearch.pagination.current === 1 &&
      defaultSearch.pagination.limit === 10 &&
      defaultSearch.pagination.records === 3 &&
      defaultSearch.pagination.pages === 1,
  );
  // 6.2 Search with include_deleted=true - should return all rules
  const includeDeletedSearch =
    await api.functional.communityPlatform.admin.feature_flags.environments.targeting_rules.index(
      authorizedAdminConnection,
      {
        featureFlagId: featureFlag.id,
        environmentId: environment.id,
        body: {
          include_deleted: true,
          limit: 10,
          page: 1,
        } satisfies ICommunityPlatformFeatureFlagEnvironmentTargetingRule.IRequest,
      },
    );
  typia.assert(includeDeletedSearch);
  TestValidator.equals(
    "include_deleted=true should return all rules",
    includeDeletedSearch.data.length,
    5,
  );
  TestValidator.predicate(
    "pagination should be valid",
    () =>
      includeDeletedSearch.pagination.current === 1 &&
      includeDeletedSearch.pagination.limit === 10 &&
      includeDeletedSearch.pagination.records === 5 &&
      includeDeletedSearch.pagination.pages === 1,
  );
  // 6.3 Search with mixed filters and include_deleted parameter
  const mixedSearch =
    await api.functional.communityPlatform.admin.feature_flags.environments.targeting_rules.index(
      authorizedAdminConnection,
      {
        featureFlagId: featureFlag.id,
        environmentId: environment.id,
        body: {
          search: "test_key",
          include_deleted: true,
          limit: 10,
          page: 1,
        } satisfies ICommunityPlatformFeatureFlagEnvironmentTargetingRule.IRequest,
      },
    );
  typia.assert(mixedSearch);
  TestValidator.equals(
    "mixed search with include_deleted should work correctly",
    mixedSearch.data.length,
    5,
  );
  // 6.4 Search with specific rule_key filter
  const specificKeySearch =
    await api.functional.communityPlatform.admin.feature_flags.environments.targeting_rules.index(
      authorizedAdminConnection,
      {
        featureFlagId: featureFlag.id,
        environmentId: environment.id,
        body: {
          rule_key: "test_key_0",
          include_deleted: true,
          limit: 10,
          page: 1,
        } satisfies ICommunityPlatformFeatureFlagEnvironmentTargetingRule.IRequest,
      },
    );
  typia.assert(specificKeySearch);
  TestValidator.equals(
    "specific rule_key search should return matching rules",
    specificKeySearch.data.length,
    1,
  );
  TestValidator.equals(
    "specific rule_key search should return correct rule",
    specificKeySearch.data[0]!.rule_key,
    "test_key_0",
  );
}
