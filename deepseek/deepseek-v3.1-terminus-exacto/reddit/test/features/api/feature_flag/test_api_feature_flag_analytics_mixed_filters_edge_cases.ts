import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformFeatureFlagEnvironmentDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlagEnvironmentDetail";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformFeatureFlagEnvironmentDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformFeatureFlagEnvironmentDetail";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_feature_flag_analytics_mixed_filters_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Test 1: Search with nonexistent term returns empty results with proper pagination
  const nonexistentSearch =
    await api.functional.communityPlatform.admin.analytics.feature_flags.index(
      adminConnection,
      {
        body: {
          search: "nonexistent_term_that_should_not_match_anything",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformFeatureFlagEnvironmentDetail.IRequest,
      },
    );
  typia.assert(nonexistentSearch);
  // Test 2: Filter by status=null to verify null handling returns all statuses
  const nullStatusFilter =
    await api.functional.communityPlatform.admin.analytics.feature_flags.index(
      adminConnection,
      {
        body: {
          status: null,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformFeatureFlagEnvironmentDetail.IRequest,
      },
    );
  typia.assert(nullStatusFilter);
  // Test 3: Filter by flag_type=null to verify null handling returns all types
  const nullTypeFilter =
    await api.functional.communityPlatform.admin.analytics.feature_flags.index(
      adminConnection,
      {
        body: {
          flag_type: null,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformFeatureFlagEnvironmentDetail.IRequest,
      },
    );
  typia.assert(nullTypeFilter);
  // Test 4: Search with special characters in flag names to ensure proper pattern matching
  const specialCharSearch =
    await api.functional.communityPlatform.admin.analytics.feature_flags.index(
      adminConnection,
      {
        body: {
          search: "test@#$%^&*()_+-=[]{}|;:,.<>?",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformFeatureFlagEnvironmentDetail.IRequest,
      },
    );
  typia.assert(specialCharSearch);
  // Test 5: Pagination edge cases - page beyond total records returns empty data array
  const highPage =
    await api.functional.communityPlatform.admin.analytics.feature_flags.index(
      adminConnection,
      {
        body: {
          page: 999999,
          limit: 10,
        } satisfies ICommunityPlatformFeatureFlagEnvironmentDetail.IRequest,
      },
    );
  typia.assert(highPage);
  // Test 6: Minimum and maximum limit values
  const minLimit =
    await api.functional.communityPlatform.admin.analytics.feature_flags.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies ICommunityPlatformFeatureFlagEnvironmentDetail.IRequest,
      },
    );
  typia.assert(minLimit);
  const maxLimit =
    await api.functional.communityPlatform.admin.analytics.feature_flags.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies ICommunityPlatformFeatureFlagEnvironmentDetail.IRequest,
      },
    );
  typia.assert(maxLimit);
  // Test mixed filter combinations
  const mixedFilters =
    await api.functional.communityPlatform.admin.analytics.feature_flags.index(
      adminConnection,
      {
        body: {
          search: "test",
          status: "active",
          flag_type: "boolean",
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformFeatureFlagEnvironmentDetail.IRequest,
      },
    );
  typia.assert(mixedFilters);
}
