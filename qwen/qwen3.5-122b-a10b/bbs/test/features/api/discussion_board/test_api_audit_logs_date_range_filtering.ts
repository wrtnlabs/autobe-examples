import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_audit_logs_date_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Get current time and create time windows for testing
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const twoHoursAgo = new Date(now.getTime() - 120 * 60 * 1000);
  const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  // 3. Test 1: Filter by created_at_from (logs after specific timestamp)
  const filterFromResult =
    await api.functional.discussionBoard.admin.audit_logs.index(
      adminConnection,
      {
        body: {
          created_at_from: oneHourAgo.toISOString(),
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(filterFromResult);
  TestValidator.predicate(
    "created_at_from filter returns valid response",
    filterFromResult.pagination.current >= 1,
  );
  // 4. Test 2: Filter by created_at_to (logs before specific timestamp)
  const filterToResult =
    await api.functional.discussionBoard.admin.audit_logs.index(
      adminConnection,
      {
        body: {
          created_at_to: twoHoursAgo.toISOString(),
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(filterToResult);
  TestValidator.predicate(
    "created_at_to filter returns valid response",
    filterToResult.pagination.current >= 1,
  );
  // 5. Test 3: Combined date range filtering
  const filterRangeResult =
    await api.functional.discussionBoard.admin.audit_logs.index(
      adminConnection,
      {
        body: {
          created_at_from: twoHoursAgo.toISOString(),
          created_at_to: oneDayFromNow.toISOString(),
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(filterRangeResult);
  TestValidator.predicate(
    "combined date range filter returns valid response",
    filterRangeResult.pagination.current >= 1,
  );
  // 6. Test 4: Date range with pagination
  const filterPaginationResult =
    await api.functional.discussionBoard.admin.audit_logs.index(
      adminConnection,
      {
        body: {
          created_at_from: twoHoursAgo.toISOString(),
          created_at_to: oneDayFromNow.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(filterPaginationResult);
  TestValidator.equals(
    "pagination page number",
    filterPaginationResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit respected",
    filterPaginationResult.data.length <= 10,
  );
  // 7. Test 5: Empty results when no records match date range
  const farFuture = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year from now
  const emptyResult =
    await api.functional.discussionBoard.admin.audit_logs.index(
      adminConnection,
      {
        body: {
          created_at_from: farFuture.toISOString(),
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty result has zero records",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result has empty data array",
    emptyResult.data.length,
    0,
  );
  // 8. Test 6: Combined filters (actor_type + date range)
  const combinedFilterResult =
    await api.functional.discussionBoard.admin.audit_logs.index(
      adminConnection,
      {
        body: {
          actor_type: "admin",
          created_at_from: twoHoursAgo.toISOString(),
          created_at_to: oneDayFromNow.toISOString(),
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(combinedFilterResult);
  // Verify all results match the actor_type filter
  const allAdminActor = combinedFilterResult.data.every(
    (log) => log.actor_type === "admin",
  );
  TestValidator.predicate("all results match actor_type filter", allAdminActor);
  // 9. Test 7: ISO 8601 date-time format validation
  const validIsoDate = "2024-01-15T10:30:00.000Z";
  const isoFormatResult =
    await api.functional.discussionBoard.admin.audit_logs.index(
      adminConnection,
      {
        body: {
          created_at_from: validIsoDate,
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(isoFormatResult);
  TestValidator.predicate(
    "ISO 8601 format accepted",
    isoFormatResult.pagination.current >= 1,
  );
  // 10. Test 8: Combined filters (actor_type + action_type + date range)
  const multiFilterResult =
    await api.functional.discussionBoard.admin.audit_logs.index(
      adminConnection,
      {
        body: {
          actor_type: "admin",
          action_type: "admin.join",
          created_at_from: twoHoursAgo.toISOString(),
          created_at_to: oneDayFromNow.toISOString(),
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(multiFilterResult);
  // Verify all results match all filters
  const allMatchFilters = multiFilterResult.data.every((log) => {
    return (
      log.actor_type === "admin" &&
      log.action_type === "admin.join" &&
      new Date(log.created_at) >= twoHoursAgo &&
      new Date(log.created_at) <= oneDayFromNow
    );
  });
  TestValidator.predicate(
    "all results match combined filters",
    allMatchFilters,
  );
}
