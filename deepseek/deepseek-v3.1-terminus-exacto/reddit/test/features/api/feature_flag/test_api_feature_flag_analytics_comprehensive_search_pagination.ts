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

export async function test_api_feature_flag_analytics_comprehensive_search_pagination(
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
  // Note: Since we cannot create feature flag environment details through available APIs,
  // we'll test the analytics endpoint with various filtering combinations that should
  // work regardless of the actual data present in the database
  // Test 1: Empty search returning all flags with proper pagination metadata
  const emptySearchResponse =
    await api.functional.communityPlatform.admin.analytics.feature_flags.index(
      adminConnection,
      {
        body: {} satisfies ICommunityPlatformFeatureFlagEnvironmentDetail.IRequest,
      },
    );
  typia.assert(emptySearchResponse);
  TestValidator.predicate(
    "pagination metadata exists",
    emptySearchResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "data array exists",
    Array.isArray(emptySearchResponse.data),
  );
  // Test 2: Search with generic term (should handle gracefully even if no matches)
  const searchResponse =
    await api.functional.communityPlatform.admin.analytics.feature_flags.index(
      adminConnection,
      {
        body: {
          search: "flag",
        } satisfies ICommunityPlatformFeatureFlagEnvironmentDetail.IRequest,
      },
    );
  typia.assert(searchResponse);
  // Test 3: Filter by status (using valid status values from the domain)
  const statusFilterResponse =
    await api.functional.communityPlatform.admin.analytics.feature_flags.index(
      adminConnection,
      {
        body: {
          status: "active",
        } satisfies ICommunityPlatformFeatureFlagEnvironmentDetail.IRequest,
      },
    );
  typia.assert(statusFilterResponse);
  // Test 4: Filter by flag_type (using valid type values from the domain)
  const typeFilterResponse =
    await api.functional.communityPlatform.admin.analytics.feature_flags.index(
      adminConnection,
      {
        body: {
          flag_type: "boolean",
        } satisfies ICommunityPlatformFeatureFlagEnvironmentDetail.IRequest,
      },
    );
  typia.assert(typeFilterResponse);
  // Test 5: Combined filters with date range
  const combinedFilterResponse =
    await api.functional.communityPlatform.admin.analytics.feature_flags.index(
      adminConnection,
      {
        body: {
          search: "analytics",
          status: "active",
          flag_type: "percentage",
          created_at_start: new Date(
            Date.now() - 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          created_at_end: new Date().toISOString(),
        } satisfies ICommunityPlatformFeatureFlagEnvironmentDetail.IRequest,
      },
    );
  typia.assert(combinedFilterResponse);
  // Test 6: Different pagination parameters
  const paginationResponse =
    await api.functional.communityPlatform.admin.analytics.feature_flags.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformFeatureFlagEnvironmentDetail.IRequest,
      },
    );
  typia.assert(paginationResponse);
  TestValidator.equals("page number", paginationResponse.pagination.current, 1);
  TestValidator.equals("limit", paginationResponse.pagination.limit, 10);
  // Test pagination with different parameters
  const paginationResponse2 =
    await api.functional.communityPlatform.admin.analytics.feature_flags.index(
      adminConnection,
      {
        body: {
          page: 2,
          limit: 5,
        } satisfies ICommunityPlatformFeatureFlagEnvironmentDetail.IRequest,
      },
    );
  typia.assert(paginationResponse2);
  TestValidator.equals(
    "page number",
    paginationResponse2.pagination.current,
    2,
  );
  TestValidator.equals("limit", paginationResponse2.pagination.limit, 5);
  // Test edge case: very small limit
  const smallLimitResponse =
    await api.functional.communityPlatform.admin.analytics.feature_flags.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies ICommunityPlatformFeatureFlagEnvironmentDetail.IRequest,
      },
    );
  typia.assert(smallLimitResponse);
  TestValidator.equals("small limit", smallLimitResponse.pagination.limit, 1);
}
