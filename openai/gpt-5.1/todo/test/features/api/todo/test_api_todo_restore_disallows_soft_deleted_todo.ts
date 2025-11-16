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
 * Verify that restoring a soft-deleted todo is disallowed.
 *
 * Business objective:
 *
 * - Ensure that the restore endpoint `/todoApp/todoUser/todos/{todoId}/restore`
 *   only works for non-deleted todos and that, once a todo is soft-deleted,
 *   restore cannot bring it back.
 *
 * Scenario:
 *
 * 1. Create a todoUser (owner) via /auth/todoUser/join.
 * 2. Create a todoAdmin via /auth/todoAdmin/join.
 * 3. As admin, configure ACTIVE and COMPLETED statuses via
 *    /todoApp/todoAdmin/todoStatuses.
 * 4. Switch back to the todoUser via /auth/todoUser/login.
 * 5. Create a todo as the todoUser via /todoApp/todoUser/todos with status_code
 *    "ACTIVE".
 * 6. Complete the todo via /todoApp/todoUser/todos/{todoId}/complete.
 * 7. Soft-delete the todo via DELETE /todoApp/todoUser/todos/{todoId}.
 * 8. Attempt to restore the deleted todo via
 *    /todoApp/todoUser/todos/{todoId}/restore.
 * 9. Assert that restore throws an error and does not succeed.
 * 10. Optionally attempt to complete the deleted todo again and assert that it also
 *     fails, reinforcing that soft-deleted todos are immutable.
 */
export async function test_api_todo_restore_disallows_soft_deleted_todo(
  connection: api.IConnection,
) {
  // 1. Register todoUser (owner) and obtain authenticated context
  const todoUserJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppTodoUserJoin.IRequest;

  const todoUserAuthorized: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: todoUserJoinBody,
    });
  typia.assert(todoUserAuthorized);

  // 2. Register todoAdmin and authenticate as admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const adminAuthorized: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 3. As admin, configure ACTIVE and COMPLETED statuses
  const activeStatusBody = {
    code: "ACTIVE",
    label: "Active",
    description: RandomGenerator.paragraph({ sentences: 3 }),
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
    description: RandomGenerator.paragraph({ sentences: 3 }),
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

  // 4. Switch back to todoUser explicitly via login
  const todoUserLoginBody = {
    email: todoUserAuthorized.email,
    password: todoUserJoinBody.password,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppTodoUserLogin.IRequest;

  const reauthorizedTodoUser: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.login(connection, {
      body: todoUserLoginBody,
    });
  typia.assert(reauthorizedTodoUser);

  // 5. Create a todo with ACTIVE status
  const createTodoBody = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    due_date: RandomGenerator.date(
      new Date(),
      1000 * 60 * 60 * 24 * 7,
    ).toISOString() as string & tags.Format<"date-time">,
    status_code: activeStatus.code,
  } satisfies ITodoAppTodo.ICreate;

  const createdTodo: ITodoAppTodo =
    await api.functional.todoApp.todoUser.todos.create(connection, {
      body: createTodoBody,
    });
  typia.assert(createdTodo);

  // 6. Complete the todo
  const completedTodo: ITodoAppTodo =
    await api.functional.todoApp.todoUser.todos.complete(connection, {
      todoId: createdTodo.id,
    });
  typia.assert(completedTodo);

  await TestValidator.predicate(
    "todo completed_at should be set",
    () =>
      completedTodo.completed_at !== null &&
      completedTodo.completed_at !== undefined,
  );

  // 7. Soft-delete the todo
  await api.functional.todoApp.todoUser.todos.erase(connection, {
    todoId: createdTodo.id,
  });

  // 8. Attempt to restore the deleted todo and expect an error
  await TestValidator.error("cannot restore soft-deleted todo", async () => {
    await api.functional.todoApp.todoUser.todos.restore(connection, {
      todoId: createdTodo.id,
    });
  });

  // 9. Optionally, attempting to complete the deleted todo should also fail
  await TestValidator.error("cannot complete soft-deleted todo", async () => {
    await api.functional.todoApp.todoUser.todos.complete(connection, {
      todoId: createdTodo.id,
    });
  });
}
