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
 * Validate that a todoUser can update basic mutable fields of their own Todo.
 *
 * Business workflow
 *
 * 1. Admin registers and creates an active Todo status in the catalogue.
 * 2. Todo user registers and becomes authenticated.
 * 3. Todo user creates a Todo with explicit title, description, due_date and
 *    status_code.
 * 4. Todo user updates the Todo's title, description, and due_date via PUT
 *    /todoApp/todoUser/todos/{todoId}.
 * 5. Verify that mutable fields are updated, immutable fields remain stable, and
 *    status is unchanged.
 */
export async function test_api_todo_update_basic_fields_by_owner(
  connection: api.IConnection,
) {
  // 1. Admin joins to gain privileges for creating a status
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: null,
    href: "https://admin.todoapp.test/join",
    referrer: "https://admin.todoapp.test/landing",
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const adminAuthorized: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Admin creates an active default Todo status
  const statusCode = "ACTIVE";
  const statusCreateBody = {
    code: statusCode,
    label: "Active",
    description: "Default active status for todos",
    group: "core",
    sort_order: 1 as number & tags.Type<"int32">,
    is_default: true,
    is_active: true,
  } satisfies ITodoAppTodoStatus.ICreate;

  const status: ITodoAppTodoStatus =
    await api.functional.todoApp.todoAdmin.todoStatuses.create(connection, {
      body: statusCreateBody,
    });
  typia.assert(status);

  TestValidator.equals(
    "created status code should match",
    status.code,
    statusCode,
  );
  TestValidator.predicate(
    "created status should be active",
    status.is_active === true,
  );

  // 3. Todo user joins (registers) and becomes authenticated
  const userPassword = typia.random<string & tags.Format<"password">>();

  const userJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: userPassword,
    display_name: RandomGenerator.name(),
    ip: null,
    href: "https://todoapp.test/join",
    referrer: "https://todoapp.test/landing",
  } satisfies ITodoAppTodoUserJoin.IRequest;

  const userAuthorized: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: userJoinBody,
    });
  typia.assert(userAuthorized);

  // 4. User creates an initial Todo
  const originalTitle = RandomGenerator.paragraph({ sentences: 3 });
  const originalDescription = RandomGenerator.paragraph({ sentences: 6 });
  const originalDueDate = new Date(
    Date.now() + 24 * 60 * 60 * 1000,
  ).toISOString();

  const todoCreateBody = {
    title: originalTitle,
    description: originalDescription,
    due_date: originalDueDate,
    status_code: status.code,
  } satisfies ITodoAppTodo.ICreate;

  const createdTodo: ITodoAppTodo =
    await api.functional.todoApp.todoUser.todos.create(connection, {
      body: todoCreateBody,
    });
  typia.assert(createdTodo);

  TestValidator.equals(
    "created todo title should match input",
    createdTodo.title,
    originalTitle,
  );
  TestValidator.equals(
    "created todo description should match input",
    createdTodo.description,
    originalDescription,
  );
  TestValidator.equals(
    "created todo due_date should match input",
    createdTodo.due_date,
    originalDueDate,
  );
  TestValidator.equals(
    "created todo status code should match selected status",
    createdTodo.status.code,
    status.code,
  );

  const createdId = createdTodo.id;
  const createdStatus = createdTodo.status;
  const createdCreatedAt = createdTodo.created_at;
  const createdUpdatedAt = createdTodo.updated_at;
  const createdCompletedAt = createdTodo.completed_at ?? null;
  const createdDeletedAt = createdTodo.deleted_at ?? null;

  // 5. User updates title, description, and due_date
  const updatedTitle = RandomGenerator.paragraph({ sentences: 4 });
  const updatedDescription = RandomGenerator.paragraph({ sentences: 8 });
  const updatedDueDate = new Date(
    Date.now() + 48 * 60 * 60 * 1000,
  ).toISOString();

  const todoUpdateBody = {
    title: updatedTitle,
    description: updatedDescription,
    due_date: updatedDueDate,
  } satisfies ITodoAppTodo.IUpdate;

  const updatedTodo: ITodoAppTodo =
    await api.functional.todoApp.todoUser.todos.update(connection, {
      todoId: createdId,
      body: todoUpdateBody,
    });
  typia.assert(updatedTodo);

  // 6. Validate immutable and mutable fields
  TestValidator.equals(
    "updated todo id should remain unchanged",
    updatedTodo.id,
    createdId,
  );

  TestValidator.equals(
    "updated todo status.id should remain unchanged",
    updatedTodo.status.id,
    createdStatus.id,
  );
  TestValidator.equals(
    "updated todo status.code should remain unchanged",
    updatedTodo.status.code,
    createdStatus.code,
  );
  TestValidator.equals(
    "updated todo status.label should remain unchanged",
    updatedTodo.status.label,
    createdStatus.label,
  );
  TestValidator.equals(
    "updated todo status.is_default should remain unchanged",
    updatedTodo.status.is_default,
    createdStatus.is_default,
  );
  TestValidator.equals(
    "updated todo status.is_active should remain unchanged",
    updatedTodo.status.is_active,
    createdStatus.is_active,
  );

  TestValidator.equals(
    "updated todo title should reflect update",
    updatedTodo.title,
    updatedTitle,
  );
  TestValidator.equals(
    "updated todo description should reflect update",
    updatedTodo.description,
    updatedDescription,
  );
  TestValidator.equals(
    "updated todo due_date should reflect update",
    updatedTodo.due_date,
    updatedDueDate,
  );

  TestValidator.equals(
    "created_at should be immutable across update",
    updatedTodo.created_at,
    createdCreatedAt,
  );
  TestValidator.notEquals(
    "updated_at should change after update",
    updatedTodo.updated_at,
    createdUpdatedAt,
  );

  const updatedCompletedAt = updatedTodo.completed_at ?? null;
  const updatedDeletedAt = updatedTodo.deleted_at ?? null;

  TestValidator.equals(
    "completed_at should remain unchanged by basic field update",
    updatedCompletedAt,
    createdCompletedAt,
  );
  TestValidator.equals(
    "deleted_at should remain unchanged by basic field update",
    updatedDeletedAt,
    createdDeletedAt,
  );
}
