import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppAuditLog";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuditLog";

export async function test_api_audit_logs_unauthenticated_access(
  connection: api.IConnection,
) {
  // Test 1: Attempt to access audit logs without any authentication credentials
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "audit logs endpoint should reject unauthenticated requests",
    async () => {
      await api.functional.todoApp.admin.auditLogs.index(
        unauthenticatedConnection,
        {
          body: {
            page: 1,
            limit: 20,
          } satisfies ITodoAppAuditLog.IRequest,
        },
      );
    },
  );

  // Test 2: Attempt to access audit logs with invalid token in Authorization header
  const invalidTokenConnection: api.IConnection = {
    ...connection,
    headers: {
      Authorization: "Bearer invalid_token_12345",
    },
  };

  await TestValidator.error(
    "audit logs endpoint should reject requests with invalid tokens",
    async () => {
      await api.functional.todoApp.admin.auditLogs.index(
        invalidTokenConnection,
        {
          body: {
            page: 1,
            limit: 20,
          } satisfies ITodoAppAuditLog.IRequest,
        },
      );
    },
  );

  // Test 3: Attempt to access audit logs with malformed Authorization header
  const malformedAuthConnection: api.IConnection = {
    ...connection,
    headers: {
      Authorization: "InvalidFormat token_value",
    },
  };

  await TestValidator.error(
    "audit logs endpoint should reject requests with malformed authorization headers",
    async () => {
      await api.functional.todoApp.admin.auditLogs.index(
        malformedAuthConnection,
        {
          body: {
            page: 1,
            limit: 20,
          } satisfies ITodoAppAuditLog.IRequest,
        },
      );
    },
  );

  // Test 4: Verify that authenticated admin access works (contrast with unauthenticated)
  // First, create an admin account to get valid credentials
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(12);

  const authenticatedAdmin: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies ITodoAppAdmin.ICreate,
    });

  typia.assert(authenticatedAdmin);

  // Now access audit logs with authenticated connection (should succeed)
  const auditLogsResult: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.auditLogs.index(connection, {
      body: {
        page: 1,
        limit: 20,
      } satisfies ITodoAppAuditLog.IRequest,
    });

  typia.assert(auditLogsResult);
  TestValidator.predicate(
    "authenticated admin should receive audit logs page result",
    auditLogsResult.pagination !== undefined &&
      Array.isArray(auditLogsResult.data),
  );
}
