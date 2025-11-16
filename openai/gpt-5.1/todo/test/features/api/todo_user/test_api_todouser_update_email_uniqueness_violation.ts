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
 * Validate that admin todoUser update enforces email uniqueness and rejects
 * attempts to change a user’s email to another user’s existing email.
 *
 * Business context:
 *
 * - Todo_app_todousers.email is globally unique.
 * - Admins manage todo users via /todoApp/todoAdmin/todoUsers/{todoUserId}.
 * - When updating email, the service must enforce uniqueness and reject conflicts
 *   without mutating the account.
 *
 * Scenario steps:
 *
 * 1. Register a todoAdmin via /auth/todoAdmin/join and obtain an authorized admin
 *    session.
 * 2. As the admin, create at least one Todo status via POST
 *    /todoApp/todoAdmin/todoStatuses for realistic catalog setup.
 * 3. Register two distinct todoUser accounts (userA and userB) via
 *    /auth/todoUser/join, capturing their ids and emails.
 * 4. For each user, while authenticated as that user, create at least one Todo via
 *    POST /todoApp/todoUser/todos to ensure they have associated business
 *    data.
 * 5. Re-authenticate as the todoAdmin via /auth/todoAdmin/login to ensure admin
 *    context.
 * 6. Attempt to update userB’s email via PUT
 *    /todoApp/todoAdmin/todoUsers/{todoUserId}, setting body.email to userA’s
 *    existing email. This should violate the unique constraint.
 * 7. Assert that the update call fails with an HTTP error using
 *    TestValidator.error, without checking specific status codes.
 * 8. Assert precondition that userA and userB had different emails so the
 *    attempted update truly collides with another user’s email.
 */
export async function test_api_todouser_update_email_uniqueness_violation(
  connection: api.IConnection,
) {
  // 1. Register a todoAdmin via /auth/todoAdmin/join
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string = "Admin!234";

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    displayName: RandomGenerator.name(2),
    ip: null,
    href: "https://admin.todoapp.local/join",
    referrer: "https://admin.todoapp.local/",
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const adminAuthorized: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. As admin, create at least one Todo status
  const statusCodeBase: string = RandomGenerator.alphabets(6).toUpperCase();
  const statusCreateBody = {
    code: `ACTIVE_${statusCodeBase}`,
    label: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    group: "core",
    sort_order: 1 as number & tags.Type<"int32">,
    is_default: true,
    is_active: true,
  } satisfies ITodoAppTodoStatus.ICreate;

  const status: ITodoAppTodoStatus =
    await api.functional.todoApp.todoAdmin.todoStatuses.create(connection, {
      body: statusCreateBody,
    });
  typia.assert(status);

  // 3. Register two distinct todoUser accounts
  // 3-1. userA join
  const userAEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const userAPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const userAJoinBody = {
    email: userAEmail,
    password: userAPassword,
    display_name: RandomGenerator.name(2),
    ip: null,
    href: "https://todoapp.local/join/userA",
    referrer: "https://todoapp.local/",
  } satisfies ITodoAppTodoUserJoin.IRequest;

  const userAAuthorized: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: userAJoinBody,
    });
  typia.assert(userAAuthorized);

  const userAId: string & tags.Format<"uuid"> = userAAuthorized.id;
  const userAEmailSnapshot: string & tags.Format<"email"> =
    userAAuthorized.email;

  // 4-1. Create a Todo for userA while authenticated as userA
  const todoARequestBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    status_code: status.code,
  } satisfies ITodoAppTodo.ICreate;

  const todoA: ITodoAppTodo =
    await api.functional.todoApp.todoUser.todos.create(connection, {
      body: todoARequestBody,
    });
  typia.assert(todoA);

  // 3-2. userB join
  const userBEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const userBPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const userBJoinBody = {
    email: userBEmail,
    password: userBPassword,
    display_name: RandomGenerator.name(2),
    ip: null,
    href: "https://todoapp.local/join/userB",
    referrer: "https://todoapp.local/",
  } satisfies ITodoAppTodoUserJoin.IRequest;

  const userBAuthorized: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: userBJoinBody,
    });
  typia.assert(userBAuthorized);

  const userBId: string & tags.Format<"uuid"> = userBAuthorized.id;
  const userBEmailSnapshot: string & tags.Format<"email"> =
    userBAuthorized.email;

  // Ensure precondition that emails are initially different
  TestValidator.notEquals(
    "initial emails of the two todo users must be different",
    userAEmailSnapshot,
    userBEmailSnapshot,
  );

  // 4-2. Create a Todo for userB while authenticated as userB
  const todoBRequestBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    due_date: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    status_code: status.code,
  } satisfies ITodoAppTodo.ICreate;

  const todoB: ITodoAppTodo =
    await api.functional.todoApp.todoUser.todos.create(connection, {
      body: todoBRequestBody,
    });
  typia.assert(todoB);

  // 5. Re-authenticate as todoAdmin via /auth/todoAdmin/login
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.todoapp.local/login",
    referrer: "https://admin.todoapp.local/",
  } satisfies ITodoAppTodoAdminLogin.IRequest;

  const adminLoginAuthorized: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuthorized);

  // 6. Attempt to update userB’s email to userA’s email as admin
  const conflictingUpdateBody = {
    email: userAEmailSnapshot,
  } satisfies ITodoAppTodoUser.IUpdate;

  await TestValidator.error(
    "admin cannot update todoUser email to an existing email of another user",
    async () => {
      await api.functional.todoApp.todoAdmin.todoUsers.update(connection, {
        todoUserId: userBId,
        body: conflictingUpdateBody,
      });
    },
  );

  // 7. With no GET endpoint for todo users, we rely on the fact that the
  //    uniqueness-violating update threw an error and therefore did not
  //    succeed, combined with the precondition that user emails differed
  //    before the attempt.
}
