import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrativeHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrativeHistory";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministrativeHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministrativeHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test administrative history filtering by date ranges to validate temporal audit trail analysis.
 * This scenario focuses on retrieving historical records within specific time periods to support
 * governance oversight and compliance reporting.
 */
export async function test_api_administrative_history_date_range_search(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Generate test data with different timestamps
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  // Test 1: Recent period (last 30 days)
  const recentHistory =
    await api.functional.discussionBoard.superAdmin.administrator_assignments.history.index(
      superAdminConnection,
      {
        body: {
          start_date: thirtyDaysAgo.toISOString(),
          end_date: now.toISOString(),
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardAdministrativeHistory.IRequest,
      },
    );
  typia.assert(recentHistory);
  // Test 2: Historical period (older than 30 days)
  const historicalHistory =
    await api.functional.discussionBoard.superAdmin.administrator_assignments.history.index(
      superAdminConnection,
      {
        body: {
          start_date: sixtyDaysAgo.toISOString(),
          end_date: thirtyDaysAgo.toISOString(),
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardAdministrativeHistory.IRequest,
      },
    );
  typia.assert(historicalHistory);
  // Test 3: Empty date range (same start and end)
  const emptyRangeHistory =
    await api.functional.discussionBoard.superAdmin.administrator_assignments.history.index(
      superAdminConnection,
      {
        body: {
          start_date: now.toISOString(),
          end_date: now.toISOString(),
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardAdministrativeHistory.IRequest,
      },
    );
  typia.assert(emptyRangeHistory);
  // Test 4: No date range (should return all records)
  const allHistory =
    await api.functional.discussionBoard.superAdmin.administrator_assignments.history.index(
      superAdminConnection,
      {
        body: {
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardAdministrativeHistory.IRequest,
      },
    );
  typia.assert(allHistory);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination has valid current page",
    recentHistory.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    recentHistory.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has valid records count",
    recentHistory.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has valid pages count",
    recentHistory.pagination.pages >= 0,
  );
  // Business logic validation: Ensure different date ranges return different result sets
  if (recentHistory.data.length > 0 && historicalHistory.data.length > 0) {
    TestValidator.notEquals(
      "recent and historical results should differ",
      recentHistory.data.map((record) => record.id),
      historicalHistory.data.map((record) => record.id),
    );
  }
}
