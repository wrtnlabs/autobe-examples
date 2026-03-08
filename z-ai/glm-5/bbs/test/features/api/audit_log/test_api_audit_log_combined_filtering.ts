import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminAuditLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdminAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_audit_log_combined_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // 2. Test combined action + date range filter
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const actionDateRangeFilter =
    await api.functional.discussionBoard.admin.audit_logs.index(
      adminConnection,
      {
        body: {
          action: "ban",
          created_at_from: sevenDaysAgo.toISOString(),
          created_at_to: now.toISOString(),
        } satisfies IDiscussionBoardAdminAuditLog.IRequest,
      },
    );
  typia.assert(actionDateRangeFilter);
  // Verify all entries match both action and date range
  for (const entry of actionDateRangeFilter.data) {
    TestValidator.equals("action is ban", entry.action, "ban");
    const createdAt = new Date(entry.created_at);
    TestValidator.predicate(
      "created_at within date range",
      createdAt >= sevenDaysAgo && createdAt <= now,
    );
  }
  // 3. Test combined admin_id + action filter
  const adminActionFilter =
    await api.functional.discussionBoard.admin.audit_logs.index(
      adminConnection,
      {
        body: {
          admin_id: admin.id,
          action: "promote",
        } satisfies IDiscussionBoardAdminAuditLog.IRequest,
      },
    );
  typia.assert(adminActionFilter);
  // Verify all entries have matching admin_id and action
  for (const entry of adminActionFilter.data) {
    // Note: admin_id is not in ISummary, so we can only verify action
    TestValidator.equals("action is promote", entry.action, "promote");
  }
  // 4. Test full-text search on reason field
  const searchKeyword = "violation";
  const searchFilter =
    await api.functional.discussionBoard.admin.audit_logs.index(
      adminConnection,
      {
        body: {
          search: searchKeyword,
        } satisfies IDiscussionBoardAdminAuditLog.IRequest,
      },
    );
  typia.assert(searchFilter);
  // Verify all entries contain the search keyword in reason
  for (const entry of searchFilter.data) {
    if (entry.reason !== null) {
      TestValidator.predicate(
        "reason contains search keyword",
        entry.reason.toLowerCase().includes(searchKeyword.toLowerCase()),
      );
    }
  }
  // 5. Test pagination with combined filters
  const paginatedFilter =
    await api.functional.discussionBoard.admin.audit_logs.index(
      adminConnection,
      {
        body: {
          action: "ban",
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardAdminAuditLog.IRequest,
      },
    );
  typia.assert(paginatedFilter);
  // Verify pagination info is correct
  TestValidator.predicate(
    "limit is 5 or less",
    paginatedFilter.pagination.limit === 5,
  );
  TestValidator.predicate(
    "current page is 1",
    paginatedFilter.pagination.current === 1,
  );
  // 6. Verify created_at descending order
  for (let i = 0; i < actionDateRangeFilter.data.length - 1; i++) {
    const currentCreatedAt = new Date(actionDateRangeFilter.data[i].created_at);
    const nextCreatedAt = new Date(
      actionDateRangeFilter.data[i + 1].created_at,
    );
    TestValidator.predicate(
      "created_at descending order",
      currentCreatedAt >= nextCreatedAt,
    );
  }
}
