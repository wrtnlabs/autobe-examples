import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppAuditLog";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuditLog";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function test_api_todo_deletion_audit_logging(
  connection: api.IConnection,
) {
  // 1. Create user account via join endpoint
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(10);
  const userAuthResponse = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: "http://localhost:3000",
      referrer: "http://localhost:3000/auth",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(userAuthResponse);
  const userId = userAuthResponse.id;

  // 2. Create a todo item for the authenticated user
  const todoData = await api.functional.todoApp.user.todos.create(connection, {
    body: {
      title: RandomGenerator.paragraph({ sentences: 3 }),
      description: RandomGenerator.content({ paragraphs: 1 }),
    } satisfies ITodoAppTodo.ICreate,
  });
  typia.assert(todoData);
  const todoId = todoData.id;
  const deletionTimeBeforeDelete = new Date();

  // 3. Delete the todo item
  await api.functional.todoApp.user.todos.erase(connection, {
    todoId: todoId,
  });

  const deletionTimeAfterDelete = new Date();

  // 4. Switch to admin account to query audit logs
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(10);
  const adminAuthResponse = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ITodoAppAdmin.ICreate,
  });
  typia.assert(adminAuthResponse);

  // 5. Query audit logs to find the deletion event
  const auditLogResponse = await api.functional.todoApp.admin.auditLogs.index(
    connection,
    {
      body: {
        action_type: "todo_deleted",
        resource_type: "todo",
        actor_type: "user",
        status: "success",
        user_id: userId,
      } satisfies ITodoAppAuditLog.IRequest,
    },
  );
  typia.assert(auditLogResponse);

  // 6. Validate audit log entry exists and contains correct information
  TestValidator.predicate(
    "audit log should have at least one deletion record",
    auditLogResponse.data.length > 0,
  );

  const deletionAuditEntry = auditLogResponse.data[0];
  typia.assert(deletionAuditEntry);

  // 7. Validate audit log entry properties
  TestValidator.equals(
    "deletion event action_type should be todo_deleted",
    deletionAuditEntry.action_type,
    "todo_deleted",
  );
  TestValidator.equals(
    "deletion event resource_type should be todo",
    deletionAuditEntry.resource_type,
    "todo",
  );
  TestValidator.equals(
    "deletion event actor_type should be user",
    deletionAuditEntry.actor_type,
    "user",
  );
  TestValidator.equals(
    "deletion event status should be success",
    deletionAuditEntry.status,
    "success",
  );

  // 8. Validate the audit log timestamp is within the deletion time range
  const auditLogTimestamp = new Date(deletionAuditEntry.created_at);
  TestValidator.predicate(
    "audit log timestamp should be between deletion start and end time",
    auditLogTimestamp >= deletionTimeBeforeDelete &&
      auditLogTimestamp <= deletionTimeAfterDelete,
  );
}
