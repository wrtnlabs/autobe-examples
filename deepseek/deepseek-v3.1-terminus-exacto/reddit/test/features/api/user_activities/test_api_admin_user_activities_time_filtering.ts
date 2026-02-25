import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { ICommunityPlatformUserActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserActivity";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformUserActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformUserActivity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test user activities search with advanced time-based filtering.
 *
 * Authenticate as admin and test date range filters with various scenarios:
 * single day ranges, multi-day ranges, past week/month filters, and overlapping
 * time periods. Verify that the filtering logic works correctly with existing
 * activity data. Test edge cases like empty date ranges, reversed date ordering,
 * and boundary timestamps. Validate chronological sorting and pagination integrity
 * across time-filtered results.
 */
export async function test_api_admin_user_activities_time_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  const now = new Date();
  // Test 1: Single day range (today only)
  const todayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
    0,
  );
  const todayEnd = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999,
  );
  const todayOnlyResults =
    await api.functional.communityPlatform.admin.user_activities.index(
      adminConnection,
      {
        body: {
          start_date: todayStart.toISOString(),
          end_date: todayEnd.toISOString(),
        } satisfies ICommunityPlatformUserActivity.IRequest,
      },
    );
  typia.assert(todayOnlyResults);
  // Test 2: Multi-day range (last 7 days)
  const lastWeekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const lastWeekResults =
    await api.functional.communityPlatform.admin.user_activities.index(
      adminConnection,
      {
        body: {
          start_date: lastWeekStart.toISOString(),
          end_date: now.toISOString(),
        } satisfies ICommunityPlatformUserActivity.IRequest,
      },
    );
  typia.assert(lastWeekResults);
  // Test 3: Past month filter
  const pastMonthStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const pastMonthResults =
    await api.functional.communityPlatform.admin.user_activities.index(
      adminConnection,
      {
        body: {
          start_date: pastMonthStart.toISOString(),
          end_date: now.toISOString(),
        } satisfies ICommunityPlatformUserActivity.IRequest,
      },
    );
  typia.assert(pastMonthResults);
  // Test 4: Empty date range (should return all activities)
  const allResults =
    await api.functional.communityPlatform.admin.user_activities.index(
      adminConnection,
      {
        body: {} satisfies ICommunityPlatformUserActivity.IRequest,
      },
    );
  typia.assert(allResults);
  // Test 5: Reversed date ordering (should handle gracefully)
  const reversedResults =
    await api.functional.communityPlatform.admin.user_activities.index(
      adminConnection,
      {
        body: {
          start_date: now.toISOString(),
          end_date: lastWeekStart.toISOString(),
        } satisfies ICommunityPlatformUserActivity.IRequest,
      },
    );
  typia.assert(reversedResults);
  // Test 6: Boundary timestamps (exact match - use a recent timestamp)
  const recentTime = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago
  const boundaryResults =
    await api.functional.communityPlatform.admin.user_activities.index(
      adminConnection,
      {
        body: {
          start_date: recentTime.toISOString(),
          end_date: recentTime.toISOString(),
        } satisfies ICommunityPlatformUserActivity.IRequest,
      },
    );
  typia.assert(boundaryResults);
  // Validate pagination integrity
  TestValidator.predicate("pagination should be consistent", () => {
    return (
      allResults.pagination.records >= 0 &&
      allResults.pagination.pages >= 0 &&
      allResults.pagination.current >= 0 &&
      allResults.pagination.limit >= 0
    );
  });
  // Test pagination with time filtering
  const paginatedResults =
    await api.functional.communityPlatform.admin.user_activities.index(
      adminConnection,
      {
        body: {
          start_date: lastWeekStart.toISOString(),
          end_date: now.toISOString(),
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformUserActivity.IRequest,
      },
    );
  typia.assert(paginatedResults);
  TestValidator.equals(
    "page should be 1",
    paginatedResults.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit should be 10",
    paginatedResults.pagination.limit,
    10,
  );
  // Validate that time filtering reduces result count when appropriate
  if (allResults.pagination.records > 0) {
    TestValidator.predicate(
      "narrow time range should have fewer or equal records",
      todayOnlyResults.pagination.records <= allResults.pagination.records,
    );
  }
}
