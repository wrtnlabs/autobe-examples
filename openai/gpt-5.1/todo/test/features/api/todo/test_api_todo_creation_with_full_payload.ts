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
 * Validate creation of a Todo with all optional fields populated.
 *
 * Business context:
 *
 * - Todo statuses are centrally managed by todoAdmin via the todo status
 *   catalogue.
 * - TodoUser owns Todos and can optionally choose a specific status at creation.
 * - Todo creation should persist title, description, due_date, and status
 *   selection, while the backend manages identifiers and lifecycle timestamps.
 *
 * Scenario steps:
 *
 * 1. Register a todoAdmin via /auth/todoAdmin/join so that admin-scoped
 *    configuration APIs can be used.
 * 2. As authenticated todoAdmin (join already issues tokens and sets Authorization
 *    header), create an active Todo status via /todoApp/todoAdmin/todoStatuses
 *    with a unique code and label, is_active=true, and is_default=false.
 * 3. Register a todoUser via /auth/todoUser/join; join returns
 *    ITodoAppTodoUser.IAuthorized and sets Authorization header to the new
 *    user.
 * 4. As authenticated todoUser, call /todoApp/todoUser/todos
 *    (api.functional.todoApp.todoUser.todos.create) with an
 *    ITodoAppTodo.ICreate payload that includes:
 *
 *    - Title: realistic short text
 *    - Description: non-null string with more detail
 *    - Due_date: future ISO 8601 timestamp
 *    - Status_code: set to the code from the admin-created ITodoAppTodoStatus
 * 5. Capture the ITodoAppTodo response and validate:
 *
 *    - Typia.assert(output) to ensure structural correctness
 *    - Title matches the request
 *    - Description matches the request (non-null)
 *    - Due_date matches the request (non-null)
 *    - Status.code, status.label, status.is_active, status.is_default are consistent
 *         with the created status
 *    - Created_at and updated_at are set
 *    - Completed_at and deleted_at are null or undefined
 *
 * Note: The scenario draft mentioned a subsequent GET by id, but no such
 * endpoint is provided in the available SDK list. Therefore, this test limits
 * validation to the immediate create response and type assertions, without an
 * additional GET.
 */
export async function test_api_todo_creation_with_full_payload(
  connection: api.IConnection,
) {
  // 1. Register todoAdmin (also authenticates and sets Authorization header)
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphaNumeric(12);

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    displayName: RandomGenerator.name(),
    ip: RandomGenerator.alphaNumeric(12),
    href: "https://admin.todoapp.test/join",
    referrer: "https://admin.todoapp.test/landing",
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const adminAuthorized: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ITodoAppTodoAdmin.IAuthorized>(adminAuthorized);

  // 2. Create an active Todo status as todoAdmin
  const statusCodeBase = RandomGenerator.alphabets(8).toUpperCase();
  const statusLabel = RandomGenerator.paragraph({ sentences: 2 });

  const statusCreateBody = {
    code: statusCodeBase,
    label: statusLabel,
    description: RandomGenerator.paragraph({ sentences: 4 }),
    group: "core",
    sort_order: typia.random<number & tags.Type<"int32">>(),
    is_default: false,
    is_active: true,
  } satisfies ITodoAppTodoStatus.ICreate;

  const createdStatus: ITodoAppTodoStatus =
    await api.functional.todoApp.todoAdmin.todoStatuses.create(connection, {
      body: statusCreateBody,
    });
  typia.assert<ITodoAppTodoStatus>(createdStatus);

  // 3. Register todoUser (also authenticates and sets Authorization header)
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const userPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const userJoinBody = {
    email: userEmail,
    password: userPassword,
    display_name: RandomGenerator.name(),
    ip: RandomGenerator.alphaNumeric(12),
    href: "https://todoapp.test/join",
    referrer: "https://todoapp.test/landing",
  } satisfies ITodoAppTodoUserJoin.IRequest;

  const userAuthorized: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: userJoinBody,
    });
  typia.assert<ITodoAppTodoUser.IAuthorized>(userAuthorized);

  // 4. Create a Todo as authenticated todoUser with full payload
  const now = new Date();
  const futureDue = RandomGenerator.date(now, 1000 * 60 * 60 * 24 * 7); // within 7 days

  const todoCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    due_date: futureDue.toISOString(),
    status_code: createdStatus.code,
  } satisfies ITodoAppTodo.ICreate;

  const createdTodo: ITodoAppTodo =
    await api.functional.todoApp.todoUser.todos.create(connection, {
      body: todoCreateBody,
    });
  typia.assert<ITodoAppTodo>(createdTodo);

  // 5. Validate basic field persistence
  TestValidator.equals(
    "todo title should match request",
    createdTodo.title,
    todoCreateBody.title,
  );

  TestValidator.equals(
    "todo description should match request",
    createdTodo.description ?? null,
    todoCreateBody.description ?? null,
  );

  TestValidator.equals(
    "todo due_date should match request",
    createdTodo.due_date ?? null,
    todoCreateBody.due_date ?? null,
  );

  // 6. Validate status summary reflects created status
  TestValidator.equals(
    "todo status code should match created status code",
    createdTodo.status.code,
    createdStatus.code,
  );

  TestValidator.equals(
    "todo status label should match created status label",
    createdTodo.status.label,
    createdStatus.label,
  );

  TestValidator.equals(
    "todo status is_active should match created status is_active",
    createdTodo.status.is_active,
    createdStatus.is_active,
  );

  TestValidator.equals(
    "todo status is_default should match created status is_default",
    createdTodo.status.is_default,
    createdStatus.is_default,
  );

  // 7. Validate lifecycle timestamps and nullables
  await TestValidator.predicate(
    "todo created_at should be set",
    async () =>
      typeof createdTodo.created_at === "string" &&
      createdTodo.created_at.length > 0,
  );

  await TestValidator.predicate(
    "todo updated_at should be set",
    async () =>
      typeof createdTodo.updated_at === "string" &&
      createdTodo.updated_at.length > 0,
  );

  TestValidator.equals(
    "todo completed_at should be null or undefined on creation",
    createdTodo.completed_at ?? null,
    null,
  );

  TestValidator.equals(
    "todo deleted_at should be null or undefined on creation",
    createdTodo.deleted_at ?? null,
    null,
  );
}
