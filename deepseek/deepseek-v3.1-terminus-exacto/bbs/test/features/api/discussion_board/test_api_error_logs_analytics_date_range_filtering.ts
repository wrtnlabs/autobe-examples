import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardErrorLog";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardErrorLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_error_logs_analytics_date_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Generate current date for reference
  const now = new Date();
  // Note: Since we cannot create error logs through the API (no creation endpoint provided),
  // we can only test the analytics endpoint with the existing data in the database.
  // This test validates that the date range filtering parameters are accepted and
  // that the API returns valid paginated results.
  // Test 1: Recent errors (last 7 days)
  const sevenDaysAgo = new Date(
    now.getTime() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const recentAnalytics =
    await api.functional.discussionBoard.superAdmin.error_logs.analytics.index(
      superAdminConnection,
      {
        body: {
          start_date: sevenDaysAgo,
          end_date: now.toISOString(),
        } satisfies IDiscussionBoardErrorLog.IRequest,
      },
    );
  typia.assert(recentAnalytics);
  // Test 2: Historical errors (last 30 days)
  const thirtyDaysAgo = new Date(
    now.getTime() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const historicalAnalytics =
    await api.functional.discussionBoard.superAdmin.error_logs.analytics.index(
      superAdminConnection,
      {
        body: {
          start_date: thirtyDaysAgo,
          end_date: now.toISOString(),
        } satisfies IDiscussionBoardErrorLog.IRequest,
      },
    );
  typia.assert(historicalAnalytics);
  // Test 3: Custom date range (last 15 days)
  const fifteenDaysAgo = new Date(
    now.getTime() - 15 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const customAnalytics =
    await api.functional.discussionBoard.superAdmin.error_logs.analytics.index(
      superAdminConnection,
      {
        body: {
          start_date: fifteenDaysAgo,
          end_date: now.toISOString(),
        } satisfies IDiscussionBoardErrorLog.IRequest,
      },
    );
  typia.assert(customAnalytics);
  // Test 4: No date range (all errors)
  const allAnalytics =
    await api.functional.discussionBoard.superAdmin.error_logs.analytics.index(
      superAdminConnection,
      {
        body: {} satisfies IDiscussionBoardErrorLog.IRequest,
      },
    );
  typia.assert(allAnalytics);
  // Validate response structure
  TestValidator.equals(
    "recent analytics has valid pagination structure",
    typeof recentAnalytics.pagination.current,
    "number",
  );
  TestValidator.predicate(
    "pagination current should be non-negative",
    recentAnalytics.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit should be non-negative",
    recentAnalytics.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    recentAnalytics.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    recentAnalytics.pagination.pages >= 0,
  );
  // Validate data array structure for each error log summary
  for (const errorLog of recentAnalytics.data) {
    TestValidator.equals(
      "error log has valid error_type",
      typeof errorLog.error_type,
      "string",
    );
    TestValidator.equals(
      "error log has valid severity",
      typeof errorLog.severity,
      "string",
    );
    TestValidator.equals(
      "error log has valid environment",
      typeof errorLog.environment,
      "string",
    );
    TestValidator.predicate(
      "error log has valid error_count",
      errorLog.error_count >= 0,
    );
    TestValidator.equals(
      "error log has valid first_occurred_at",
      typeof errorLog.first_occurred_at,
      "string",
    );
    TestValidator.equals(
      "error log has valid last_occurred_at",
      typeof errorLog.last_occurred_at,
      "string",
    );
  }
}
