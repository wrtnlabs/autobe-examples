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
 * Verify creation of a Todo with default status when only the required title is
 * provided.
 *
 * Business flow:
 *
 * 1. Register a todoAdmin account (join) to obtain an authenticated admin context.
 * 2. (Optionally) login as todoAdmin to validate login and ensure token behavior.
 * 3. As the authenticated admin, create a Todo status row with code "ACTIVE",
 *    marked as is_default=true and is_active=true.
 * 4. Register a todoUser account (join) to obtain an authenticated user context.
 * 5. (Optionally) login as todoUser to validate login and ensure token behavior.
 * 6. As the authenticated todoUser, create a Todo using POST
 *    /todoApp/todoUser/todos with ITodoAppTodo.ICreate, providing only the
 *    required title and explicitly setting description, due_date, and
 *    status_code to null to trigger defaulting.
 *
 * Validations performed:
 *
 * - The Todo creation returns an ITodoAppTodo.
 * - The Todo's title equals the submitted title.
 * - Description and due_date are null.
 * - Status is populated, with status.code equal to the admin-configured default
 *   status code, and status.is_default and status.is_active are both true.
 * - Created_at and updated_at are non-null ISO date-time strings (validated by
 *   typia.assert).
 * - Completed_at and deleted_at are null, confirming fresh, incomplete,
 *   non-deleted Todo.
 */
export async function test_api_todo_creation_with_default_status(
  connection: api.IConnection,
) {
  // 1. Register todoAdmin account
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
  typia.assert(adminAuthorized);

  // 2. Optionally login as admin to validate login flow (using same email/password)
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppTodoAdminLogin.IRequest;

  const adminLoginAuthorized: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuthorized);

  // 3. As admin, create a default active Todo status (e.g., code = "ACTIVE")
  const defaultStatusCode = "ACTIVE";
  const statusCreateBody = {
    code: defaultStatusCode,
    label: "Active",
    description: null,
    group: null,
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
    "created status code should match requested code",
    createdStatus.code,
    defaultStatusCode,
  );
  TestValidator.predicate(
    "created status is_default should be true",
    createdStatus.is_default === true,
  );
  TestValidator.predicate(
    "created status is_active should be true",
    createdStatus.is_active === true,
  );

  // 4. Register todoUser account
  const userJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppTodoUserJoin.IRequest;

  const userAuthorized: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: userJoinBody,
    });
  typia.assert(userAuthorized);

  // 5. Optionally login as todoUser
  const userLoginBody = {
    email: userJoinBody.email,
    password: userJoinBody.password,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppTodoUserLogin.IRequest;

  const userLoginAuthorized: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.login(connection, {
      body: userLoginBody,
    });
  typia.assert(userLoginAuthorized);

  // 6. As authenticated todoUser, create a Todo with only required title
  const todoTitle = RandomGenerator.paragraph({ sentences: 3 });
  const todoCreateBody = {
    title: todoTitle,
    description: null,
    due_date: null,
    status_code: null,
  } satisfies ITodoAppTodo.ICreate;

  const createdTodo: ITodoAppTodo =
    await api.functional.todoApp.todoUser.todos.create(connection, {
      body: todoCreateBody,
    });
  typia.assert(createdTodo);

  // Assertions on created Todo
  TestValidator.equals(
    "todo title should match the input title",
    createdTodo.title,
    todoTitle,
  );

  TestValidator.equals(
    "todo description should be null when created with description=null",
    createdTodo.description,
    null,
  );

  TestValidator.equals(
    "todo due_date should be null when created with due_date=null",
    createdTodo.due_date,
    null,
  );

  // Status should be the default status configured above
  TestValidator.equals(
    "todo status code should equal created default status code",
    createdTodo.status.code,
    createdStatus.code,
  );

  TestValidator.predicate(
    "todo status.is_default should be true",
    createdTodo.status.is_default === true,
  );

  TestValidator.predicate(
    "todo status.is_active should be true",
    createdTodo.status.is_active === true,
  );

  // Lifecycle timestamps: created_at and updated_at should be non-null strings
  TestValidator.predicate(
    "todo created_at should be non-null",
    createdTodo.created_at !== null && createdTodo.created_at !== undefined,
  );

  TestValidator.predicate(
    "todo updated_at should be non-null",
    createdTodo.updated_at !== null && createdTodo.updated_at !== undefined,
  );

  // completed_at and deleted_at should be null for a fresh, incomplete Todo
  TestValidator.equals(
    "todo completed_at should be null initially",
    createdTodo.completed_at,
    null,
  );

  TestValidator.equals(
    "todo deleted_at should be null initially",
    createdTodo.deleted_at,
    null,
  );
}
