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
 * Admin can inspect detailed information of a concrete todo user by ID.
 *
 * Business context
 *
 * - TodoAdmin operators need to view a specific todo user account with lifecycle
 *   metadata but must never see password hashes or secrets.
 * - This inspection is done via GET /todoApp/todoAdmin/todoUsers/{todoUserId},
 *   which returns ITodoAppTodoUser (a safe projection of todo_app_todousers).
 *
 * Steps
 *
 * 1. Register a new todoAdmin using /auth/todoAdmin/join (admin self-signup).
 *
 *    - This issues an ITodoAppTodoAdmin.IAuthorized payload and sets the admin
 *         access token on the connection.
 * 2. Using the admin token, create an ACTIVE todo status via POST
 *    /todoApp/todoAdmin/todoStatuses so that later todos can be created with a
 *    valid status_code.
 * 3. Register a new todoUser using /auth/todoUser/join.
 *
 *    - Capture ITodoAppTodoUser.IAuthorized.id and .email as the target.
 * 4. While authenticated as that todoUser (join call already set token), create a
 *    Todo via POST /todoApp/todoUser/todos with status_code set to the ACTIVE
 *    status created in step 2.
 *
 *    - This ensures the user has real business data (a Todo) in the system.
 * 5. Switch the connection back to todoAdmin by calling /auth/todoAdmin/login with
 *    the admin’s email/password.
 * 6. As the authenticated admin, call GET
 *    /todoApp/todoAdmin/todoUsers/{todoUserId} with the id from step 3.
 * 7. Validate the response:
 *
 *    - Typia.assert(output) to ensure it is ITodoAppTodoUser.
 *    - The id matches the todoUser’s id from join.
 *    - The email matches the todoUser’s email from join.
 *    - Status, created_at, updated_at fields are present and well-typed.
 *    - Last_login_at is either null/undefined or a valid date-time string according
 *         to the DTO.
 *    - There is no password_hash field by construction of the DTO.
 */
export async function test_api_todouser_detail_view_by_todoadmin(
  connection: api.IConnection,
) {
  // 1. Register a todoAdmin (self-signup) and obtain admin auth context
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string = RandomGenerator.alphabets(12);

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    displayName: RandomGenerator.name(2),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const adminAuthorized: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  TestValidator.equals(
    "admin email matches join email",
    adminAuthorized.email,
    adminEmail,
  );

  // 2. Create an ACTIVE todo status as admin
  const statusCode = "ACTIVE";
  const statusCreateBody = {
    code: statusCode,
    label: "Active",
    description: "Active todo status for normal tasks",
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

  TestValidator.equals(
    "created todo status code matches request",
    status.code,
    statusCode,
  );

  // 3. Register a new todoUser
  const userEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const userPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const userJoinBody = {
    email: userEmail,
    password: userPassword,
    display_name: RandomGenerator.name(2),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppTodoUserJoin.IRequest;

  const userAuthorized: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: userJoinBody,
    });
  typia.assert(userAuthorized);

  TestValidator.equals(
    "todoUser email matches join email",
    userAuthorized.email,
    userEmail,
  );

  // 4. Create a Todo as the authenticated todoUser
  const todoCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    due_date: new Date().toISOString(),
    status_code: status.code,
  } satisfies ITodoAppTodo.ICreate;

  const todo: ITodoAppTodo = await api.functional.todoApp.todoUser.todos.create(
    connection,
    {
      body: todoCreateBody,
    },
  );
  typia.assert(todo);

  TestValidator.equals(
    "created todo status code matches requested status_code",
    todo.status.code,
    status.code,
  );

  // 5. Switch back to admin by logging in with admin credentials
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppTodoAdminLogin.IRequest;

  const adminLoggedIn: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  TestValidator.equals(
    "admin id remains consistent between join and login",
    adminLoggedIn.id,
    adminAuthorized.id,
  );

  // 6. As admin, fetch the todoUser detail by id
  const inspectedUser: ITodoAppTodoUser =
    await api.functional.todoApp.todoAdmin.todoUsers.at(connection, {
      todoUserId: userAuthorized.id,
    });
  typia.assert(inspectedUser);

  // 7. Validate identity and lifecycle fields
  TestValidator.equals(
    "inspected todoUser id matches authorized todoUser id",
    inspectedUser.id,
    userAuthorized.id,
  );

  TestValidator.equals(
    "inspected todoUser email matches authorized todoUser email",
    inspectedUser.email,
    userAuthorized.email,
  );

  TestValidator.predicate(
    "inspected todoUser has non-empty status string",
    inspectedUser.status.length > 0,
  );

  TestValidator.predicate(
    "inspected todoUser created_at is a non-empty string",
    inspectedUser.created_at.length > 0,
  );

  TestValidator.predicate(
    "inspected todoUser updated_at is a non-empty string",
    inspectedUser.updated_at.length > 0,
  );
}
