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
 * Validate creation of a Todo with an explicit non-default status_code.
 *
 * Business context:
 *
 * - TodoAdmin manages the status catalogue used by todoUser Todos.
 * - System may have a default status (e.g., ACTIVE) applied when status_code is
 *   not specified.
 * - This test ensures that when a valid non-default status code (PLANNED) is
 *   explicitly provided, the created Todo uses that status instead of the
 *   default, and that the status flags and lifecycle fields behave correctly.
 *
 * Steps:
 *
 * 1. Register a todoAdmin and obtain an authenticated admin context.
 * 2. As todoAdmin, create two statuses in the catalogue:
 *
 *    - ACTIVE (is_default=true, is_active=true)
 *    - PLANNED (is_default=false, is_active=true)
 * 3. Register a todoUser and authenticate as that user.
 * 4. As todoUser, create a Todo with status_code="PLANNED" and specific
 *    title/description/due_date.
 * 5. Validate that:
 *
 *    - The response is a valid ITodoAppTodo.
 *    - Todo.status.code === "PLANNED".
 *    - Todo.status.is_default === false and todo.status.is_active === true.
 *    - Title, description, and due_date echo the input.
 *    - Created_at and updated_at are populated.
 *    - Completed_at and deleted_at are null.
 */
export async function test_api_todo_creation_with_explicit_status_code(
  connection: api.IConnection,
) {
  // 1. Register todoAdmin (join)
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: "AdminPassw0rd!",
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://todo-app.local/admin/join",
    referrer: "https://todo-app.local/landing",
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const adminAuthorized: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Seed status catalogue as todoAdmin
  // 2-1. ACTIVE default status
  const activeStatusBody = {
    code: "ACTIVE",
    label: "Active",
    description: "Default active status for new todos",
    group: "core",
    sort_order: 1,
    is_default: true,
    is_active: true,
  } satisfies ITodoAppTodoStatus.ICreate;

  const activeStatus: ITodoAppTodoStatus =
    await api.functional.todoApp.todoAdmin.todoStatuses.create(connection, {
      body: activeStatusBody,
    });
  typia.assert(activeStatus);

  // 2-2. PLANNED non-default active status
  const plannedStatusBody = {
    code: "PLANNED",
    label: "Planned",
    description: "Todo planned but not yet started",
    group: "core",
    sort_order: 2,
    is_default: false,
    is_active: true,
  } satisfies ITodoAppTodoStatus.ICreate;

  const plannedStatus: ITodoAppTodoStatus =
    await api.functional.todoApp.todoAdmin.todoStatuses.create(connection, {
      body: plannedStatusBody,
    });
  typia.assert(plannedStatus);

  // Sanity-check seeded statuses
  TestValidator.equals(
    "ACTIVE status configuration is_default/is_active",
    {
      is_default: activeStatus.is_default,
      is_active: activeStatus.is_active,
    },
    {
      is_default: true,
      is_active: true,
    },
  );

  TestValidator.equals(
    "PLANNED status configuration is_default/is_active",
    {
      is_default: plannedStatus.is_default,
      is_active: plannedStatus.is_active,
    },
    {
      is_default: false,
      is_active: true,
    },
  );

  // 3. Register todoUser (join)
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
    ip: "127.0.0.1",
    href: "https://todo-app.local/join",
    referrer: "https://todo-app.local/landing",
  } satisfies ITodoAppTodoUserJoin.IRequest;

  const userAuthorizedFromJoin: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: userJoinBody,
    });
  typia.assert(userAuthorizedFromJoin);

  // 3-2. Login as todoUser (to simulate realistic flow and refresh token)
  const userLoginBody = {
    email: userEmail,
    password: userPassword,
    ip: "127.0.0.1",
    href: "https://todo-app.local/login",
    referrer: "https://todo-app.local/landing",
  } satisfies ITodoAppTodoUserLogin.IRequest;

  const userAuthorizedFromLogin: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.login(connection, {
      body: userLoginBody,
    });
  typia.assert(userAuthorizedFromLogin);

  // 4. Create Todo with explicit status_code="PLANNED"
  const todoTitle = RandomGenerator.paragraph({ sentences: 3 });
  const todoDescription = RandomGenerator.paragraph({ sentences: 6 });
  const now = new Date();
  const inOneDay = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const dueDateIso = inOneDay.toISOString();

  const todoCreateBody = {
    title: todoTitle,
    description: todoDescription,
    due_date: dueDateIso,
    status_code: "PLANNED",
  } satisfies ITodoAppTodo.ICreate;

  const createdTodo: ITodoAppTodo =
    await api.functional.todoApp.todoUser.todos.create(connection, {
      body: todoCreateBody,
    });
  typia.assert(createdTodo);

  // 5. Business validations
  // 5-1. Status code and flags
  TestValidator.equals(
    "todo.status.code should be PLANNED",
    createdTodo.status.code,
    "PLANNED",
  );

  TestValidator.equals(
    "todo.status.is_default should be false for PLANNED",
    createdTodo.status.is_default,
    false,
  );

  TestValidator.equals(
    "todo.status.is_active should be true for PLANNED",
    createdTodo.status.is_active,
    true,
  );

  // 5-2. Payload echo checks
  TestValidator.equals(
    "todo title matches input",
    createdTodo.title,
    todoTitle,
  );

  TestValidator.equals(
    "todo description matches input",
    createdTodo.description,
    todoDescription,
  );

  TestValidator.equals(
    "todo due_date matches input",
    createdTodo.due_date,
    dueDateIso,
  );

  // 5-3. Lifecycle timestamps
  TestValidator.predicate(
    "created_at should be a non-empty string",
    typeof createdTodo.created_at === "string" &&
      createdTodo.created_at.length > 0,
  );

  TestValidator.predicate(
    "updated_at should be a non-empty string",
    typeof createdTodo.updated_at === "string" &&
      createdTodo.updated_at.length > 0,
  );

  // completed_at and deleted_at should be null (or undefined interpreted as null-ish)
  TestValidator.equals(
    "completed_at should be null on new todo",
    createdTodo.completed_at ?? null,
    null,
  );

  TestValidator.equals(
    "deleted_at should be null on new todo",
    createdTodo.deleted_at ?? null,
    null,
  );
}
