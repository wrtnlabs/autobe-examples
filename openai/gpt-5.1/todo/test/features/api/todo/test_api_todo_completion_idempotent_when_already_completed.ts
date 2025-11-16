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
 * Validate idempotent completion of a todo item.
 *
 * Business goal:
 *
 * - Ensure that completing an already-completed todo via POST
 *   /todoApp/todoUser/todos/{todoId}/complete does not corrupt state and
 *   behaves idempotently: a second completion returns the same completed state
 *   without further side effects.
 *
 * High level steps:
 *
 * 1. Register and log in a todoAdmin account.
 * 2. Using the admin, create two Todo statuses in the catalogue: ACTIVE and
 *    COMPLETED.
 * 3. Register and log in a todoUser account.
 * 4. As the todoUser, create a new todo (which will start in ACTIVE or default
 *    status).
 * 5. Complete the todo once and assert it is marked as completed with completed_at
 *    set.
 * 6. Immediately call complete again on the same todo.
 * 7. Assert that:
 *
 *    - The todo id remains the same.
 *    - Completed_at is still non-null and equal to the first completion's value.
 *    - Deleted_at stays null.
 *    - Core fields (title, description, due_date, status.code) are unchanged between
 *         the first and second completion responses.
 */
export async function test_api_todo_completion_idempotent_when_already_completed(
  connection: api.IConnection,
) {
  // 1. Register todoAdmin via /auth/todoAdmin/join (auto-login via SDK)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.todo-app.test/join" as string & tags.Format<"uri">,
    referrer: "https://admin.todo-app.test/" as string & tags.Format<"uri">,
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const adminAuthorized: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create ACTIVE and COMPLETED statuses via admin API
  const activeStatusBody = {
    code: "ACTIVE",
    label: "Active",
    description: "Active todo that is not yet completed",
    group: "core",
    sort_order: 1 as number & tags.Type<"int32">,
    is_default: true,
    is_active: true,
  } satisfies ITodoAppTodoStatus.ICreate;

  const activeStatus: ITodoAppTodoStatus =
    await api.functional.todoApp.todoAdmin.todoStatuses.create(connection, {
      body: activeStatusBody,
    });
  typia.assert(activeStatus);

  const completedStatusBody = {
    code: "COMPLETED",
    label: "Completed",
    description: "Completed todo",
    group: "core",
    sort_order: 2 as number & tags.Type<"int32">,
    is_default: false,
    is_active: true,
  } satisfies ITodoAppTodoStatus.ICreate;

  const completedStatus: ITodoAppTodoStatus =
    await api.functional.todoApp.todoAdmin.todoStatuses.create(connection, {
      body: completedStatusBody,
    });
  typia.assert(completedStatus);

  // Sanity check: created statuses
  TestValidator.equals(
    "ACTIVE status code",
    activeStatus.code,
    activeStatusBody.code,
  );
  TestValidator.equals(
    "COMPLETED status code",
    completedStatus.code,
    completedStatusBody.code,
  );

  // 3. Register todoUser via /auth/todoUser/join (auto-login via SDK)
  const userJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12) as string & tags.Format<"password">,
    display_name: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://todo-app.test/join" as string & tags.Format<"uri">,
    referrer: "https://todo-app.test/" as string & tags.Format<"uri">,
  } satisfies ITodoAppTodoUserJoin.IRequest;

  const userAuthorized: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: userJoinBody,
    });
  typia.assert(userAuthorized);

  // 4. Create a new todo as todoUser (let backend default the status or use ACTIVE)
  const todoCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    due_date: new Date().toISOString() as string & tags.Format<"date-time">,
    status_code: activeStatus.code,
  } satisfies ITodoAppTodo.ICreate;

  const createdTodo: ITodoAppTodo =
    await api.functional.todoApp.todoUser.todos.create(connection, {
      body: todoCreateBody,
    });
  typia.assert(createdTodo);

  // Validate initial todo state
  TestValidator.equals(
    "created todo title matches request",
    createdTodo.title,
    todoCreateBody.title,
  );
  TestValidator.equals(
    "created todo description matches request",
    createdTodo.description ?? null,
    todoCreateBody.description ?? null,
  );
  TestValidator.equals(
    "created todo due_date matches request",
    createdTodo.due_date ?? null,
    todoCreateBody.due_date ?? null,
  );
  TestValidator.equals(
    "created todo deleted_at is null",
    createdTodo.deleted_at ?? null,
    null,
  );
  TestValidator.equals(
    "created todo completed_at is null",
    createdTodo.completed_at ?? null,
    null,
  );

  // 5. First completion call
  const firstCompleted: ITodoAppTodo =
    await api.functional.todoApp.todoUser.todos.complete(connection, {
      todoId: createdTodo.id,
    });
  typia.assert(firstCompleted);

  TestValidator.equals(
    "first completion todo id matches created",
    firstCompleted.id,
    createdTodo.id,
  );
  TestValidator.predicate(
    "first completion completed_at is non-null",
    firstCompleted.completed_at !== null &&
      firstCompleted.completed_at !== undefined,
  );
  TestValidator.equals(
    "first completion deleted_at remains null",
    firstCompleted.deleted_at ?? null,
    null,
  );

  const completedAtAfterFirst = firstCompleted.completed_at ?? null;
  const statusCodeAfterFirst = firstCompleted.status.code;

  // 6. Second completion call (idempotency check)
  const secondCompleted: ITodoAppTodo =
    await api.functional.todoApp.todoUser.todos.complete(connection, {
      todoId: createdTodo.id,
    });
  typia.assert(secondCompleted);

  // 7. Idempotency validations
  TestValidator.equals(
    "second completion todo id matches created",
    secondCompleted.id,
    createdTodo.id,
  );
  TestValidator.equals(
    "completed_at is stable between first and second completion",
    secondCompleted.completed_at ?? null,
    completedAtAfterFirst,
  );
  TestValidator.equals(
    "second completion deleted_at remains null",
    secondCompleted.deleted_at ?? null,
    null,
  );

  // Fields unchanged relative to first completion
  TestValidator.equals(
    "title unchanged between first and second completion",
    secondCompleted.title,
    firstCompleted.title,
  );
  TestValidator.equals(
    "description unchanged between first and second completion",
    secondCompleted.description ?? null,
    firstCompleted.description ?? null,
  );
  TestValidator.equals(
    "due_date unchanged between first and second completion",
    secondCompleted.due_date ?? null,
    firstCompleted.due_date ?? null,
  );
  TestValidator.equals(
    "status code unchanged between first and second completion",
    secondCompleted.status.code,
    statusCodeAfterFirst,
  );
}
