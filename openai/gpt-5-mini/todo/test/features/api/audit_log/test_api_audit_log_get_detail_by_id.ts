import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminSession";
import type { ITodoAppAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuditLog";
import type { ITodoAppList } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppList";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppTaskTag } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTaskTag";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import type { ITodoAppTodouserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodouserSession";

export async function test_api_audit_log_get_detail_by_id(
  connection: api.IConnection,
) {
  // Purpose: Validate admin retrieval of a single audit log entry and verify
  // authorization enforcement. Because no audit-log search API is available in
  // the given SDK, this test performs domain actions to produce audit events
  // and then exercises the GET /todoApp/admin/auditLogs/:auditLogId endpoint
  // using a generated UUID to retrieve details. It validates response shape
  // and ensures unauthenticated access is rejected.

  // 1) Create a todo user (self-signup) to generate domain activity
  const todoUserEmail: string = typia.random<string & tags.Format<"email">>();
  const todoUser = await api.functional.auth.todoUser.join(connection, {
    body: {
      email: todoUserEmail,
      password: "Password123!",
      href: "https://example.com/signup",
      referrer: "https://example.com",
      displayName: RandomGenerator.name(),
    } satisfies ITodoAppTodoUser.ICreate,
  });
  typia.assert(todoUser);

  // 2) As the todo user (SDK sets Authorization header automatically), create a list
  const list = await api.functional.todoApp.todoUser.lists.create(connection, {
    body: {
      title: RandomGenerator.paragraph({
        sentences: 3,
        wordMin: 3,
        wordMax: 8,
      }),
      description: RandomGenerator.paragraph({ sentences: 6 }),
      visibility: "private",
    } satisfies ITodoAppList.ICreate,
  });
  typia.assert(list);

  // 3) Create a task under the created list to emit an additional audit event
  const task = await api.functional.todoApp.todoUser.lists.tasks.create(
    connection,
    {
      listId: list.id,
      body: {
        title: RandomGenerator.paragraph({
          sentences: 4,
          wordMin: 2,
          wordMax: 7,
        }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        isCompleted: false,
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(task);

  // 4) Create an admin account (this will set Authorization header to admin token)
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: ITodoAppAdmin.IAuthorized = await api.functional.auth.admin.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: "AdminPass123!",
        href: "https://example.com/admin/join",
        referrer: "https://example.com",
        role: "moderator",
        display_name: RandomGenerator.name(),
      } satisfies ITodoAppAdmin.ICreate,
    },
  );
  typia.assert(admin);

  // 5) Attempt to retrieve a single audit log by id as admin.
  // NOTE: The SDK does not provide a discovery/search endpoint in the provided
  // materials. Therefore we will exercise the GET endpoint by generating a
  // UUID and validating the returned ITodoAppAuditLog shape and that the
  // returned id matches the requested id. This verifies endpoint wiring and
  // authorization behaviour.
  const requestedAuditLogId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const auditLog: ITodoAppAuditLog =
    await api.functional.todoApp.admin.auditLogs.at(connection, {
      auditLogId: requestedAuditLogId,
    });
  // Validate shape
  typia.assert(auditLog);

  // Business-level validations
  TestValidator.equals(
    "retrieved audit log id matches requested id",
    auditLog.id,
    requestedAuditLogId,
  );
  TestValidator.predicate(
    "audit log has eventType",
    typeof auditLog.eventType === "string" && auditLog.eventType.length > 0,
  );
  TestValidator.predicate(
    "audit log has createdAt timestamp",
    typeof auditLog.createdAt === "string" && auditLog.createdAt.length > 0,
  );

  // If targetId is present, it should be a UUID (typia.assert already enforces this)
  if (auditLog.targetId !== null && auditLog.targetId !== undefined) {
    // Ensure it's a string and non-empty (typia.assert validated the format)
    TestValidator.predicate(
      "audit log targetId present and non-empty",
      typeof auditLog.targetId === "string" && auditLog.targetId.length > 0,
    );
  }

  // 6) Authorization negative test: calling without admin authorization must fail
  // Create an unauthenticated connection (SDK pattern: copy and clear headers)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "unauthenticated caller cannot retrieve admin audit log",
    async () => {
      await api.functional.todoApp.admin.auditLogs.at(unauthConn, {
        auditLogId: requestedAuditLogId,
      });
    },
  );
}
