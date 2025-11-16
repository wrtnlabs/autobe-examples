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
 * Ensure that only the owning todoUser can restore a completed Todo.
 *
 * Business goals:
 *
 * - Validate that a completed Todo owned by user A cannot be restored by another
 *   authenticated todoUser B.
 * - Confirm that the unauthorized restore attempt does not affect the Todo's
 *   lifecycle; the owner A can still successfully restore the Todo afterward.
 *
 * High-level workflow:
 *
 * 1. Create an admin account and log in as todoAdmin to register core Todo
 *    statuses (ACTIVE and COMPLETED).
 * 2. Register todoUser A and implicitly authenticate as A.
 * 3. As user A, create a Todo with initial ACTIVE status.
 * 4. As user A, complete the Todo so that it becomes eligible for restore.
 * 5. Register todoUser B, which implicitly authenticates as B on the same
 *    connection.
 * 6. As user B, attempt to restore A's completed Todo and assert that an error is
 *    thrown.
 * 7. Log back in as user A.
 * 8. As user A, restore the Todo successfully and verify its state is active again
 *    (completed_at cleared) and that the Todo ID remains unchanged.
 */
export async function test_api_todo_restore_only_by_owner(
  connection: api.IConnection,
) {
  // 1. Create todoAdmin and log in
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string = "admin-" + RandomGenerator.alphaNumeric(12);

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    displayName: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const adminAuthorized: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Ensure core Todo statuses exist: ACTIVE and COMPLETED
  const activeStatusBody = {
    code: "ACTIVE",
    label: "Active",
    description: null,
    group: null,
    sort_order: typia.random<number & tags.Type<"int32">>(),
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
    description: null,
    group: null,
    sort_order: typia.random<number & tags.Type<"int32">>(),
    is_default: false,
    is_active: true,
  } satisfies ITodoAppTodoStatus.ICreate;

  const completedStatus: ITodoAppTodoStatus =
    await api.functional.todoApp.todoAdmin.todoStatuses.create(connection, {
      body: completedStatusBody,
    });
  typia.assert(completedStatus);

  // 3. Register todoUser A and authenticate
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
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppTodoUserJoin.IRequest;

  const userAAuthorized: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: userAJoinBody,
    });
  typia.assert(userAAuthorized);

  // 4. As user A, create a Todo with initial ACTIVE status
  const todoCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    due_date: typia.random<string & tags.Format<"date-time">>(),
    status_code: activeStatus.code,
  } satisfies ITodoAppTodo.ICreate;

  const todoA: ITodoAppTodo =
    await api.functional.todoApp.todoUser.todos.create(connection, {
      body: todoCreateBody,
    });
  typia.assert(todoA);

  TestValidator.equals(
    "newly created todo should be ACTIVE",
    todoA.status.code,
    activeStatus.code,
  );

  // 5. As user A, complete the Todo
  const completedTodoA: ITodoAppTodo =
    await api.functional.todoApp.todoUser.todos.complete(connection, {
      todoId: todoA.id,
    });
  typia.assert(completedTodoA);

  TestValidator.predicate(
    "completed todo must have non-null completed_at",
    completedTodoA.completed_at !== null &&
      completedTodoA.completed_at !== undefined,
  );

  TestValidator.equals(
    "completed todo id should match original todo id",
    completedTodoA.id,
    todoA.id,
  );

  // 6. Register todoUser B (implicitly authenticates as B)
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
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppTodoUserJoin.IRequest;

  const userBAuthorized: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: userBJoinBody,
    });
  typia.assert(userBAuthorized);

  // 7. As user B, attempt to restore A's completed Todo and expect error
  await TestValidator.error(
    "non-owner todoUser must not be able to restore another user's todo",
    async () => {
      await api.functional.todoApp.todoUser.todos.restore(connection, {
        todoId: todoA.id,
      });
    },
  );

  // 8. Log back in as user A
  const userALoginBody = {
    email: userAEmail,
    password: userAPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppTodoUserLogin.IRequest;

  const userALoggedIn: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.login(connection, {
      body: userALoginBody,
    });
  typia.assert(userALoggedIn);

  // 9. As user A, restore the Todo successfully
  const restoredTodoA: ITodoAppTodo =
    await api.functional.todoApp.todoUser.todos.restore(connection, {
      todoId: todoA.id,
    });
  typia.assert(restoredTodoA);

  TestValidator.equals(
    "restored todo id should match original todo id",
    restoredTodoA.id,
    todoA.id,
  );

  TestValidator.equals(
    "restored todo should have completed_at cleared",
    restoredTodoA.completed_at,
    null,
  );

  TestValidator.predicate(
    "restored todo should still be associated with an active status entry",
    restoredTodoA.status.is_active === true,
  );
}
