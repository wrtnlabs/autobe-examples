import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppAuditLog";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuditLog";
import type { ITodoAppAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuthorizationToken";

export async function test_api_audit_logs_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as admin to access audit logs
  const admin: ITodoAppAdmin.IAuthorized = await api.functional.auth.admin.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password_hash: "hashed_password_123",
        role: "admin",
      } satisfies ITodoAppAdmin.ICreate,
    },
  );
  typia.assert(admin);

  // Step 2: Retrieve audit logs with default pagination
  const auditLogs: IPageITodoAppAuditLog =
    await api.functional.todoApp.admin.audit.auditLogs.get(connection);
  typia.assert(auditLogs);

  // Step 3: Validate response structure matches IPageITodoAppAuditLog
  TestValidator.equals("pagination exists", auditLogs.pagination, {
    current: 0,
    limit: auditLogs.pagination.limit,
    records: auditLogs.pagination.records,
    pages: Math.ceil(auditLogs.pagination.records / auditLogs.pagination.limit),
  });

  // Step 4: Validate items array contains audit log entries
  TestValidator.predicate(
    "items array is not empty",
    auditLogs.items.length > 0,
  );

  // Step 5: Validate reverse chronological order (most recent first)
  if (auditLogs.items.length >= 2) {
    for (let i = 0; i < auditLogs.items.length - 1; i++) {
      const currentLog = auditLogs.items[i];
      const nextLog = auditLogs.items[i + 1];

      // Convert timestamps to Date objects for reliable comparison
      const currentTimestamp = new Date(currentLog.createdAt).getTime();
      const nextTimestamp = new Date(nextLog.createdAt).getTime();

      TestValidator.predicate(
        "audit logs are in reverse chronological order",
        currentTimestamp >= nextTimestamp,
      );
    }
  }
}
