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
 * Verify that a todoUser can delete a Todo they own using the DELETE
 * /todoApp/todoUser/todos/{todoId} endpoint, and that attempting to delete the
 * same Todo again results in an error.
 *
 * ## Business context
 *
 * In the todoApp service, each Todo belongs to a specific todoUser and is
 * stored in the `todo_app_todos` table. Only the owning todoUser should be
 * allowed to delete their Todo via the /todoApp/todoUser/todos/{todoId} DELETE
 * API, exposed in the SDK as api.functional.todoApp.todoUser.todos.erase.
 *
 * A valid Todo also participates in the status catalogue defined in
 * `todo_app_todo_statuses`. Therefore, an admin actor must be able to create at
 * least one active status entry so that todos can optionally reference an
 * initial status via `status_code` at creation time.
 *
 * This scenario uses both admin and user actors:
 *
 * - TodoAdmin: manages the status catalogue.
 * - TodoUser: owns and manipulates personal Todos.
 *
 * ## Step-by-step scenario
 *
 * 1. Register and authenticate a todoAdmin
 *
 *    - Call POST /auth/todoAdmin/join via api.functional.auth.todoAdmin.join
 *    - Use realistic but random email/password and URLs for href/referrer
 *    - Confirm the response shape with typia.assert
 *    - (Optionally) Call /auth/todoAdmin/login with the same credentials to exercise
 *         the login path and ensure SDK token handling works; this is not
 *         strictly necessary for status creation but gives a richer flow within
 *         one test.
 * 2. Create a Todo status entry
 *
 *    - Call POST /todoApp/todoAdmin/todoStatuses via
 *         api.functional.todoApp.todoAdmin.todoStatuses.create
 *    - Build an ITodoAppTodoStatus.ICreate body with:
 *
 *         - Code: a deterministic value such as "ACTIVE" (or a variant including a random
 *                   suffix to avoid unique constraint conflicts when tests run
 *                   repeatedly)
 *         - Label: a readable label like "Active"
 *         - Description/group: optional text or null
 *         - Sort_order: a small int32 (e.g., 1)
 *         - Is_default: true
 *         - Is_active: true
 *    - Assert the ITodoAppTodoStatus response with typia.assert and optionally basic
 *         invariants with TestValidator.predicate.
 * 3. Register and authenticate a todoUser
 *
 *    - Call POST /auth/todoUser/join via api.functional.auth.todoUser.join
 *    - Use another random email/password and href/referrer URIs
 *    - Assert the ITodoAppTodoUser.IAuthorized response
 *    - (Optionally) Call /auth/todoUser/login with the same credentials to verify
 *         login + token refresh behavior.
 * 4. Create a Todo owned by this todoUser
 *
 *    - Call POST /todoApp/todoUser/todos via
 *         api.functional.todoApp.todoUser.todos.create
 *    - Build an ITodoAppTodo.ICreate body:
 *
 *         - Title: a small random paragraph
 *         - Description: a longer random paragraph or null
 *         - Due_date: an ISO 8601 date-time string in the near future, or null
 *         - Status_code: the `code` from the created Todo status, so the Todo starts in
 *                   the "ACTIVE" (or similar) state
 *    - Assert the ITodoAppTodo response via typia.assert.
 * 5. Delete the Todo as its owner
 *
 *    - Call DELETE /todoApp/todoUser/todos/{todoId} via
 *         api.functional.todoApp.todoUser.todos.erase with todoId =
 *         createdTodo.id
 *    - This endpoint returns void; the fact that the Promise resolves without
 *         throwing indicates success.
 * 6. Attempt to delete the same Todo again and expect failure
 *
 *    - Use TestValidator.error with an async callback that calls
 *         api.functional.todoApp.todoUser.todos.erase again with the same
 *         todoId.
 *    - The expectation is that the backend will now treat the Todo as non-existent
 *         (or otherwise invalid for deletion) and throw an HttpError or
 *         similar.
 *    - This serves as an indirect confirmation that the resource is no longer
 *         deletable after the first successful erase.
 *
 * ## Important constraints and adaptations
 *
 * - The original natural-language scenario mentioned verifying that the deleted
 *   Todo is no longer returned by GET/detail or list endpoints. However, such
 *   endpoints are not present in the provided SDK, so this test adapts the
 *   verification to a double-delete pattern, which is implementable with
 *   existing functions.
 * - The SDK’s auth functions automatically manage Authorization headers on the
 *   connection object (via token.access). The test must NOT modify
 *   connection.headers directly.
 * - All request bodies must strictly satisfy the provided DTO types using the
 *   `satisfies` keyword; we never use `as any` or type-unsafe casts.
 * - We avoid checking raw HTTP status codes and instead rely on
 *   TestValidator.error to assert that a second delete fails.
 */
export async function test_api_todo_delete_by_owner(
  connection: api.IConnection,
) {
  // 1. Admin registration (join)
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string = RandomGenerator.alphaNumeric(12);
  const adminHref: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const adminReferrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    displayName: RandomGenerator.name(),
    ip: null,
    href: adminHref,
    referrer: adminReferrer,
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const adminJoinOutput: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminJoinOutput);

  // Optional admin login to exercise login path
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: adminHref,
    referrer: adminReferrer,
  } satisfies ITodoAppTodoAdminLogin.IRequest;

  const adminLoginOutput: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginOutput);

  // 2. Admin creates a Todo status
  const statusCodeBase = "ACTIVE";
  const statusCodeSuffix = RandomGenerator.alphaNumeric(6);
  const statusCode = `${statusCodeBase}_${statusCodeSuffix}`;

  const statusCreateBody = {
    code: statusCode,
    label: "Active",
    description: "Active todo status for newly created todos",
    group: "core",
    sort_order: 1 as number & tags.Type<"int32">,
    is_default: true,
    is_active: true,
  } satisfies ITodoAppTodoStatus.ICreate;

  const statusOutput: ITodoAppTodoStatus =
    await api.functional.todoApp.todoAdmin.todoStatuses.create(connection, {
      body: statusCreateBody,
    });
  typia.assert(statusOutput);

  TestValidator.predicate(
    "created status is active",
    statusOutput.is_active === true,
  );
  TestValidator.predicate(
    "created status is default",
    statusOutput.is_default === true,
  );

  // 3. User registration (join)
  const userEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const userPassword: string = RandomGenerator.alphaNumeric(12);
  const userHref: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const userReferrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const userJoinBody = {
    email: userEmail,
    password: userPassword as string & tags.Format<"password">,
    display_name: RandomGenerator.name(),
    ip: null,
    href: userHref,
    referrer: userReferrer,
  } satisfies ITodoAppTodoUserJoin.IRequest;

  const userJoinOutput: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: userJoinBody,
    });
  typia.assert(userJoinOutput);

  // Optional user login to exercise login path
  const userLoginBody = {
    email: userEmail,
    password: userPassword,
    ip: null,
    href: userHref,
    referrer: userReferrer,
  } satisfies ITodoAppTodoUserLogin.IRequest;

  const userLoginOutput: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.login(connection, {
      body: userLoginBody,
    });
  typia.assert(userLoginOutput);

  // 4. User creates a Todo
  const todoTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 8,
  });
  const todoDescription = RandomGenerator.paragraph({
    sentences: 6,
    wordMin: 3,
    wordMax: 8,
  });

  const now = new Date();
  const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
  const futureDueDate = RandomGenerator.date(now, oneWeekMs).toISOString();

  const todoCreateBody = {
    title: todoTitle,
    description: todoDescription,
    due_date: futureDueDate,
    status_code: statusOutput.code,
  } satisfies ITodoAppTodo.ICreate;

  const createdTodo: ITodoAppTodo =
    await api.functional.todoApp.todoUser.todos.create(connection, {
      body: todoCreateBody,
    });
  typia.assert(createdTodo);

  TestValidator.equals(
    "created todo title matches input",
    createdTodo.title,
    todoTitle,
  );

  // 5. Delete the Todo as its owner
  await api.functional.todoApp.todoUser.todos.erase(connection, {
    todoId: createdTodo.id,
  });

  // 6. Second delete must fail
  await TestValidator.error("double delete should fail", async () => {
    await api.functional.todoApp.todoUser.todos.erase(connection, {
      todoId: createdTodo.id,
    });
  });
}
