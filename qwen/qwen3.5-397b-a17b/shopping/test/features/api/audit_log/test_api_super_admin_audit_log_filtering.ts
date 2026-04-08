import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSuperAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSuperAdminAuditLog";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import type { IShoppingMallSuperAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdminAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test super administrator audit log filtering capabilities.
 *
 * Validates that super administrators can filter audit logs by action_type, date range, and combined filters. Ensures the filtering system correctly returns matching entries and handles empty result sets with proper pagination metadata.
 *
 * The test covers action_type filtering to verify only entries with matching action types are returned, date range filtering to confirm entries fall within specified boundaries, and combined filters to validate AND logic. Empty result scenarios are tested to ensure pagination structure remains valid with zero records.
 *
 * 1. Super administrator authenticates via join endpoint.
 * 2. Query audit logs with action_type filter and validate results.
 * 3. Query audit logs with date range filters (date_from, date_to).
 * 4. Query audit logs with combined filters (action_type + date range).
 * 5. Query with filters matching no records to verify empty pagination structure.
 */
export async function test_api_super_admin_audit_log_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSuperAdmin.IJoin,
  });
  // 2. Test action_type filter
  const actionTypeLogs =
    await api.functional.shoppingMall.superAdmin.super_admin.audit_logs.index(
      superAdminConnection,
      {
        body: {
          action_type: "USER_BAN",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallSuperAdminAuditLog.IRequest,
      },
    );
  typia.assert(actionTypeLogs);
  // Validate all entries match action_type filter
  if (actionTypeLogs.data.length > 0) {
    for (const log of actionTypeLogs.data) {
      TestValidator.equals(
        "action_type matches filter",
        log.action_type,
        "USER_BAN",
      );
      typia.assert(log);
    }
  }
  // 3. Test date range filter
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneDayLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const dateRangeLogs =
    await api.functional.shoppingMall.superAdmin.super_admin.audit_logs.index(
      superAdminConnection,
      {
        body: {
          date_from: oneDayAgo.toISOString(),
          date_to: oneDayLater.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IShoppingMallSuperAdminAuditLog.IRequest,
      },
    );
  typia.assert(dateRangeLogs);
  // Validate all entries fall within date range
  if (dateRangeLogs.data.length > 0) {
    for (const log of dateRangeLogs.data) {
      const logTime = new Date(log.created_at).getTime();
      TestValidator.predicate(
        "created_at >= date_from",
        logTime >= oneDayAgo.getTime(),
      );
      TestValidator.predicate(
        "created_at <= date_to",
        logTime <= oneDayLater.getTime(),
      );
      typia.assert(log);
    }
  }
  // 4. Test combined filters (action_type + date range)
  const combinedLogs =
    await api.functional.shoppingMall.superAdmin.super_admin.audit_logs.index(
      superAdminConnection,
      {
        body: {
          action_type: "SELLER_APPROVE",
          date_from: oneDayAgo.toISOString(),
          date_to: oneDayLater.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IShoppingMallSuperAdminAuditLog.IRequest,
      },
    );
  typia.assert(combinedLogs);
  // Validate combined filter results
  if (combinedLogs.data.length > 0) {
    for (const log of combinedLogs.data) {
      TestValidator.equals(
        "combined action_type matches",
        log.action_type,
        "SELLER_APPROVE",
      );
      const logTime = new Date(log.created_at).getTime();
      TestValidator.predicate(
        "combined created_at in range",
        logTime >= oneDayAgo.getTime() && logTime <= oneDayLater.getTime(),
      );
      typia.assert(log);
    }
  }
  // 5. Test empty result set with non-matching filters
  const emptyLogs =
    await api.functional.shoppingMall.superAdmin.super_admin.audit_logs.index(
      superAdminConnection,
      {
        body: {
          action_type: "NONEXISTENT_ACTION_TYPE_12345",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallSuperAdminAuditLog.IRequest,
      },
    );
  typia.assert(emptyLogs);
  // Validate empty result set
  TestValidator.equals("empty result data array", emptyLogs.data.length, 0);
}
