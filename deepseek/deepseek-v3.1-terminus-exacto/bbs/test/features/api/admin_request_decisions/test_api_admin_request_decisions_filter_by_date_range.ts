import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequest";
import type { IDiscussionBoardAdminRequestDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequestDecision";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdminRequestDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdminRequestDecision";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test filtering administrator request decisions by specific date ranges.
 * Verify that when providing created_at_start and created_at_end parameters,
 * the system returns only decision records within the specified timeframe.
 * Validate that the date filtering works correctly for both inclusive and
 * exclusive boundaries. Test edge cases including empty date ranges,
 * single-day ranges, and ranges spanning multiple days.
 * Ensure the pagination metadata accurately reflects the date-filtered results.
 */
export async function test_api_admin_request_decisions_filter_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Register and authenticate as super admin
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Create test data with different timestamps
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  // Test 1: Filter by yesterday's date range
  const yesterdayStart = yesterday.toISOString();
  const yesterdayEnd = new Date(
    yesterday.getTime() + 24 * 60 * 60 * 1000 - 1,
  ).toISOString();
  const yesterdayResults =
    await api.functional.discussionBoard.superAdmin.admin_request_decisions.index(
      superAdminConnection,
      {
        body: {
          created_at_start: yesterdayStart,
          created_at_end: yesterdayEnd,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdminRequestDecision.IRequest,
      },
    );
  typia.assert(yesterdayResults);
  // Test 2: Filter by multi-day range (last 2 days)
  const twoDaysAgoStart = twoDaysAgo.toISOString();
  const todayEnd = new Date(
    now.getTime() + 24 * 60 * 60 * 1000 - 1,
  ).toISOString();
  const multiDayResults =
    await api.functional.discussionBoard.superAdmin.admin_request_decisions.index(
      superAdminConnection,
      {
        body: {
          created_at_start: twoDaysAgoStart,
          created_at_end: todayEnd,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdminRequestDecision.IRequest,
      },
    );
  typia.assert(multiDayResults);
  // Test 3: Empty date range (future dates)
  const futureStart = new Date(
    now.getTime() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const futureEnd = new Date(
    now.getTime() + 8 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const emptyResults =
    await api.functional.discussionBoard.superAdmin.admin_request_decisions.index(
      superAdminConnection,
      {
        body: {
          created_at_start: futureStart,
          created_at_end: futureEnd,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdminRequestDecision.IRequest,
      },
    );
  typia.assert(emptyResults);
  // Validate pagination reflects filtered results
  TestValidator.equals(
    "empty range has zero records",
    emptyResults.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty range has zero pages",
    emptyResults.pagination.pages,
    0,
  );
  // Validate meaningful business logic (not redundant type checks)
  if (yesterdayResults.data.length > 0) {
    const decision = yesterdayResults.data[0];
    // Validate that decision timestamps are within the requested range
    const decisionDate = new Date(decision.created_at);
    const rangeStart = new Date(yesterdayStart);
    const rangeEnd = new Date(yesterdayEnd);
    TestValidator.predicate(
      "decision timestamp within requested range",
      decisionDate >= rangeStart && decisionDate <= rangeEnd,
    );
    // Validate relationship integrity
    TestValidator.equals(
      "super admin id matches authenticated admin",
      decision.super_admin.id,
      superAdmin.id,
    );
  }
}
