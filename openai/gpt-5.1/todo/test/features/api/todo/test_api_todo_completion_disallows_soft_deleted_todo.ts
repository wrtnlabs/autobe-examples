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
 * Validate that soft-deleted todos cannot be completed.
 *
 * Business goal:
 *
 * - Ensure that once a todo has been logically deleted (via the erase endpoint),
 *   the completion endpoint refuses to change its state and instead returns an
 *   error.
 *
 * Scenario steps:
 *
 * 1. Admin joins and authenticates, then creates two Todo status catalogue entries
 *    (ACTIVE and COMPLETED) so completion has a well-defined target status
 *    available in the system.
 * 2. Todo user joins (self-registration) to establish an authenticated end-user
 *    context who will own todos.
 * 3. Under the todoUser session, create a Todo item with an ACTIVE status.
 * 4. Positive control: call complete() on this live todoId and assert that the
 *    call succeeds, returning an ITodoAppTodo whose completed_at field is
 *    non-null (indicating completion took effect).
 * 5. Create a second Todo item, then erase() it with the same authenticated
 *    todoUser, simulating a soft deletion.
 * 6. Attempt to call complete() on the erased todoId and assert, via
 *    TestValidator.error, that the operation fails, proving that logically
 *    deleted todos cannot be completed.
 */
export async function test_api_todo_completion_disallows_soft_deleted_todo(
  connection: api.IConnection,
) {
  // 1. Admin joins and authenticates
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: null,
    href: "https://admin.todo-app.test/join",
    referrer: "https://admin.todo-app.test/landing",
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const adminAuthorized: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Admin creates ACTIVE and COMPLETED statuses
  const activeStatusBody = {
    code: "ACTIVE",
    label: "Active",
    description: "Active todo",
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

  // 3. Todo user joins and gets authenticated session
  const userJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    ip: null,
    href: "https://todo-app.test/join",
    referrer: "https://todo-app.test/landing",
  } satisfies ITodoAppTodoUserJoin.IRequest;

  const userAuthorized: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: userJoinBody,
    });
  typia.assert(userAuthorized);

  // 4. Create a live todo and complete it successfully (positive control)
  const liveTodoCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    due_date: null,
    status_code: "ACTIVE",
  } satisfies ITodoAppTodo.ICreate;

  const liveTodo: ITodoAppTodo =
    await api.functional.todoApp.todoUser.todos.create(connection, {
      body: liveTodoCreateBody,
    });
  typia.assert(liveTodo);

  const completedLiveTodo: ITodoAppTodo =
    await api.functional.todoApp.todoUser.todos.complete(connection, {
      todoId: liveTodo.id,
    });
  typia.assert(completedLiveTodo);

  TestValidator.predicate(
    "live todo should be marked completed",
    completedLiveTodo.completed_at !== null &&
      completedLiveTodo.completed_at !== undefined,
  );

  // 5. Create another todo and erase it to simulate soft deletion
  const deletedTodoCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: null,
    due_date: null,
    status_code: "ACTIVE",
  } satisfies ITodoAppTodo.ICreate;

  const deletedTodo: ITodoAppTodo =
    await api.functional.todoApp.todoUser.todos.create(connection, {
      body: deletedTodoCreateBody,
    });
  typia.assert(deletedTodo);

  await api.functional.todoApp.todoUser.todos.erase(connection, {
    todoId: deletedTodo.id,
  });

  // 6. Attempt to complete the erased todo and assert it fails
  await TestValidator.error("cannot complete a soft-deleted todo", async () => {
    await api.functional.todoApp.todoUser.todos.complete(connection, {
      todoId: deletedTodo.id,
    });
  });
}
