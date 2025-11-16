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
 * Verify that a todoUser can transition a Todo from an active status to a
 * completed status using PUT /todoApp/todoUser/todos/{todoId}, and that
 * lifecycle fields and other properties behave correctly.
 *
 * Business workflow:
 *
 * 1. Register a todoUser (self-signup) and obtain an authenticated context.
 * 2. Register a todoAdmin and obtain an authenticated context for admin.
 * 3. As todoAdmin, create two Todo statuses:
 *
 *    - ACTIVE: is_default=true, is_active=true.
 *    - COMPLETED: is_default=false, is_active=true.
 * 4. As todoUser, create a Todo which implicitly uses the default ACTIVE status.
 * 5. Update the Todo’s todo_status_id to point to the COMPLETED status.
 * 6. Validate that the returned Todo:
 *
 *    - Has status.id and status.code corresponding to the COMPLETED status.
 *    - Has completed_at set to a non-null timestamp when moved to completed.
 *    - Preserves title, description, and due_date.
 */
export async function test_api_todo_update_status_transition_to_completed(
  connection: api.IConnection,
) {
  // 1. Register todoUser (join) to get an authenticated user context.
  const todoUserEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const todoUserJoinHref: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const todoUserJoinReferrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const todoUserJoinBody = {
    email: todoUserEmail,
    password: "P@ssw0rd-User",
    display_name: RandomGenerator.name(2),
    ip: null,
    href: todoUserJoinHref,
    referrer: todoUserJoinReferrer,
  } satisfies ITodoAppTodoUserJoin.IRequest;

  const todoUserAuthorized: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: todoUserJoinBody,
    });
  typia.assert(todoUserAuthorized);

  // 2. Register todoAdmin and get admin authentication context.
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminHref: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const adminReferrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: "P@ssw0rd-Admin",
    displayName: RandomGenerator.name(2),
    ip: null,
    href: adminHref,
    referrer: adminReferrer,
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const adminAuthorized: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 3. As todoAdmin, create ACTIVE and COMPLETED statuses.
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

  // 4. As todoUser, create a Todo using default ACTIVE status.
  // The SDK automatically manages Authorization headers, and admin.join
  // overwrote the token, so re-login as todoUser to switch actor.
  const todoUserLoginBody = {
    email: todoUserEmail,
    password: "P@ssw0rd-User",
    ip: null,
    href: todoUserJoinHref,
    referrer: todoUserJoinReferrer,
  } satisfies ITodoAppTodoUserLogin.IRequest;

  const todoUserReAuth: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.login(connection, {
      body: todoUserLoginBody,
    });
  typia.assert(todoUserReAuth);

  const originalTitle = RandomGenerator.paragraph({ sentences: 2 });
  const originalDescription = RandomGenerator.paragraph({ sentences: 4 });
  const originalDueDate: string & tags.Format<"date-time"> = typia.random<
    string & tags.Format<"date-time">
  >();

  const todoCreateBody = {
    title: originalTitle,
    description: originalDescription,
    due_date: originalDueDate,
    status_code: null,
  } satisfies ITodoAppTodo.ICreate;

  const createdTodo: ITodoAppTodo =
    await api.functional.todoApp.todoUser.todos.create(connection, {
      body: todoCreateBody,
    });
  typia.assert(createdTodo);

  // Basic sanity checks on created Todo.
  TestValidator.equals(
    "created todo title should match input",
    createdTodo.title,
    originalTitle,
  );
  TestValidator.equals(
    "created todo description should match input",
    createdTodo.description ?? null,
    originalDescription,
  );
  TestValidator.equals(
    "created todo due_date should match input",
    createdTodo.due_date ?? null,
    originalDueDate,
  );

  // We expect createdTodo.status to correspond to ACTIVE status, but since
  // business rules may choose any default, only assert that it's active.
  TestValidator.predicate(
    "created todo should have an active status",
    createdTodo.status.is_active === true,
  );

  // 5. Update the Todo’s status to COMPLETED via PUT /todoApp/todoUser/todos/{todoId}.
  const updateBody = {
    todo_status_id: completedStatus.id,
  } satisfies ITodoAppTodo.IUpdate;

  const updatedTodo: ITodoAppTodo =
    await api.functional.todoApp.todoUser.todos.update(connection, {
      todoId: createdTodo.id,
      body: updateBody,
    });
  typia.assert(updatedTodo);

  // 6. Validation of status transition and lifecycle fields.

  // Status must now refer to COMPLETED status.
  TestValidator.equals(
    "updated todo status id should match completed status id",
    updatedTodo.status.id,
    completedStatus.id,
  );
  TestValidator.equals(
    "updated todo status code should match completed status code",
    updatedTodo.status.code,
    completedStatus.code,
  );

  // completed_at should be set when moving to completed.
  TestValidator.predicate(
    "updated todo completed_at should be non-null after completion",
    updatedTodo.completed_at !== null && updatedTodo.completed_at !== undefined,
  );

  // Other fields (title, description, due_date) should remain unchanged.
  TestValidator.equals(
    "updated todo title should remain unchanged",
    updatedTodo.title,
    originalTitle,
  );
  TestValidator.equals(
    "updated todo description should remain unchanged",
    updatedTodo.description ?? null,
    originalDescription,
  );
  TestValidator.equals(
    "updated todo due_date should remain unchanged",
    updatedTodo.due_date ?? null,
    originalDueDate,
  );
}
