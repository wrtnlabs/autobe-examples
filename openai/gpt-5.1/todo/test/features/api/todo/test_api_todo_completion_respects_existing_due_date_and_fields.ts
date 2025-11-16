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

export async function test_api_todo_completion_respects_existing_due_date_and_fields(
  connection: api.IConnection,
) {
  // 1. Admin joins as todoAdmin
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminJoinBody = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: null,
    href: "https://admin.todo-app.test/join" as string & tags.Format<"uri">,
    referrer: "https://admin.todo-app.test/landing" as string &
      tags.Format<"uri">,
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const adminAuthorized: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Admin creates ACTIVE and COMPLETED statuses
  const activeSortOrder = typia.random<number & tags.Type<"int32">>();
  const activeStatusBody = {
    code: "ACTIVE",
    label: "Active",
    description: "Active todo",
    group: "core",
    sort_order: activeSortOrder,
    is_default: true,
    is_active: true,
  } satisfies ITodoAppTodoStatus.ICreate;

  const activeStatus: ITodoAppTodoStatus =
    await api.functional.todoApp.todoAdmin.todoStatuses.create(connection, {
      body: activeStatusBody,
    });
  typia.assert(activeStatus);

  const completedSortOrder = typia.random<number & tags.Type<"int32">>();
  const completedStatusBody = {
    code: "COMPLETED",
    label: "Completed",
    description: "Completed todo",
    group: "core",
    sort_order: completedSortOrder,
    is_default: false,
    is_active: true,
  } satisfies ITodoAppTodoStatus.ICreate;

  const completedStatus: ITodoAppTodoStatus =
    await api.functional.todoApp.todoAdmin.todoStatuses.create(connection, {
      body: completedStatusBody,
    });
  typia.assert(completedStatus);

  // Sanity checks for statuses
  TestValidator.equals("ACTIVE status code", activeStatus.code, "ACTIVE");
  TestValidator.equals(
    "COMPLETED status code",
    completedStatus.code,
    "COMPLETED",
  );

  // 3. Todo user joins and is authenticated
  const userEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const userPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();
  const userJoinBody = {
    email: userEmail,
    password: userPassword,
    display_name: RandomGenerator.name(),
    ip: null,
    href: "https://todo-app.test/join" as string & tags.Format<"uri">,
    referrer: "https://todo-app.test/landing" as string & tags.Format<"uri">,
  } satisfies ITodoAppTodoUserJoin.IRequest;

  const userAuthorized: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: userJoinBody,
    });
  typia.assert(userAuthorized);

  // 4. Todo user creates a Todo with explicit title, description, due_date
  const title = RandomGenerator.paragraph({ sentences: 3 });
  const description = RandomGenerator.paragraph({ sentences: 6 });
  const dueDate = new Date(
    Date.now() + 24 * 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;

  const createTodoBody = {
    title,
    description,
    due_date: dueDate,
    status_code: "ACTIVE",
  } satisfies ITodoAppTodo.ICreate;

  const createdTodo: ITodoAppTodo =
    await api.functional.todoApp.todoUser.todos.create(connection, {
      body: createTodoBody,
    });
  typia.assert(createdTodo);

  // Capture original fields
  const originalId = createdTodo.id;
  const originalTitle = createdTodo.title;
  const originalDescription = createdTodo.description ?? null;
  const originalDueDate = createdTodo.due_date ?? null;
  const originalStatusCode = createdTodo.status.code;
  const originalCreatedAt = createdTodo.created_at;
  const originalUpdatedAt = createdTodo.updated_at;
  const originalCompletedAt = createdTodo.completed_at ?? null;
  const originalDeletedAt = createdTodo.deleted_at ?? null;

  // Assertions on creation
  TestValidator.equals("created todo title matches", createdTodo.title, title);
  TestValidator.equals(
    "created todo description matches",
    createdTodo.description,
    description,
  );
  TestValidator.equals(
    "created todo due_date matches",
    createdTodo.due_date,
    dueDate,
  );
  TestValidator.equals(
    "created todo status is ACTIVE",
    originalStatusCode,
    "ACTIVE",
  );
  TestValidator.equals(
    "created todo completed_at is null",
    originalCompletedAt,
    null,
  );
  TestValidator.equals(
    "created todo deleted_at is null",
    originalDeletedAt,
    null,
  );

  // 5. Complete the Todo as the same todoUser
  const completedTodo: ITodoAppTodo =
    await api.functional.todoApp.todoUser.todos.complete(connection, {
      todoId: originalId,
    });
  typia.assert(completedTodo);

  // 6. Validate lifecycle and user-managed fields after completion
  TestValidator.equals(
    "title unchanged after completion",
    completedTodo.title,
    originalTitle,
  );
  TestValidator.equals(
    "description unchanged after completion",
    completedTodo.description,
    originalDescription,
  );
  TestValidator.equals(
    "due_date unchanged after completion",
    completedTodo.due_date,
    originalDueDate,
  );

  TestValidator.equals(
    "status code is COMPLETED after completion",
    completedTodo.status.code,
    "COMPLETED",
  );
  TestValidator.predicate(
    "completed status remains active",
    completedTodo.status.is_active === true,
  );

  TestValidator.predicate(
    "completed_at is non-null after completion",
    completedTodo.completed_at !== null &&
      completedTodo.completed_at !== undefined,
  );

  const completedAt = completedTodo.completed_at ?? "";
  TestValidator.predicate(
    "completed_at is not before created_at",
    completedAt >= originalCreatedAt,
  );

  TestValidator.predicate(
    "updated_at has advanced after completion",
    completedTodo.updated_at > originalUpdatedAt,
  );

  TestValidator.equals(
    "deleted_at remains null after completion",
    completedTodo.deleted_at ?? null,
    null,
  );
}
