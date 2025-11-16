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
 * Validate that admin audit detail lookup fails when todoId and auditId do not
 * match.
 *
 * Business intent:
 *
 * - Protect administrative audit records from being fetched under an unrelated
 *   todo.
 * - Even fully authenticated administrators must not be able to pair an arbitrary
 *   todoId with an arbitrary auditId and get back audit details.
 *
 * Scenario steps (rewritten to match available APIs and constraints):
 *
 * 1. Register a todoAdmin via /auth/todoAdmin/join and obtain an authorized
 *    context.
 * 2. Optionally re-login the admin via /auth/todoAdmin/login to exercise that
 *    path.
 * 3. As the admin, create a Todo status via /todoApp/todoAdmin/todoStatuses.create
 *    to ensure the catalogue has at least one usable status.
 * 4. Register a todoUser via /auth/todoUser/join and obtain an authorized context.
 * 5. Optionally re-login the todoUser via /auth/todoUser/login.
 * 6. As the todoUser, create two todos via /todoApp/todoUser/todos.create,
 *    yielding todoA and todoB.
 * 7. Switch back to the admin account with /auth/todoAdmin/login.
 * 8. Call GET /todoApp/todoAdmin/todos/{todoId}/adminAudits/{auditId} using
 *
 *    - TodoId = todoB.id
 *    - AuditId = a freshly generated random UUID which is extremely unlikely to
 *         correspond to any existing audit row, and certainly not to an audit
 *         tied to todoB.
 * 9. Wrap the audit detail call in TestValidator.error and assert that an error is
 *    thrown (business not-found or equivalent), without checking specific HTTP
 *    status codes or error bodies.
 *
 * Validation focus:
 *
 * - The combination of (todoId, auditId) that does not represent a real ownership
 *   pair must not return a successful ITodoAppTodoAdminAudit.
 * - The endpoint should behave as a not-found style failure for mismatched
 *   ownership, preventing cross-todo access even for administrators.
 */
export async function test_api_todo_admin_audit_detail_not_found_for_mismatched_todo(
  connection: api.IConnection,
) {
  // 1. Register a todoAdmin (join)
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string = RandomGenerator.alphaNumeric(16);

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    displayName: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const adminAuthorizedFromJoin: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorizedFromJoin);

  // 2. Re-login as todoAdmin (login)
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppTodoAdminLogin.IRequest;

  const adminAuthorizedFromLogin: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAuthorizedFromLogin);

  // 3. As admin, create a Todo status
  const statusCreateBody = {
    code: "ACTIVE",
    label: "Active",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    group: null,
    sort_order: typia.random<number & tags.Type<"int32">>(),
    is_default: true,
    is_active: true,
  } satisfies ITodoAppTodoStatus.ICreate;

  const createdStatus: ITodoAppTodoStatus =
    await api.functional.todoApp.todoAdmin.todoStatuses.create(connection, {
      body: statusCreateBody,
    });
  typia.assert(createdStatus);

  // 4. Register a todoUser (join)
  const userEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const userPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const userJoinBody = {
    email: userEmail,
    password: userPassword,
    display_name: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppTodoUserJoin.IRequest;

  const userAuthorizedFromJoin: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: userJoinBody,
    });
  typia.assert(userAuthorizedFromJoin);

  // 5. Optionally re-login the todoUser
  const userLoginBody = {
    email: userEmail,
    password: userPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppTodoUserLogin.IRequest;

  const userAuthorizedFromLogin: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.login(connection, {
      body: userLoginBody,
    });
  typia.assert(userAuthorizedFromLogin);

  // 6. As todoUser, create two todos
  const todoCreateBodyA = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    due_date: null,
    status_code: createdStatus.code,
  } satisfies ITodoAppTodo.ICreate;

  const todoA: ITodoAppTodo =
    await api.functional.todoApp.todoUser.todos.create(connection, {
      body: todoCreateBodyA,
    });
  typia.assert(todoA);

  const todoCreateBodyB = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    due_date: null,
    status_code: createdStatus.code,
  } satisfies ITodoAppTodo.ICreate;

  const todoB: ITodoAppTodo =
    await api.functional.todoApp.todoUser.todos.create(connection, {
      body: todoCreateBodyB,
    });
  typia.assert(todoB);

  // 7. Switch back to admin account
  const adminReLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppTodoAdminLogin.IRequest;

  const adminAuthorizedFromReLogin: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.login(connection, {
      body: adminReLoginBody,
    });
  typia.assert(adminAuthorizedFromReLogin);

  // 8. Prepare mismatched todoId/auditId pair
  const mismatchedTodoId: string & tags.Format<"uuid"> = todoB.id;
  const randomAuditId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 9. Expect an error when fetching audit detail with mismatched pair
  await TestValidator.error(
    "mismatched todoId and auditId must result in error",
    async () => {
      await api.functional.todoApp.todoAdmin.todos.adminAudits.at(connection, {
        todoId: mismatchedTodoId,
        auditId: randomAuditId,
      });
    },
  );
}
