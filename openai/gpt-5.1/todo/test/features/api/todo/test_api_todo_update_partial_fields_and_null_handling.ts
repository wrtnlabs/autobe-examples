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
 * Validate partial update and null-handling behavior for Todo description.
 *
 * Business workflow:
 *
 * 1. Register a todoAdmin account and obtain admin authentication context.
 * 2. As todoAdmin, create a concrete Todo status row that is active and can be
 *    used by Todos.
 * 3. Register a todoUser account and obtain user authentication context.
 * 4. As todoUser, create a Todo with:
 *
 *    - Non-null description,
 *    - Non-null due_date,
 *    - An explicit status_code referring to the admin-created status.
 * 5. Capture the original Todo fields: title, description, due_date, status
 *    summary, created_at, updated_at.
 * 6. As the same todoUser, perform a partial update via PUT
 *    /todoApp/todoUser/todos/{todoId} with body:
 *
 *    - Description: null (explicitly clear description),
 *    - All other fields omitted (title, due_date, todo_status_id).
 * 7. Validate that:
 *
 *    - Description is now null.
 *    - Title is unchanged.
 *    - Due_date is unchanged.
 *    - Status summary (id, code, label, is_default, is_active) is unchanged.
 *    - Created_at is unchanged while updated_at is strictly more recent than before.
 */
export async function test_api_todo_update_partial_fields_and_null_handling(
  connection: api.IConnection,
) {
  // 1. Register a todoAdmin via join, establishing admin auth context
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: null,
    href: "https://admin.todoapp.example.com/join",
    referrer: "https://admin.todoapp.example.com/",
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const adminAuthorized: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. As todoAdmin, create a concrete active Todo status
  const statusCode = "ACTIVE";
  const statusCreateBody = {
    code: statusCode,
    label: "Active",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    group: "core",
    sort_order: 1 as number & tags.Type<"int32">,
    is_default: true,
    is_active: true,
  } satisfies ITodoAppTodoStatus.ICreate;

  const createdStatus: ITodoAppTodoStatus =
    await api.functional.todoApp.todoAdmin.todoStatuses.create(connection, {
      body: statusCreateBody,
    });
  typia.assert(createdStatus);

  TestValidator.equals(
    "created status code matches requested code",
    createdStatus.code,
    statusCode,
  );

  // 3. Register a todoUser via join, switching auth context to user
  const userEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const userJoinBody = {
    email: userEmail,
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    ip: null,
    href: "https://todoapp.example.com/join",
    referrer: "https://todoapp.example.com/",
  } satisfies ITodoAppTodoUserJoin.IRequest;

  const userAuthorized: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: userJoinBody,
    });
  typia.assert(userAuthorized);

  // 4. As todoUser, create a Todo with non-null description and due_date
  const dueDate: string & tags.Format<"date-time"> = typia.random<
    string & tags.Format<"date-time">
  >();

  const todoCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    due_date: dueDate,
    status_code: createdStatus.code,
  } satisfies ITodoAppTodo.ICreate;

  const createdTodo: ITodoAppTodo =
    await api.functional.todoApp.todoUser.todos.create(connection, {
      body: todoCreateBody,
    });
  typia.assert(createdTodo);

  TestValidator.equals(
    "created todo title should match request title",
    createdTodo.title,
    todoCreateBody.title,
  );
  TestValidator.equals(
    "created todo description should match request description",
    createdTodo.description,
    todoCreateBody.description,
  );
  TestValidator.equals(
    "created todo due_date should match request due_date",
    createdTodo.due_date,
    todoCreateBody.due_date,
  );
  TestValidator.equals(
    "created todo status code should match created status code",
    createdTodo.status.code,
    createdStatus.code,
  );

  const originalTitle = createdTodo.title;
  const originalDescription = createdTodo.description;
  const originalDueDate = createdTodo.due_date;
  const originalStatus = createdTodo.status;
  const originalCreatedAt = createdTodo.created_at;
  const originalUpdatedAt = createdTodo.updated_at;

  TestValidator.predicate(
    "original description must be non-null",
    () => originalDescription !== null && originalDescription !== undefined,
  );
  TestValidator.predicate(
    "original due_date must be non-null",
    () => originalDueDate !== null && originalDueDate !== undefined,
  );

  // 5. Partial update: clear description by setting it to null
  const updateBody = {
    description: null,
  } satisfies ITodoAppTodo.IUpdate;

  const updatedTodo: ITodoAppTodo =
    await api.functional.todoApp.todoUser.todos.update(connection, {
      todoId: createdTodo.id,
      body: updateBody,
    });
  typia.assert(updatedTodo);

  // 6. Validate business rules after update
  TestValidator.equals(
    "description should be cleared to null after update",
    updatedTodo.description,
    null,
  );

  TestValidator.equals(
    "title should remain unchanged after partial update",
    updatedTodo.title,
    originalTitle,
  );

  TestValidator.equals(
    "due_date should remain unchanged after partial update",
    updatedTodo.due_date,
    originalDueDate,
  );

  TestValidator.equals(
    "status id should remain unchanged after partial update",
    updatedTodo.status.id,
    originalStatus.id,
  );
  TestValidator.equals(
    "status code should remain unchanged after partial update",
    updatedTodo.status.code,
    originalStatus.code,
  );
  TestValidator.equals(
    "status label should remain unchanged after partial update",
    updatedTodo.status.label,
    originalStatus.label,
  );
  TestValidator.equals(
    "status is_default should remain unchanged after partial update",
    updatedTodo.status.is_default,
    originalStatus.is_default,
  );
  TestValidator.equals(
    "status is_active should remain unchanged after partial update",
    updatedTodo.status.is_active,
    originalStatus.is_active,
  );

  TestValidator.equals(
    "created_at should remain unchanged after update",
    updatedTodo.created_at,
    originalCreatedAt,
  );

  TestValidator.predicate(
    "updated_at should be more recent than original updated_at",
    () => updatedTodo.updated_at > originalUpdatedAt,
  );
}
