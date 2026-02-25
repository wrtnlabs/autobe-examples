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

export async function test_api_admin_analytics_users_date_range_filtering(
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
  // Test date range filtering with various scenarios
  const now = new Date();
  const oneDayMs = 24 * 60 * 60 * 1000;
  // Define test date ranges
  const pastWeekStart = new Date(now.getTime() - 7 * oneDayMs).toISOString();
  const pastWeekEnd = new Date(now.getTime() - oneDayMs).toISOString();
  const futureStart = new Date(now.getTime() + oneDayMs).toISOString();
  const futureEnd = new Date(now.getTime() + 7 * oneDayMs).toISOString();
  // Test 1: Valid date range (past week)
  const pastWeekResult =
    await api.functional.communityPlatform.admin.analytics.users.index(
      adminConnection,
      {
        body: {
          start_date: pastWeekStart,
          end_date: pastWeekEnd,
        } satisfies ICommunityPlatformUserActivity.IRequest,
      },
    );
  typia.assert(pastWeekResult);
  // Test 2: Empty result set (future date range)
  const futureResult =
    await api.functional.communityPlatform.admin.analytics.users.index(
      adminConnection,
      {
        body: {
          start_date: futureStart,
          end_date: futureEnd,
        } satisfies ICommunityPlatformUserActivity.IRequest,
      },
    );
  typia.assert(futureResult);
  TestValidator.equals(
    "future date range should have zero records",
    futureResult.pagination.records,
    0,
  );
  // Test 3: Single date filtering (only start_date)
  const startOnlyResult =
    await api.functional.communityPlatform.admin.analytics.users.index(
      adminConnection,
      {
        body: {
          start_date: pastWeekStart,
        } satisfies ICommunityPlatformUserActivity.IRequest,
      },
    );
  typia.assert(startOnlyResult);
  // Test 4: Single date filtering (only end_date)
  const endOnlyResult =
    await api.functional.communityPlatform.admin.analytics.users.index(
      adminConnection,
      {
        body: {
          end_date: pastWeekEnd,
        } satisfies ICommunityPlatformUserActivity.IRequest,
      },
    );
  typia.assert(endOnlyResult);
  // Test 5: Pagination with date filtering
  const paginatedResult =
    await api.functional.communityPlatform.admin.analytics.users.index(
      adminConnection,
      {
        body: {
          start_date: pastWeekStart,
          end_date: pastWeekEnd,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformUserActivity.IRequest,
      },
    );
  typia.assert(paginatedResult);
  TestValidator.predicate(
    "pagination should be valid",
    paginatedResult.pagination.current === 1 &&
      paginatedResult.pagination.limit === 10 &&
      paginatedResult.pagination.records >= 0,
  );
  // Validate that date filtering is working
  TestValidator.predicate(
    "date range filtering should return consistent results",
    pastWeekResult.pagination.records >= 0 &&
      startOnlyResult.pagination.records >= pastWeekResult.pagination.records &&
      endOnlyResult.pagination.records >= 0,
  );
}
