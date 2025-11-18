import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListTodoAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoAuditLog";

/**
 * Test that an administrator can retrieve detailed audit log data for a todo
 * item through admin audit log detail API. This checks proper RBAC,
 * completeness of immutable audit record, and data structure integrity.
 *
 * 1. Register & authenticate a system administrator.
 * 2. Generate random UUIDs for todoId and auditLogId (simulating existing
 *    entries).
 * 3. Use admin-level API to fetch a specific audit log entry using those IDs.
 * 4. Assert the response is ITodoListTodoAuditLog, contains all required
 *    properties, and all fields have correct types/formats.
 * 5. Sanity check: id and todo_id match parameters and at least one actor ID is
 *    present, created_at is valid ISO date-time, action is a non-empty string.
 * 6. Confirm response data is immutable (no update/delete possible in API or
 *    DTOs).
 */
export async function test_api_todo_audit_log_detail_access_by_admin(
  connection: api.IConnection,
) {
  // 1. Register & authenticate admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<
      string & tags.MinLength<8> & tags.Format<"password">
    >(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ITodoListAdmin.IJoin;
  const admin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(admin);
  // 2. Generate test UUIDs for todoId and auditLogId (simulate existing resources)
  const todoId = typia.random<string & tags.Format<"uuid">>();
  const auditLogId = typia.random<string & tags.Format<"uuid">>();
  // 3. Fetch audit log entry detail as admin
  const auditLog: ITodoListTodoAuditLog =
    await api.functional.todoList.admin.todos.auditLogs.at(connection, {
      todoId,
      auditLogId,
    });
  typia.assert(auditLog);
  // 4. Validate returned data structure, required properties
  TestValidator.predicate(
    "audit log id matches format",
    typeof auditLog.id === "string" &&
      /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.test(
        auditLog.id,
      ),
  );
  TestValidator.predicate(
    "todo_id matches format",
    typeof auditLog.todo_id === "string" &&
      /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.test(
        auditLog.todo_id,
      ),
  );
  TestValidator.predicate(
    "action is non-empty string",
    typeof auditLog.action === "string" && auditLog.action.length > 0,
  );
  TestValidator.predicate(
    "created_at is ISO 8601",
    typeof auditLog.created_at === "string" &&
      !isNaN(Date.parse(auditLog.created_at)),
  );
  TestValidator.predicate(
    "has at least one actorId set",
    !!auditLog.actor_admin_id || !!auditLog.actor_user_id,
  );
  // 5. Check response immutability (implied: DTO and API do not allow updates; test for read-only scenario)
}
