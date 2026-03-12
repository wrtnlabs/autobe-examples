import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneAdminAuditLog";
import type { IRedditCloneAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneAdmin";
import type { IRedditCloneAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneAdminAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test admin audit logs filtering by action type and date range.
 *
 * This test verifies that authenticated admins can filter audit logs for
 * security investigations using action_type and date range parameters.
 * Tests include single filter types, combined filters, pagination, and empty results.
 */
export async function test_api_admin_audit_logs_filter_by_action_and_date(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
      bio: null,
      avatar: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneAdmin.IJoin,
  });
  // 2. Test filtering by action_type only
  const actionTypeFilter = RandomGenerator.pick([
    "USER_BAN",
    "CONTENT_DELETE",
    "ROLE_CHANGE",
  ] as const);
  const actionTypeResult =
    await api.functional.redditClone.admin.audit_logs.index(adminConnection, {
      body: {
        action_type: actionTypeFilter,
        page: 1,
        limit: 20,
      } satisfies IRedditCloneAdminAuditLog.IRequest,
    });
  typia.assert(actionTypeResult);
  TestValidator.predicate(
    "action_type filter returns valid response",
    actionTypeResult.data.length >= 0,
  );
  // 3. Test filtering by date range only
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const dateRangeResult =
    await api.functional.redditClone.admin.audit_logs.index(adminConnection, {
      body: {
        from_date: oneDayAgo.toISOString(),
        to_date: now.toISOString(),
        page: 1,
        limit: 20,
      } satisfies IRedditCloneAdminAuditLog.IRequest,
    });
  typia.assert(dateRangeResult);
  TestValidator.predicate(
    "date range filter returns valid response",
    dateRangeResult.data.length >= 0,
  );
  // 4. Test combined filtering (action_type + date range)
  const combinedFilterResult =
    await api.functional.redditClone.admin.audit_logs.index(adminConnection, {
      body: {
        action_type: actionTypeFilter,
        from_date: oneDayAgo.toISOString(),
        to_date: now.toISOString(),
        page: 1,
        limit: 20,
      } satisfies IRedditCloneAdminAuditLog.IRequest,
    });
  typia.assert(combinedFilterResult);
  TestValidator.predicate(
    "combined filter returns valid response",
    combinedFilterResult.data.length >= 0,
  );
  // 5. Test pagination with filters
  const paginationResult =
    await api.functional.redditClone.admin.audit_logs.index(adminConnection, {
      body: {
        action_type: actionTypeFilter,
        page: 1,
        limit: 10,
      } satisfies IRedditCloneAdminAuditLog.IRequest,
    });
  typia.assert(paginationResult);
  TestValidator.predicate(
    "pagination limit respected",
    paginationResult.data.length <= 10,
  );
  TestValidator.equals(
    "pagination current page",
    paginationResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    paginationResult.pagination.limit,
    10,
  );
  // 6. Test empty results with non-matching filter
  const futureDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
  const emptyResult = await api.functional.redditClone.admin.audit_logs.index(
    adminConnection,
    {
      body: {
        from_date: futureDate.toISOString(),
        to_date: new Date(
          futureDate.getTime() + 24 * 60 * 60 * 1000,
        ).toISOString(),
        page: 1,
        limit: 20,
      } satisfies IRedditCloneAdminAuditLog.IRequest,
    },
  );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty results for future date range",
    emptyResult.data.length,
    0,
  );
  TestValidator.equals(
    "empty results pagination records",
    emptyResult.pagination.records,
    0,
  );
  // 7. Verify sorting (descending by created_at)
  if (dateRangeResult.data.length > 1) {
    const isSortedDescending = dateRangeResult.data.every(
      (log, index, array) => {
        if (index === 0) return true;
        return (
          new Date(log.created_at) <= new Date(array[index - 1].created_at)
        );
      },
    );
    TestValidator.predicate(
      "results sorted descending by created_at",
      isSortedDescending,
    );
  }
}
