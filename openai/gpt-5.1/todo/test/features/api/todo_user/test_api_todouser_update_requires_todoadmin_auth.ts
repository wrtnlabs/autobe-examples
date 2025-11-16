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
 * Verify that updating a todo user account via admin endpoint requires proper
 * todoAdmin authentication and rejects unauthenticated or
 * todoUser-authenticated requests.
 *
 * Business workflow:
 *
 * 1. Register a todoUser account via /auth/todoUser/join and obtain its id.
 * 2. As that todoUser, create a Todo via /todoApp/todoUser/todos to ensure the
 *    account is active and realistic.
 * 3. Attempt to call PUT /todoApp/todoAdmin/todoUsers/{todoUserId} with a fresh
 *    unauthenticated connection (no Authorization header). Expect an
 *    authorization error and assert that some error is thrown.
 * 4. While still authenticated as the todoUser on the main connection, attempt the
 *    same admin update call. This must also fail because the endpoint is
 *    restricted to todoAdmin; assert error again.
 * 5. Register a new todoAdmin via /auth/todoAdmin/join, which attaches an admin
 *    JWT token to the shared connection headers.
 * 6. As authenticated todoAdmin, successfully call the same update endpoint with a
 *    valid ITodoAppTodoUser.IUpdate payload that changes email, display_name,
 *    and status.
 * 7. Validate that the update succeeds, that the returned ITodoAppTodoUser has the
 *    same id but reflects the new values, and that typia.assert passes on the
 *    response.
 */
export async function test_api_todouser_update_requires_todoadmin_auth(
  connection: api.IConnection,
) {
  // 1. Register a todoUser account
  const todoUserEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const todoUserJoinBody = {
    email: todoUserEmail,
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    ip: null,
    href: "https://todo-app.example.com/join", // URI format string
    referrer: "https://todo-app.example.com/landing",
  } satisfies ITodoAppTodoUserJoin.IRequest;

  const todoUserAuthorized = await api.functional.auth.todoUser.join(
    connection,
    {
      body: todoUserJoinBody,
    },
  );
  typia.assert(todoUserAuthorized);

  const todoUserId = todoUserAuthorized.id;

  // 2. As this todoUser, create a Todo to simulate an active account
  const todoCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    due_date: new Date().toISOString(),
    status_code: null,
  } satisfies ITodoAppTodo.ICreate;

  const createdTodo: ITodoAppTodo =
    await api.functional.todoApp.todoUser.todos.create(connection, {
      body: todoCreateBody,
    });
  typia.assert(createdTodo);

  // 3. Attempt admin update with unauthenticated connection
  const unauthConn: api.IConnection = {
    ...connection,
    headers: {},
  };

  const firstUpdateBody = {
    display_name: RandomGenerator.name(),
    status: "suspended",
  } satisfies ITodoAppTodoUser.IUpdate;

  await TestValidator.error(
    "unauthenticated client cannot update todo user via admin endpoint",
    async () => {
      await api.functional.todoApp.todoAdmin.todoUsers.update(unauthConn, {
        todoUserId,
        body: firstUpdateBody,
      });
    },
  );

  // 4. Attempt admin update while authenticated only as todoUser
  const secondUpdateBody = {
    display_name: RandomGenerator.name(),
    status: "closed",
  } satisfies ITodoAppTodoUser.IUpdate;

  await TestValidator.error(
    "todoUser-authenticated client cannot call admin todoUser update",
    async () => {
      await api.functional.todoApp.todoAdmin.todoUsers.update(connection, {
        todoUserId,
        body: secondUpdateBody,
      });
    },
  );

  // 5. Register a new todoAdmin (this will log in as admin on the main connection)
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminJoinBody = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: null,
    href: "https://todo-app.example.com/admin/join",
    referrer: "https://todo-app.example.com/admin",
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const adminAuthorized: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 6. Perform authorized admin update
  const newEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminUpdateBody = {
    email: newEmail,
    display_name: RandomGenerator.name(),
    status: "active",
  } satisfies ITodoAppTodoUser.IUpdate;

  const updatedUser: ITodoAppTodoUser =
    await api.functional.todoApp.todoAdmin.todoUsers.update(connection, {
      todoUserId,
      body: adminUpdateBody,
    });
  typia.assert(updatedUser);

  // 7. Validate that the user id is unchanged and fields reflect the update
  TestValidator.equals(
    "updated user id matches original todoUser id",
    updatedUser.id,
    todoUserId,
  );

  if (adminUpdateBody.email !== undefined) {
    TestValidator.equals(
      "updated user email matches admin update payload",
      updatedUser.email,
      adminUpdateBody.email,
    );
  }

  if (adminUpdateBody.display_name !== undefined) {
    TestValidator.equals(
      "updated user display_name matches admin update payload",
      updatedUser.display_name ?? null,
      adminUpdateBody.display_name,
    );
  }

  if (adminUpdateBody.status !== undefined) {
    TestValidator.equals(
      "updated user status matches admin update payload",
      updatedUser.status,
      adminUpdateBody.status,
    );
  }
}
