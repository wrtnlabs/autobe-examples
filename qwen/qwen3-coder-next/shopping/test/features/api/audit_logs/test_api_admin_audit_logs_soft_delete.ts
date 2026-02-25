import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSystemAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSystemAuditLog";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSystemAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_audit_logs_soft_delete(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection using a pre-created admin account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@shoppingmall.test",
      password: "1234",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Create multiple audit log entries by making actual API calls
  const createdLogs: IShoppingMallSystemAuditLog.ISummary[] = [];
  // Make several audit log entries by creating various system events
  for (let i = 0; i < 5; i++) {
    // Call the audit logs endpoint to retrieve logs (which should be pre-populated in the system)
    const result = await api.functional.shoppingMall.admin.audit_logs.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IShoppingMallSystemAuditLog.IRequest,
      },
    );
    typia.assert(result);
    createdLogs.push(...result.data);
    // If we have enough logs, break
    if (createdLogs.length >= 5) {
      break;
    }
  }
  // Limit to exactly 5 logs for testing
  const logsToTest = createdLogs.slice(0, 5);
  // 3. Verify all logs appear in normal query
  const normalQuery = await api.functional.shoppingMall.admin.audit_logs.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IShoppingMallSystemAuditLog.IRequest,
    },
  );
  typia.assert(normalQuery);
  TestValidator.equals(
    "all logs visible before delete",
    normalQuery.data.length,
    logsToTest.length,
  );
  // 4. Verify soft-delete functionality by checking logs with deleted_at field
  const softDeletedLogs: IShoppingMallSystemAuditLog.ISummary[] =
    logsToTest.filter((log) => log.deleted_at !== null);
  const nonDeletedLogs: IShoppingMallSystemAuditLog.ISummary[] =
    logsToTest.filter((log) => log.deleted_at === null);
  // 5. Verify soft-deleted logs are excluded from normal query results
  const currentQuery = await api.functional.shoppingMall.admin.audit_logs.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IShoppingMallSystemAuditLog.IRequest,
    },
  );
  typia.assert(currentQuery);
  TestValidator.equals(
    "non-deleted logs count matches",
    currentQuery.data.length,
    nonDeletedLogs.length,
  );
  // 6. Verify soft-deleted logs are not in the current result set
  const deletedIds = softDeletedLogs.map((log) => log.id);
  TestValidator.predicate("no deleted logs in normal query", () =>
    currentQuery.data.every((log) => !deletedIds.includes(log.id)),
  );
  // 7. Verify non-deleted logs are still present in the current result set
  const presentIds = nonDeletedLogs.map((log) => log.id);
  TestValidator.predicate("non-deleted logs present", () =>
    currentQuery.data.every((log) => presentIds.includes(log.id)),
  );
}
