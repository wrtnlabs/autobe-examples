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

export async function test_api_todo_detail_view_by_owner(
  connection: api.IConnection,
) {
  // 1. Admin setup: register a todoAdmin and create an ACTIVE status
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

  const statusCreateBody = {
    code: "ACTIVE",
    label: "Active",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    group: "core",
    sort_order: 1,
    is_default: true,
    is_active: true,
  } satisfies ITodoAppTodoStatus.ICreate;

  const createdStatus: ITodoAppTodoStatus =
    await api.functional.todoApp.todoAdmin.todoStatuses.create(connection, {
      body: statusCreateBody,
    });
  typia.assert<ITodoAppTodoStatus>(createdStatus);

  TestValidator.equals(
    "created status code should match request",
    createdStatus.code,
    statusCreateBody.code,
  );
  TestValidator.equals(
    "created status should be active",
    createdStatus.is_active,
    true,
  );
  TestValidator.equals(
    "created status should be default",
    createdStatus.is_default,
    true,
  );

  // 2. User setup: register a todoUser (join also authenticates user)
  const userJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
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

  TestValidator.equals(
    "joined todoUser email should match request",
    userAuthorized.email,
    userJoinBody.email,
  );

  // 3. Create a Todo as this owner user
  const todoTitle = RandomGenerator.paragraph({ sentences: 3 });
  const todoDescription = RandomGenerator.paragraph({ sentences: 6 });
  const dueDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const todoCreateBody = {
    title: todoTitle,
    description: todoDescription,
    due_date: dueDate,
    status_code: createdStatus.code,
  } satisfies ITodoAppTodo.ICreate;

  const createdTodo: ITodoAppTodo =
    await api.functional.todoApp.todoUser.todos.create(connection, {
      body: todoCreateBody,
    });
  typia.assert<ITodoAppTodo>(createdTodo);

  TestValidator.equals(
    "created todo title should match request",
    createdTodo.title,
    todoCreateBody.title,
  );
  TestValidator.equals(
    "created todo description should match request",
    createdTodo.description,
    todoCreateBody.description,
  );
  TestValidator.equals(
    "created todo due_date should match request",
    createdTodo.due_date,
    todoCreateBody.due_date,
  );
  TestValidator.equals(
    "created todo status code should match created status",
    createdTodo.status.code,
    createdStatus.code,
  );
  TestValidator.equals(
    "created todo status label should match created status",
    createdTodo.status.label,
    createdStatus.label,
  );
  TestValidator.equals(
    "created todo status should be active",
    createdTodo.status.is_active,
    true,
  );
  TestValidator.equals(
    "created todo completed_at should be null",
    createdTodo.completed_at,
    null,
  );
  TestValidator.equals(
    "created todo deleted_at should be null",
    createdTodo.deleted_at,
    null,
  );

  const createdAtMillis = Date.parse(createdTodo.created_at);
  const updatedAtMillis = Date.parse(createdTodo.updated_at);
  TestValidator.predicate(
    "created todo updated_at should be greater than or equal to created_at",
    updatedAtMillis >= createdAtMillis,
  );

  // 4. Retrieve Todo detail as the same owner user
  const detailTodo: ITodoAppTodo =
    await api.functional.todoApp.todoUser.todos.at(connection, {
      todoId: createdTodo.id,
    });
  typia.assert<ITodoAppTodo>(detailTodo);

  TestValidator.equals(
    "detail todo id should match created todo id",
    detailTodo.id,
    createdTodo.id,
  );
  TestValidator.equals(
    "detail todo title should match created todo",
    detailTodo.title,
    createdTodo.title,
  );
  TestValidator.equals(
    "detail todo description should match created todo",
    detailTodo.description,
    createdTodo.description,
  );
  TestValidator.equals(
    "detail todo due_date should match created todo",
    detailTodo.due_date,
    createdTodo.due_date,
  );
  TestValidator.equals(
    "detail todo status code should match created status",
    detailTodo.status.code,
    createdStatus.code,
  );
  TestValidator.equals(
    "detail todo status label should match created status",
    detailTodo.status.label,
    createdStatus.label,
  );
  TestValidator.equals(
    "detail todo status should be active",
    detailTodo.status.is_active,
    true,
  );
  TestValidator.equals(
    "detail todo created_at should match created todo",
    detailTodo.created_at,
    createdTodo.created_at,
  );

  const detailCreatedAtMillis = Date.parse(detailTodo.created_at);
  const detailUpdatedAtMillis = Date.parse(detailTodo.updated_at);
  TestValidator.predicate(
    "detail todo updated_at should be greater than or equal to created_at",
    detailUpdatedAtMillis >= detailCreatedAtMillis,
  );

  TestValidator.equals(
    "detail todo completed_at should still be null",
    detailTodo.completed_at,
    null,
  );
  TestValidator.equals(
    "detail todo deleted_at should still be null",
    detailTodo.deleted_at,
    null,
  );
}
