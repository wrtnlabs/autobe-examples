import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminAuditLog";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test super administrator's full visibility and filtering capabilities for audit logs.
 *
 * This test verifies that:
 * 1. Audit logs can be queried with various filter combinations
 * 2. Pagination works correctly
 * 3. Each audit log entry contains complete admin information
 * 4. Filters work independently and in combination
 */
export async function test_api_audit_log_super_admin_full_visibility_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create a new administrator account for testing
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // Step 1: Query audit logs without filters - verify response structure
  const allLogs = await api.functional.shoppingMall.admin.audit_logs.index(
    adminConnection,
    {
      body: {} satisfies IShoppingMallAdminAuditLog.IRequest,
    },
  );
  typia.assert(allLogs);
  // Step 2: Filter by action type
  const actionFilter = "seller_approve";
  const filteredByAction =
    await api.functional.shoppingMall.admin.audit_logs.index(adminConnection, {
      body: {
        action: actionFilter,
      } satisfies IShoppingMallAdminAuditLog.IRequest,
    });
  typia.assert(filteredByAction);
  // Verify all returned logs have the specified action
  TestValidator.predicate(
    "all logs have correct action",
    filteredByAction.data.every((log) => log.action === actionFilter),
  );
  // Step 3: Filter by target_type
  const targetTypeFilter = "customer";
  const filteredByTargetType =
    await api.functional.shoppingMall.admin.audit_logs.index(adminConnection, {
      body: {
        target_type: targetTypeFilter,
      } satisfies IShoppingMallAdminAuditLog.IRequest,
    });
  typia.assert(filteredByTargetType);
  // Verify all returned logs have the specified target_type
  TestValidator.predicate(
    "all logs have correct target_type",
    filteredByTargetType.data.every(
      (log) => log.target_type === targetTypeFilter,
    ),
  );
  // Step 4: Filter by specific target_id
  const targetId = typia.random<string & tags.Format<"uuid">>();
  const filteredByTargetId =
    await api.functional.shoppingMall.admin.audit_logs.index(adminConnection, {
      body: {
        target_id: targetId,
      } satisfies IShoppingMallAdminAuditLog.IRequest,
    });
  typia.assert(filteredByTargetId);
  // Step 5: Filter by shopping_mall_admin_id
  const filteredByAdminId =
    await api.functional.shoppingMall.admin.audit_logs.index(adminConnection, {
      body: {
        shopping_mall_admin_id: admin.id,
      } satisfies IShoppingMallAdminAuditLog.IRequest,
    });
  typia.assert(filteredByAdminId);
  // Step 6: Filter by date range
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const filteredByDateRange =
    await api.functional.shoppingMall.admin.audit_logs.index(adminConnection, {
      body: {
        created_from: oneWeekAgo.toISOString(),
        created_to: now.toISOString(),
      } satisfies IShoppingMallAdminAuditLog.IRequest,
    });
  typia.assert(filteredByDateRange);
  // Step 7: Filter by IP address (partial match)
  const ipFilter = "192.168";
  const filteredByIp = await api.functional.shoppingMall.admin.audit_logs.index(
    adminConnection,
    {
      body: {
        ip: ipFilter,
      } satisfies IShoppingMallAdminAuditLog.IRequest,
    },
  );
  typia.assert(filteredByIp);
  // Step 8: Test pagination with page and limit
  const pageLogs = await api.functional.shoppingMall.admin.audit_logs.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallAdminAuditLog.IRequest,
    },
  );
  typia.assert(pageLogs);
  // Verify pagination values match request
  TestValidator.equals("page 1 requested", pageLogs.pagination.current, 1);
  TestValidator.equals("limit 10 requested", pageLogs.pagination.limit, 10);
  // Step 9: Test second page pagination
  const page2Logs = await api.functional.shoppingMall.admin.audit_logs.index(
    adminConnection,
    {
      body: {
        page: 2,
        limit: 5,
      } satisfies IShoppingMallAdminAuditLog.IRequest,
    },
  );
  typia.assert(page2Logs);
  // Step 10: Verify audit log entry structure with admin info
  if (allLogs.data.length > 0) {
    const logEntry = allLogs.data[0];
    typia.assert(logEntry);
    // Verify admin summary exists with all required fields
    TestValidator.predicate(
      "log entry has admin with required fields",
      logEntry.admin.id !== undefined &&
        logEntry.admin.email !== undefined &&
        logEntry.admin.grade !== undefined &&
        logEntry.admin.name !== undefined &&
        logEntry.admin.created_at !== undefined &&
        logEntry.admin.updated_at !== undefined,
    );
  }
  // Step 11: Test combined filters
  const combinedFilter =
    await api.functional.shoppingMall.admin.audit_logs.index(adminConnection, {
      body: {
        action: "seller_approve",
        target_type: "seller",
        page: 1,
        limit: 20,
      } satisfies IShoppingMallAdminAuditLog.IRequest,
    });
  typia.assert(combinedFilter);
  // Verify combined filters work correctly
  TestValidator.predicate(
    "combined filter - all logs have correct action and target_type",
    combinedFilter.data.every(
      (log) => log.action === "seller_approve" && log.target_type === "seller",
    ),
  );
}
