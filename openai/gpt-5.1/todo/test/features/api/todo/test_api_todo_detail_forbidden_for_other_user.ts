import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import type { ITodoAppTodoAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminJoin";
import type { ITodoAppTodoAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminLogin";
import type { ITodoAppTodoStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoStatus";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import type { ITodoAppTodoUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUserJoin";
import type { ITodoAppTodoUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUserLogin";

/**
 * Verify that a todoUser cannot read another user's Todo detail.
 *
 * Business flow:
 *
 * 1. Register owner A as todoUser (join) and obtain authenticated context.
 * 2. Register a todoAdmin and create an active default Todo status.
 * 3. Log back in as owner A and create a Todo bound to the created status.
 * 4. Register a second todoUser (user B), who becomes the current actor.
 * 5. As user B, attempt to GET owner A's Todo detail by its todoId and expect an
 *    authorization-related HttpError (403 or 404), never a 200 success.
 * 6. Log back in as owner A and confirm that the Todo detail can still be
 *    retrieved successfully and matches the originally created record.
 */
export async function test_api_todo_detail_forbidden_for_other_user(
  connection: api.IConnection,
) {
  // 1. Register owner A and obtain authorized context
  const ownerAEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const ownerAPassword: string = "OwnerA-Password-1234";

  const ownerAJoinBody = {
    email: ownerAEmail,
    password: ownerAPassword,
    display_name: "Owner A",
    ip: null,
    href: "https://todo-app.local/join",
    referrer: "https://todo-app.local/landing",
  } satisfies ITodoAppTodoUserJoin.IRequest;

  const ownerA: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: ownerAJoinBody,
    });
  typia.assert(ownerA);

  // 2. Register todoAdmin and obtain admin context
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string = "Admin-Password-5678";

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    displayName: "Administrator",
    ip: null,
    href: "https://todo-app.local/admin/join",
    referrer: "https://todo-app.local/admin/landing",
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const admin: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 3. Create a default active Todo status as admin
  const statusCreateBody = {
    code: "ACTIVE",
    label: "Active",
    description: "Active default status for todos",
    group: "core",
    sort_order: 1,
    is_default: true,
    is_active: true,
  } satisfies ITodoAppTodoStatus.ICreate;

  const status: ITodoAppTodoStatus =
    await api.functional.todoApp.todoAdmin.todoStatuses.create(connection, {
      body: statusCreateBody,
    });
  typia.assert(status);

  // 4. Switch back to owner A via login to ensure context
  const ownerALoginBody = {
    email: ownerAEmail,
    password: ownerAPassword,
    ip: null,
    href: "https://todo-app.local/login",
    referrer: "https://todo-app.local/landing",
  } satisfies ITodoAppTodoUserLogin.IRequest;

  const ownerALogin: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.login(connection, {
      body: ownerALoginBody,
    });
  typia.assert(ownerALogin);

  // 5. Owner A creates a Todo
  const todoCreateBody = {
    title: "Owner A Todo",
    description: "Todo owned by user A",
    due_date: null,
    status_code: status.code,
  } satisfies ITodoAppTodo.ICreate;

  const todoA: ITodoAppTodo =
    await api.functional.todoApp.todoUser.todos.create(connection, {
      body: todoCreateBody,
    });
  typia.assert(todoA);

  const todoIdA = todoA.id;

  // 6. Register user B (new todoUser), becoming current actor
  const userBEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const userBPassword: string = "UserB-Password-9012";

  const userBJoinBody = {
    email: userBEmail,
    password: userBPassword,
    display_name: "User B",
    ip: null,
    href: "https://todo-app.local/join",
    referrer: "https://todo-app.local/landing",
  } satisfies ITodoAppTodoUserJoin.IRequest;

  const userB: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: userBJoinBody,
    });
  typia.assert(userB);

  // 7. User B attempts to access owner A's Todo and must receive 403 or 404
  await TestValidator.httpError(
    "other user cannot access foreign todo detail",
    [403, 404],
    async () => {
      await api.functional.todoApp.todoUser.todos.at(connection, {
        todoId: todoIdA,
      });
    },
  );

  // 8. Switch back to owner A and confirm the Todo is still accessible
  const ownerALoginAgainBody = {
    email: ownerAEmail,
    password: ownerAPassword,
    ip: null,
    href: "https://todo-app.local/login",
    referrer: "https://todo-app.local/landing",
  } satisfies ITodoAppTodoUserLogin.IRequest;

  const ownerALoginAgain: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.login(connection, {
      body: ownerALoginAgainBody,
    });
  typia.assert(ownerALoginAgain);

  const todoAReloaded: ITodoAppTodo =
    await api.functional.todoApp.todoUser.todos.at(connection, {
      todoId: todoIdA,
    });
  typia.assert(todoAReloaded);

  TestValidator.equals(
    "owner A can still read own todo after forbidden access attempt by B",
    todoAReloaded.id,
    todoA.id,
  );
}
