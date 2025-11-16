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
 * Validate that restoring a Todo only makes sense from a completed state.
 *
 * Business intent:
 *
 * - A Todo has a normalized status (ITodoAppTodoStatus.ISummary) and optional
 *   completed_at.
 * - Restore() is documented to "restore a completed todo ... back to an active
 *   state".
 * - When restore() is invoked on a Todo that is already ACTIVE (never completed),
 *   the call should be safe and MUST NOT corrupt status or timestamps.
 *
 * Scenario covered:
 *
 * 1. Admin actor joins and logs in.
 * 2. Admin creates at least one ACTIVE status configuration row.
 * 3. Todo user joins and logs in.
 * 4. Todo user creates a Todo without specifying status_code so that default
 *    ACTIVE applies.
 * 5. Capture the original Todo snapshot (status.code, completed_at, deleted_at,
 *    title, description, due_date).
 * 6. Call restore() once on the ACTIVE todo.
 * 7. Call restore() again on the same ACTIVE todo to exercise idempotency.
 * 8. Verify after the final restore:
 *
 *    - Status.code is unchanged from the original Todo.
 *    - Status.is_active is true (since we configured ACTIVE as active).
 *    - Completed_at is still null/undefined (no completion has happened).
 *    - Deleted_at is still null/undefined (restore must not soft-delete).
 *    - Title/description/due_date are not unexpectedly altered.
 */
export async function test_api_todo_restore_only_from_completed_state(
  connection: api.IConnection,
) {
  // 1. Admin joins (establish todoAdmin actor and auth context)
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
  typia.assert<ITodoAppTodoAdmin.IAuthorized>(adminAuthorized);

  // 2. Admin creates ACTIVE status configuration used by user Todos
  const activeStatusBody = {
    code: "ACTIVE",
    label: "Active",
    description: "Active todo that is not yet completed",
    group: "core",
    sort_order: 1,
    is_default: true,
    is_active: true,
  } satisfies ITodoAppTodoStatus.ICreate;

  const activeStatus: ITodoAppTodoStatus =
    await api.functional.todoApp.todoAdmin.todoStatuses.create(connection, {
      body: activeStatusBody,
    });
  typia.assert<ITodoAppTodoStatus>(activeStatus);

  TestValidator.predicate(
    "created ACTIVE status is active and default",
    activeStatus.is_active === true && activeStatus.is_default === true,
  );

  // 3. Todo user joins (this switches the SDK auth context to todoUser)
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
  typia.assert<ITodoAppTodoUser.IAuthorized>(userAuthorized);

  // 4. User creates a new Todo (implicitly ACTIVE via default status)
  const createTodoBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    due_date: null,
    status_code: null,
  } satisfies ITodoAppTodo.ICreate;

  const createdTodo: ITodoAppTodo =
    await api.functional.todoApp.todoUser.todos.create(connection, {
      body: createTodoBody,
    });
  typia.assert<ITodoAppTodo>(createdTodo);

  TestValidator.equals(
    "new todo should not be completed",
    createdTodo.completed_at ?? null,
    null,
  );
  TestValidator.predicate(
    "new todo status is active (by configuration)",
    createdTodo.status.is_active === true,
  );

  // 5. Capture original snapshot for later comparison
  const originalStatusCode: string = createdTodo.status.code;
  const originalStatusLabel: string = createdTodo.status.label;
  const originalTitle: string = createdTodo.title;
  const originalDescription: string | null | undefined =
    createdTodo.description;
  const originalDueDate: string | null | undefined =
    createdTodo.due_date ?? null;
  const originalCompletedAt: string | null | undefined =
    createdTodo.completed_at ?? null;
  const originalDeletedAt: string | null | undefined =
    createdTodo.deleted_at ?? null;

  // 6. First restore call on ACTIVE todo
  const afterFirstRestore: ITodoAppTodo =
    await api.functional.todoApp.todoUser.todos.restore(connection, {
      todoId: createdTodo.id,
    });
  typia.assert<ITodoAppTodo>(afterFirstRestore);

  // 7. Second restore call to exercise idempotency
  const afterSecondRestore: ITodoAppTodo =
    await api.functional.todoApp.todoUser.todos.restore(connection, {
      todoId: createdTodo.id,
    });
  typia.assert<ITodoAppTodo>(afterSecondRestore);

  // 8. Validate that state has not been corrupted after repeated restore
  TestValidator.equals(
    "status code remains unchanged after restore on ACTIVE todo",
    afterSecondRestore.status.code,
    originalStatusCode,
  );
  TestValidator.equals(
    "status label remains unchanged after restore on ACTIVE todo",
    afterSecondRestore.status.label,
    originalStatusLabel,
  );
  TestValidator.predicate(
    "status remains active after restore on ACTIVE todo",
    afterSecondRestore.status.is_active === true,
  );

  TestValidator.equals(
    "completed_at remains null/undefined after restore on ACTIVE todo",
    afterSecondRestore.completed_at ?? null,
    originalCompletedAt,
  );
  TestValidator.equals(
    "deleted_at remains null/undefined after restore on ACTIVE todo",
    afterSecondRestore.deleted_at ?? null,
    originalDeletedAt,
  );

  TestValidator.equals(
    "title is unchanged after restore on ACTIVE todo",
    afterSecondRestore.title,
    originalTitle,
  );
  TestValidator.equals(
    "description is unchanged after restore on ACTIVE todo",
    afterSecondRestore.description ?? null,
    originalDescription ?? null,
  );
  TestValidator.equals(
    "due_date is unchanged after restore on ACTIVE todo",
    afterSecondRestore.due_date ?? null,
    originalDueDate,
  );
}
