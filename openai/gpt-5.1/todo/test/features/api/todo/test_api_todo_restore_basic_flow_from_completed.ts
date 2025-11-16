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

export async function test_api_todo_restore_basic_flow_from_completed(
  connection: api.IConnection,
) {
  // 1. Admin joins and ensures ACTIVE/COMPLETED statuses exist
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@admin.test.com`,
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: null,
    href: "https://admin.todo-app.test/join",
    referrer: "https://admin.todo-app.test/",
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const adminAuthorized: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ITodoAppTodoAdmin.IAuthorized>(adminAuthorized);

  // Prepare two distinct status codes
  const activeCode = "ACTIVE";
  const completedCode = "COMPLETED";

  const activeStatusBody = {
    code: activeCode,
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

  const completedStatusBody = {
    code: completedCode,
    label: "Completed",
    description: "Todo that has been completed",
    group: "core",
    sort_order: 2,
    is_default: false,
    is_active: true,
  } satisfies ITodoAppTodoStatus.ICreate;

  const completedStatus: ITodoAppTodoStatus =
    await api.functional.todoApp.todoAdmin.todoStatuses.create(connection, {
      body: completedStatusBody,
    });
  typia.assert<ITodoAppTodoStatus>(completedStatus);

  // 2. todoUser joins and becomes authenticated
  const userEmail = `${RandomGenerator.alphabets(8)}@user.test.com`;

  const userJoinBody = {
    email: userEmail,
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    ip: null,
    href: "https://todo-app.test/join",
    referrer: "https://todo-app.test/",
  } satisfies ITodoAppTodoUserJoin.IRequest;

  const userAuthorized: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: userJoinBody,
    });
  typia.assert<ITodoAppTodoUser.IAuthorized>(userAuthorized);

  // 3. Create an ACTIVE todo for this user
  const todoCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    due_date: RandomGenerator.date(
      new Date(),
      1000 * 60 * 60 * 24 * 7,
    ).toISOString(),
    status_code: activeCode,
  } satisfies ITodoAppTodo.ICreate;

  const createdTodo: ITodoAppTodo =
    await api.functional.todoApp.todoUser.todos.create(connection, {
      body: todoCreateBody,
    });
  typia.assert<ITodoAppTodo>(createdTodo);

  TestValidator.equals(
    "created todo must initially be ACTIVE",
    createdTodo.status.code,
    activeCode,
  );

  const beforeCompleteUpdatedAt = createdTodo.updated_at;

  // 4. Complete the todo
  const completedTodo: ITodoAppTodo =
    await api.functional.todoApp.todoUser.todos.complete(connection, {
      todoId: createdTodo.id,
    });
  typia.assert<ITodoAppTodo>(completedTodo);

  TestValidator.equals(
    "completed todo must have completed_at set",
    completedTodo.completed_at !== null &&
      completedTodo.completed_at !== undefined,
    true,
  );

  const beforeRestoreUpdatedAt = completedTodo.updated_at;

  // 5. Restore the todo
  const restoredTodo: ITodoAppTodo =
    await api.functional.todoApp.todoUser.todos.restore(connection, {
      todoId: createdTodo.id,
    });
  typia.assert<ITodoAppTodo>(restoredTodo);

  // 6. Business rule validations
  TestValidator.equals(
    "restored todo id remains the same",
    restoredTodo.id,
    createdTodo.id,
  );

  TestValidator.equals(
    "restored todo title remains unchanged",
    restoredTodo.title,
    createdTodo.title,
  );

  TestValidator.equals(
    "restored todo description remains unchanged",
    restoredTodo.description ?? null,
    createdTodo.description ?? null,
  );

  TestValidator.equals(
    "restored todo due_date remains unchanged",
    restoredTodo.due_date ?? null,
    createdTodo.due_date ?? null,
  );

  TestValidator.equals(
    "restored todo status code is ACTIVE again",
    restoredTodo.status.code,
    activeCode,
  );

  TestValidator.equals(
    "restored todo completed_at is null",
    restoredTodo.completed_at,
    null,
  );

  TestValidator.equals(
    "restored todo deleted_at is still null",
    restoredTodo.deleted_at,
    null,
  );

  TestValidator.predicate(
    "restored updated_at is later than before restore",
    new Date(restoredTodo.updated_at).getTime() >=
      new Date(beforeRestoreUpdatedAt).getTime(),
  );
}
