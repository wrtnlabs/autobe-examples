import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingAdminActionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingAdminActionLog";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAdminActionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdminActionLog";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";

/**
 * Retrieve admin action logs as an authenticated admin, with filtering. This
 * test validates:
 *
 * 1. An admin can join (register) with all required credentials.
 * 2. Authenticated admin can filter action log index view by action_type and a
 *    date range, with response records matching filters.
 * 3. Admin action log index endpoint is NOT accessible to unauthenticated users.
 * 4. Invalid action_type filter returns no results but does not error.
 */
export async function test_api_admin_action_log_search_by_admin(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminName = RandomGenerator.name();
  const adminRole = RandomGenerator.pick([
    "super",
    "support",
    "compliance",
    "operator",
  ] as const);
  const adminStatus = RandomGenerator.pick([
    "active",
    "pending",
    "suspended",
    "locked",
  ] as const);
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: adminName,
      role: adminRole,
      status: adminStatus,
    } satisfies IShoppingAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Authenticated log search with valid action_type & date filter
  // Pick a plausible action type for searching (might not yield a result, but property is string)
  const actionType = "GRANT_ROLE";
  // Use a date range in the current year (simulate logs over two days)
  const fromDate = new Date(2025, 0, 1).toISOString();
  const toDate = new Date(2025, 0, 3).toISOString();
  const logSearchBody = {
    action_type: actionType,
    created_at_from: fromDate,
    created_at_to: toDate,
    limit: 3,
  } satisfies IShoppingAdminActionLog.IRequest;
  const page: IPageIShoppingAdminActionLog.ISummary =
    await api.functional.shopping.admin.adminActionLogs.index(connection, {
      body: logSearchBody,
    });
  typia.assert(page);
  // All returned logs (if any) must match the filter
  for (const log of page.data) {
    typia.assert(log);
    TestValidator.equals(
      "action_type matches filter",
      log.action_type,
      actionType,
    );
    const createdAt: string = log.created_at;
    TestValidator.predicate("created_at is >= fromDate", createdAt >= fromDate);
    TestValidator.predicate("created_at is <= toDate", createdAt <= toDate);
  }
  // 3. Unauthenticated call must fail
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated admin action log search is denied",
    async () => {
      await api.functional.shopping.admin.adminActionLogs.index(unauthConn, {
        body: logSearchBody,
      });
    },
  );
  // 4. Invalid action_type filter returns empty data without error
  const invalidSearchBody = {
    action_type: "NON_EXISTENT_ACTION_TYPE",
    created_at_from: fromDate,
    created_at_to: toDate,
    limit: 3,
  } satisfies IShoppingAdminActionLog.IRequest;
  const invalidPage: IPageIShoppingAdminActionLog.ISummary =
    await api.functional.shopping.admin.adminActionLogs.index(connection, {
      body: invalidSearchBody,
    });
  typia.assert(invalidPage);
  TestValidator.equals(
    "no results for invalid action_type",
    invalidPage.data.length,
    0,
  );
}
