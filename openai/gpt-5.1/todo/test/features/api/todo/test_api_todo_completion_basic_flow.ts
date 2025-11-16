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
 * Validate completing an active todo owned by an authenticated todoUser.
 *
 * Business flow:
 *
 * 1. Register a todoAdmin and obtain admin authorization.
 * 2. As admin, create a COMPLETED-like status in the status catalogue.
 * 3. Register a todoUser and obtain user authorization.
 * 4. As todoUser, create a new todo (implicitly active via default status).
 * 5. Complete the todo using POST /todoApp/todoUser/todos/{todoId}/complete.
 * 6. Verify lifecycle timestamps and business fields after completion.
 */
export async function test_api_todo_completion_basic_flow(
  connection: api.IConnection,
) {
  // 1. Register a todoAdmin and obtain admin authorization
  const adminEmail = typia.random<string & tags.Format<"email">>();

  const adminJoinBody = {
    email: adminEmail,
    password: "admin-password",
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

  // 2. As admin, create a COMPLETED-like status in the catalogue
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

  // 3. Register a todoUser and obtain user authorization
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "user-password";

  const userJoinBody = {
    email: userEmail,
    password: userPassword,
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

  // 4. As todoUser, create a new todo (implicitly active)
  const dueDate = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  const createTodoBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    due_date: dueDate,
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
  const originalStatusCode = createdTodo.status.code;
  const originalCreatedAt = createdTodo.created_at;
  const originalUpdatedAt = createdTodo.updated_at;
  const originalCompletedAt = createdTodo.completed_at ?? null;
  const originalDeletedAt = createdTodo.deleted_at ?? null;

  TestValidator.equals(
    "created todo should not be completed yet",
    originalCompletedAt,
    null,
  );
  TestValidator.equals(
    "created todo should not be deleted",
    originalDeletedAt,
    null,
  );

  // 5. Complete the todo
  const completedTodo: ITodoAppTodo =
    await api.functional.todoApp.todoUser.todos.complete(connection, {
      todoId: createdTodo.id,
    });
  typia.assert(completedTodo);

  // 6. Verify lifecycle timestamps and business fields after completion
  TestValidator.equals(
    "todo id remains unchanged after completion",
    completedTodo.id,
    originalId,
  );
  TestValidator.equals(
    "title remains unchanged after completion",
    completedTodo.title,
    originalTitle,
  );
  TestValidator.equals(
    "description remains unchanged after completion",
    completedTodo.description ?? null,
    originalDescription,
  );
  TestValidator.equals(
    "due_date remains unchanged after completion",
    completedTodo.due_date ?? null,
    originalDueDate,
  );

  TestValidator.predicate(
    "completed_at should be set after completion",
    completedTodo.completed_at !== null &&
      completedTodo.completed_at !== undefined,
  );

  const createdAtMs = new Date(originalCreatedAt).getTime();
  const updatedAtBeforeMs = new Date(originalUpdatedAt).getTime();
  const updatedAtAfterMs = new Date(completedTodo.updated_at).getTime();
  const completedAtMs = new Date(
    completedTodo.completed_at ?? originalCreatedAt,
  ).getTime();

  TestValidator.predicate(
    "updated_at should be later than before completion",
    updatedAtAfterMs > updatedAtBeforeMs,
  );

  TestValidator.predicate(
    "completed_at should be at or after created_at",
    completedAtMs >= createdAtMs,
  );

  TestValidator.equals(
    "deleted_at should remain null after completion",
    completedTodo.deleted_at ?? null,
    null,
  );

  TestValidator.predicate(
    "status code after completion should reflect a potentially different state",
    completedTodo.status.code === originalStatusCode ||
      completedTodo.status.code === completedStatus.code,
  );
}
