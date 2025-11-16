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
 * Validate that a todoAdmin can delete a todo user who owns active todos, and
 * that only admins (not regular todo users) can call the delete endpoint.
 *
 * Business flow:
 *
 * 1. Register a todoAdmin account (join) to obtain an admin session.
 * 2. As admin, create an ACTIVE Todo status so todos can be created with it.
 * 3. Register a todoUser (userA) via todoUser join, capturing its id; join also
 *    logs userA in.
 * 4. As userA, create at least one todo with status_code referencing the ACTIVE
 *    status.
 * 5. Switch back to admin by logging in with the admin credentials.
 * 6. As admin, delete userA using DELETE
 *    /todoApp/todoAdmin/todoUsers/{todoUserId}.
 * 7. Attempt to log in again as userA and expect authentication to fail.
 * 8. Create a second todoUser (userB) and, as userB, attempt to call the admin
 *    delete endpoint; expect this to fail due to missing admin privileges.
 */
export async function test_api_todo_admin_delete_active_user_with_todos(
  connection: api.IConnection,
) {
  // 1. Register a todoAdmin
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string = RandomGenerator.alphabets(12);

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    displayName: RandomGenerator.name(),
    ip: null,
    href: "https://admin.todo-app.example.com/join",
    referrer: "https://admin.todo-app.example.com/",
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const adminJoinOutput: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminJoinOutput);

  // 2. As admin, create an ACTIVE Todo status
  const statusCode = "ACTIVE";
  const statusCreateBody = {
    code: statusCode,
    label: "Active",
    description: "Active todo status for open items",
    group: "core",
    sort_order: 1 as number & tags.Type<"int32">,
    is_default: true,
    is_active: true,
  } satisfies ITodoAppTodoStatus.ICreate;

  const statusOutput: ITodoAppTodoStatus =
    await api.functional.todoApp.todoAdmin.todoStatuses.create(connection, {
      body: statusCreateBody,
    });
  typia.assert(statusOutput);
  TestValidator.equals(
    "created status code should match request",
    statusOutput.code,
    statusCode,
  );

  // 3. Register first todoUser (userA)
  const userAEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const userAPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const userAJoinBody = {
    email: userAEmail,
    password: userAPassword,
    display_name: RandomGenerator.name(),
    ip: null,
    href: "https://todo-app.example.com/join",
    referrer: "https://todo-app.example.com/landing",
  } satisfies ITodoAppTodoUserJoin.IRequest;

  const userAJoinOutput: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: userAJoinBody,
    });
  typia.assert(userAJoinOutput);

  const userAId = userAJoinOutput.id;

  // 4. As userA, create at least one todo
  const todoCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    due_date: new Date().toISOString(),
    status_code: statusCode,
  } satisfies ITodoAppTodo.ICreate;

  const todoOutput: ITodoAppTodo =
    await api.functional.todoApp.todoUser.todos.create(connection, {
      body: todoCreateBody,
    });
  typia.assert(todoOutput);
  TestValidator.equals(
    "created todo should use requested status code",
    todoOutput.status.code,
    statusCode,
  );

  // 5. Switch back to admin via login
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.todo-app.example.com/login",
    referrer: "https://admin.todo-app.example.com/",
  } satisfies ITodoAppTodoAdminLogin.IRequest;

  const adminLoginOutput: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginOutput);
  TestValidator.equals(
    "admin login id should match joined admin id",
    adminLoginOutput.id,
    adminJoinOutput.id,
  );

  // 6. As admin, delete userA
  await api.functional.todoApp.todoAdmin.todoUsers.erase(connection, {
    todoUserId: userAId,
  });

  // 7. Attempt to log in again as userA and expect failure
  const userALoginBody = {
    email: userAEmail,
    password: userAPassword,
    ip: null,
    href: "https://todo-app.example.com/login",
    referrer: "https://todo-app.example.com/landing",
  } satisfies ITodoAppTodoUserLogin.IRequest;

  await TestValidator.error(
    "deleted user should not be able to log in",
    async () => {
      await api.functional.auth.todoUser.login(connection, {
        body: userALoginBody,
      });
    },
  );

  // 8. Create second todoUser (userB) and ensure they cannot call erase
  const userBEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const userBPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const userBJoinBody = {
    email: userBEmail,
    password: userBPassword,
    display_name: RandomGenerator.name(),
    ip: null,
    href: "https://todo-app.example.com/join",
    referrer: "https://todo-app.example.com/landing",
  } satisfies ITodoAppTodoUserJoin.IRequest;

  const userBJoinOutput: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: userBJoinBody,
    });
  typia.assert(userBJoinOutput);

  await TestValidator.error(
    "todoUser actor must not be able to call admin delete user endpoint",
    async () => {
      await api.functional.todoApp.todoAdmin.todoUsers.erase(connection, {
        todoUserId: userAId,
      });
    },
  );
}
