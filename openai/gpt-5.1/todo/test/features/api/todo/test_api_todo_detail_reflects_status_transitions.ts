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

export async function test_api_todo_detail_reflects_status_transitions(
  connection: api.IConnection,
) {
  // 1. Register a new todoUser via /auth/todoUser/join
  const userEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const userPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const todoUserJoinBody = {
    email: userEmail,
    password: userPassword,
    display_name: RandomGenerator.name(),
    ip: null,
    href: "https://todo-app.local/join",
    referrer: "https://todo-app.local/landing",
  } satisfies ITodoAppTodoUserJoin.IRequest;

  const todoUserAuthorized: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: todoUserJoinBody,
    });
  typia.assert(todoUserAuthorized);

  // 2. Register a todoAdmin via /auth/todoAdmin/join
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string = RandomGenerator.alphabets(12);

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    displayName: RandomGenerator.name(),
    ip: null,
    href: "https://todo-app.local/admin/join",
    referrer: "https://todo-app.local/admin/landing",
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const todoAdminAuthorized: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(todoAdminAuthorized);

  // 3. Seed ACTIVE and COMPLETED statuses as todoAdmin
  const activeStatusBody = {
    code: "ACTIVE",
    label: "Active",
    description: "Active status for open todos",
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

  const completedStatusBody = {
    code: "COMPLETED",
    label: "Completed",
    description: "Completed status for finished todos",
    group: "core",
    sort_order: 2,
    is_default: false,
    is_active: true,
  } satisfies ITodoAppTodoStatus.ICreate;

  const completedStatus: ITodoAppTodoStatus =
    await api.functional.todoApp.todoAdmin.todoStatuses.create(connection, {
      body: completedStatusBody,
    });
  typia.assert(completedStatus);

  // 4. Switch back to todoUser context via /auth/todoUser/login
  const todoUserLoginBody = {
    email: userEmail,
    password: userPassword,
    ip: null,
    href: "https://todo-app.local/login",
    referrer: "https://todo-app.local/dashboard",
  } satisfies ITodoAppTodoUserLogin.IRequest;

  const todoUserAuthorizedAfterLogin: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.login(connection, {
      body: todoUserLoginBody,
    });
  typia.assert(todoUserAuthorizedAfterLogin);

  // 5. Create a Todo as the todoUser (without explicit status_code)
  const createTodoBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    due_date: new Date().toISOString(),
    status_code: null,
  } satisfies ITodoAppTodo.ICreate;

  const createdTodo: ITodoAppTodo =
    await api.functional.todoApp.todoUser.todos.create(connection, {
      body: createTodoBody,
    });
  typia.assert(createdTodo);

  const originalId = createdTodo.id;
  const originalTitle = createdTodo.title;
  const originalDescription = createdTodo.description ?? null;
  const originalDueDate = createdTodo.due_date ?? null;

  const initialUpdatedAtMs = Date.parse(createdTodo.updated_at);

  // 6. GET detail immediately and verify initial status & completed_at
  const initialDetail: ITodoAppTodo =
    await api.functional.todoApp.todoUser.todos.at(connection, {
      todoId: createdTodo.id,
    });
  typia.assert(initialDetail);

  TestValidator.equals(
    "todo id should remain stable after creation and initial fetch",
    initialDetail.id,
    originalId,
  );
  TestValidator.equals(
    "title should remain stable after initial fetch",
    initialDetail.title,
    originalTitle,
  );
  TestValidator.equals(
    "description should remain stable after initial fetch",
    initialDetail.description ?? null,
    originalDescription,
  );
  TestValidator.equals(
    "due_date should remain stable after initial fetch",
    initialDetail.due_date ?? null,
    originalDueDate,
  );

  TestValidator.equals(
    "initial status should be ACTIVE (default status)",
    initialDetail.status.code,
    activeStatus.code,
  );

  TestValidator.equals(
    "completed_at should be null before completion",
    initialDetail.completed_at ?? null,
    null,
  );

  const detailUpdatedAtMs = Date.parse(initialDetail.updated_at);
  TestValidator.predicate(
    "initial detail updated_at should be >= created updated_at",
    detailUpdatedAtMs >= initialUpdatedAtMs,
  );

  // 7. Complete the Todo and verify via detail
  const completedTodo: ITodoAppTodo =
    await api.functional.todoApp.todoUser.todos.complete(connection, {
      todoId: originalId,
    });
  typia.assert(completedTodo);

  const completedUpdatedAtMs = Date.parse(completedTodo.updated_at);
  TestValidator.predicate(
    "updated_at after completion should be greater than initial detail updated_at",
    completedUpdatedAtMs > detailUpdatedAtMs,
  );

  TestValidator.predicate(
    "completed_at should be non-null immediately after completion",
    completedTodo.completed_at !== null &&
      completedTodo.completed_at !== undefined,
  );

  const completedDetail: ITodoAppTodo =
    await api.functional.todoApp.todoUser.todos.at(connection, {
      todoId: originalId,
    });
  typia.assert(completedDetail);

  TestValidator.equals(
    "status code should be COMPLETED after completion",
    completedDetail.status.code,
    completedStatus.code,
  );

  TestValidator.predicate(
    "completed_at should be non-null in detail after completion",
    completedDetail.completed_at !== null &&
      completedDetail.completed_at !== undefined,
  );

  const completedDetailUpdatedAtMs = Date.parse(completedDetail.updated_at);
  TestValidator.predicate(
    "detail updated_at after completion should be >= completion updated_at",
    completedDetailUpdatedAtMs >= completedUpdatedAtMs,
  );

  TestValidator.equals(
    "title should remain stable after completion",
    completedDetail.title,
    originalTitle,
  );
  TestValidator.equals(
    "description should remain stable after completion",
    completedDetail.description ?? null,
    originalDescription,
  );
  TestValidator.equals(
    "due_date should remain stable after completion",
    completedDetail.due_date ?? null,
    originalDueDate,
  );

  // 8. Restore the Todo and verify via detail
  const restoredTodo: ITodoAppTodo =
    await api.functional.todoApp.todoUser.todos.restore(connection, {
      todoId: originalId,
    });
  typia.assert(restoredTodo);

  const restoredUpdatedAtMs = Date.parse(restoredTodo.updated_at);
  TestValidator.predicate(
    "updated_at after restore should be greater than completion detail updated_at",
    restoredUpdatedAtMs > completedDetailUpdatedAtMs,
  );

  TestValidator.equals(
    "completed_at should be null after restore operation",
    restoredTodo.completed_at ?? null,
    null,
  );

  const restoredDetail: ITodoAppTodo =
    await api.functional.todoApp.todoUser.todos.at(connection, {
      todoId: originalId,
    });
  typia.assert(restoredDetail);

  TestValidator.equals(
    "status code should revert to ACTIVE after restore",
    restoredDetail.status.code,
    activeStatus.code,
  );

  TestValidator.equals(
    "completed_at should be null in detail after restore",
    restoredDetail.completed_at ?? null,
    null,
  );

  const restoredDetailUpdatedAtMs = Date.parse(restoredDetail.updated_at);
  TestValidator.predicate(
    "detail updated_at after restore should be >= restore updated_at",
    restoredDetailUpdatedAtMs >= restoredUpdatedAtMs,
  );

  TestValidator.equals(
    "title should remain stable after restore",
    restoredDetail.title,
    originalTitle,
  );
  TestValidator.equals(
    "description should remain stable after restore",
    restoredDetail.description ?? null,
    originalDescription,
  );
  TestValidator.equals(
    "due_date should remain stable after restore",
    restoredDetail.due_date ?? null,
    originalDueDate,
  );

  // Final monotonic updated_at checks across lifecycle
  TestValidator.predicate(
    "updated_at timeline should be monotonic across lifecycle",
    detailUpdatedAtMs >= initialUpdatedAtMs &&
      completedUpdatedAtMs > detailUpdatedAtMs &&
      completedDetailUpdatedAtMs >= completedUpdatedAtMs &&
      restoredUpdatedAtMs > completedDetailUpdatedAtMs &&
      restoredDetailUpdatedAtMs >= restoredUpdatedAtMs,
  );
}
