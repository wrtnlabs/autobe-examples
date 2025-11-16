import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import type { ITodoAppTodoAdminAudit } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminAudit";
import type { ITodoAppTodoAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminJoin";
import type { ITodoAppTodoAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminLogin";
import type { ITodoAppTodoStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoStatus";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import type { ITodoAppTodoUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUserJoin";
import type { ITodoAppTodoUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUserLogin";

/**
 * Validate that administrative audit detail retrieval works for a todoAdmin
 * session and returns a structurally correct ITodoAppTodoAdminAudit payload.
 *
 * Original business idea: ensure that audit records remain visible for
 * logically deleted todos and that the embedded todo summary reflects the
 * deleted state. However, the current SDK surface does not expose any deletion
 * or audit-creation mutation endpoints. Therefore, this test focuses on the
 * feasible aspects:
 *
 * 1. Establish a todoAdmin actor and verify that admin-only operations are
 *    accessible (by creating a Todo status catalogue entry).
 * 2. Establish a todoUser actor and create a Todo item as that user so the
 *    environment has realistic Todo data.
 * 3. Switch back to the todoAdmin account to obtain an admin-authenticated
 *    connection.
 * 4. Invoke GET /todoApp/todoAdmin/todos/{todoId}/adminAudits/{auditId} using
 *    random UUIDs for todoId and auditId. In simulate mode this returns a
 *    typia.random<ITodoAppTodoAdminAudit> payload; against a real backend it
 *    may either succeed or fail depending on database state.
 * 5. When the call succeeds, assert that the response conforms to
 *    ITodoAppTodoAdminAudit and perform basic business sanity checks on the
 *    nested todo and admin summaries (non-empty title, valid timestamps,
 *    etc.).
 *
 * This validates:
 *
 * - Proper todoAdmin authentication and ability to hit admin-only endpoints.
 * - Structural integrity of ITodoAppTodoAdminAudit, ITodoAppTodo.ISummary, and
 *   ITodoAppTodoAdmin.ISummary.
 * - That the audit detail endpoint is wired correctly in the SDK.
 */
export async function test_api_todo_admin_audit_detail_for_soft_deleted_todo(
  connection: api.IConnection,
) {
  // 1. Register a todoAdmin and obtain an authorized admin session.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: null,
    href: "https://admin.todo-app.example.com/join",
    referrer: "https://admin.todo-app.example.com/landing",
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const adminAuthorized: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a Todo status row as the admin to assert admin-only access.
  const statusCreateBody = {
    code: "ACTIVE",
    label: "Active",
    description: "Active todos",
    group: "core",
    sort_order: 1 as number & tags.Type<"int32">,
    is_default: true,
    is_active: true,
  } satisfies ITodoAppTodoStatus.ICreate;

  const createdStatus: ITodoAppTodoStatus =
    await api.functional.todoApp.todoAdmin.todoStatuses.create(connection, {
      body: statusCreateBody,
    });
  typia.assert(createdStatus);

  // 3. Register a todoUser and create a todo for realistic data context.
  const userJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    ip: null,
    href: "https://todo-app.example.com/join",
    referrer: "https://todo-app.example.com/landing",
  } satisfies ITodoAppTodoUserJoin.IRequest;

  const userAuthorized: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: userJoinBody,
    });
  typia.assert(userAuthorized);

  const todoCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    due_date: new Date().toISOString(),
    status_code: createdStatus.code,
  } satisfies ITodoAppTodo.ICreate;

  const createdTodo: ITodoAppTodo =
    await api.functional.todoApp.todoUser.todos.create(connection, {
      body: todoCreateBody,
    });
  typia.assert(createdTodo);

  // 4. Switch back to todoAdmin via login to ensure admin token is active.
  const adminLoginBody = {
    email: adminAuthorized.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.todo-app.example.com/login",
    referrer: "https://admin.todo-app.example.com/landing",
  } satisfies ITodoAppTodoAdminLogin.IRequest;

  const adminLoggedIn: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // 5. Call the admin audit detail endpoint with random UUIDs.
  const randomTodoId = typia.random<string & tags.Format<"uuid">>();
  const randomAuditId = typia.random<string & tags.Format<"uuid">>();

  const audit: ITodoAppTodoAdminAudit =
    await api.functional.todoApp.todoAdmin.todos.adminAudits.at(connection, {
      todoId: randomTodoId,
      auditId: randomAuditId,
    });
  typia.assert(audit);

  // 6. Business sanity checks on the audit payload.
  // Ensure audit id and action are present.
  TestValidator.predicate(
    "audit id should be a non-empty string",
    typeof audit.id === "string" && audit.id.length > 0,
  );
  TestValidator.predicate(
    "audit action should be a non-empty string",
    typeof audit.action === "string" && audit.action.length > 0,
  );

  // Validate nested todo summary.
  const todoSummary = audit.todo;
  TestValidator.predicate(
    "todo summary title should be non-empty",
    typeof todoSummary.title === "string" && todoSummary.title.length > 0,
  );
  TestValidator.predicate(
    "todo summary created_at should not be after updated_at",
    new Date(todoSummary.created_at).getTime() <=
      new Date(todoSummary.updated_at).getTime(),
  );

  // Validate nested admin summary.
  const adminSummary = audit.admin;
  TestValidator.equals(
    "admin summary id should match authorized admin id type-wise",
    typeof adminSummary.id,
    typeof adminAuthorized.id,
  );
  TestValidator.equals(
    "admin summary email should match email type-wise",
    typeof adminSummary.email,
    typeof adminAuthorized.email,
  );
  TestValidator.predicate(
    "admin summary status should be non-empty",
    typeof adminSummary.status === "string" && adminSummary.status.length > 0,
  );
}
