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
 * Validate that restoring a completed todo only changes lifecycle fields and
 * preserves user-managed fields.
 *
 * Business context:
 *
 * - Todo statuses are centrally managed catalogue entries (ACTIVE, COMPLETED,
 *   etc.).
 * - A todo belongs to a todoUser and has user-managed content (title,
 *   description, due_date) and lifecycle fields (status, completed_at,
 *   updated_at, deleted_at).
 * - Completing a todo moves it to a completed state and sets completed_at.
 * - Restoring a todo should move it back to an active status, clear completed_at,
 *   and bump updated_at, WITHOUT mutating title, description, or due_date.
 *
 * Steps:
 *
 * 1. Join as todoAdmin and create ACTIVE and COMPLETED status catalogue entries.
 * 2. Join as todoUser (this overwrites connection Authorization to todoUser
 *    context).
 * 3. Create a todo with explicit title, description, and due_date, and bind it to
 *    ACTIVE status.
 * 4. Complete the todo; verify lifecycle changes and preservation of user-managed
 *    fields.
 * 5. Restore the todo; verify:
 *
 *    - Title/description/due_date are unchanged from original,
 *    - Status is ACTIVE again,
 *    - Completed_at is null,
 *    - Updated_at is strictly greater than original and completed updated_at.
 */
export async function test_api_todo_restore_preserves_user_managed_fields(
  connection: api.IConnection,
) {
  // 1. Admin: register a todoAdmin account and get authorized
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const adminAuthorized: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ITodoAppTodoAdmin.IAuthorized>(adminAuthorized);

  // 1-2. Admin: create ACTIVE and COMPLETED statuses
  const activeStatusBody = {
    code: "ACTIVE",
    label: "Active",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    group: "core",
    sort_order: 1 as number & tags.Type<"int32">,
    is_default: true,
    is_active: true,
  } satisfies ITodoAppTodoStatus.ICreate;

  const completedStatusBody = {
    code: "COMPLETED",
    label: "Completed",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    group: "core",
    sort_order: 2 as number & tags.Type<"int32">,
    is_default: false,
    is_active: true,
  } satisfies ITodoAppTodoStatus.ICreate;

  const activeStatus: ITodoAppTodoStatus =
    await api.functional.todoApp.todoAdmin.todoStatuses.create(connection, {
      body: activeStatusBody,
    });
  typia.assert<ITodoAppTodoStatus>(activeStatus);

  const completedStatus: ITodoAppTodoStatus =
    await api.functional.todoApp.todoAdmin.todoStatuses.create(connection, {
      body: completedStatusBody,
    });
  typia.assert<ITodoAppTodoStatus>(completedStatus);

  TestValidator.equals(
    "ACTIVE status code should be ACTIVE",
    activeStatus.code,
    "ACTIVE",
  );
  TestValidator.equals(
    "COMPLETED status code should be COMPLETED",
    completedStatus.code,
    "COMPLETED",
  );

  // 2. User: register a todoUser, which also authenticates as that user
  const userJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    display_name: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppTodoUserJoin.IRequest;

  const userAuthorized: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: userJoinBody,
    });
  typia.assert<ITodoAppTodoUser.IAuthorized>(userAuthorized);

  // 3. User: create a todo with explicit user-managed fields
  const todoTitle = RandomGenerator.paragraph({ sentences: 2 });
  const todoDescription = RandomGenerator.paragraph({ sentences: 5 });
  const todoDueDate = new Date().toISOString() as string &
    tags.Format<"date-time">;

  const todoCreateBody = {
    title: todoTitle,
    description: todoDescription,
    due_date: todoDueDate,
    status_code: activeStatus.code,
  } satisfies ITodoAppTodo.ICreate;

  const originalTodo: ITodoAppTodo =
    await api.functional.todoApp.todoUser.todos.create(connection, {
      body: todoCreateBody,
    });
  typia.assert<ITodoAppTodo>(originalTodo);

  TestValidator.equals(
    "original todo title matches request",
    originalTodo.title,
    todoTitle,
  );
  TestValidator.equals(
    "original todo description matches request",
    originalTodo.description,
    todoDescription,
  );
  TestValidator.equals(
    "original todo due_date matches request",
    originalTodo.due_date,
    todoDueDate,
  );
  TestValidator.equals(
    "original todo status is ACTIVE",
    originalTodo.status.code,
    activeStatus.code,
  );

  const originalUpdatedAtMs = new Date(originalTodo.updated_at).getTime();

  // 4. User: complete the todo
  const completedTodo: ITodoAppTodo =
    await api.functional.todoApp.todoUser.todos.complete(connection, {
      todoId: originalTodo.id,
    });
  typia.assert<ITodoAppTodo>(completedTodo);

  // User-managed fields must remain identical after completion
  TestValidator.equals(
    "completed todo title preserved from original",
    completedTodo.title,
    originalTodo.title,
  );
  TestValidator.equals(
    "completed todo description preserved from original",
    completedTodo.description,
    originalTodo.description,
  );
  TestValidator.equals(
    "completed todo due_date preserved from original",
    completedTodo.due_date,
    originalTodo.due_date,
  );

  // Lifecycle expectations after completion
  TestValidator.predicate(
    "completed_at is set after completion",
    completedTodo.completed_at !== null &&
      completedTodo.completed_at !== undefined,
  );

  const completedUpdatedAtMs = new Date(completedTodo.updated_at).getTime();
  const completedCompletedAtMs = completedTodo.completed_at
    ? new Date(completedTodo.completed_at).getTime()
    : 0;

  TestValidator.predicate(
    "completed updated_at is later than original updated_at",
    completedUpdatedAtMs > originalUpdatedAtMs,
  );
  TestValidator.predicate(
    "completed_at timestamp is not before original updated_at",
    completedCompletedAtMs >= originalUpdatedAtMs,
  );

  // 5. User: restore the todo
  const restoredTodo: ITodoAppTodo =
    await api.functional.todoApp.todoUser.todos.restore(connection, {
      todoId: originalTodo.id,
    });
  typia.assert<ITodoAppTodo>(restoredTodo);

  // 6. Validate restore behavior
  // 6-1. User-managed fields should be unchanged vs original
  TestValidator.equals(
    "restored todo title preserved from original",
    restoredTodo.title,
    originalTodo.title,
  );
  TestValidator.equals(
    "restored todo description preserved from original",
    restoredTodo.description,
    originalTodo.description,
  );
  TestValidator.equals(
    "restored todo due_date preserved from original",
    restoredTodo.due_date,
    originalTodo.due_date,
  );

  // 6-2. Lifecycle fields: status, completed_at, updated_at
  TestValidator.equals(
    "restored todo status reverted to ACTIVE",
    restoredTodo.status.code,
    activeStatus.code,
  );

  TestValidator.equals(
    "restored todo completed_at cleared to null",
    restoredTodo.completed_at,
    null,
  );

  const restoredUpdatedAtMs = new Date(restoredTodo.updated_at).getTime();
  TestValidator.predicate(
    "restored updated_at is later than original and completed updated_at",
    restoredUpdatedAtMs > originalUpdatedAtMs &&
      restoredUpdatedAtMs > completedUpdatedAtMs,
  );

  // Optional: ensure todo remains not soft-deleted
  TestValidator.equals(
    "restored todo is not soft-deleted",
    restoredTodo.deleted_at,
    null,
  );
}
