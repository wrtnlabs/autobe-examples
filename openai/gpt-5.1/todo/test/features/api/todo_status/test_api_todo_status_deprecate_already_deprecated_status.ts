import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import type { ITodoAppTodoAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminJoin";
import type { ITodoAppTodoStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoStatus";

/**
 * Ensure that attempting to deprecate an already-deprecated Todo status fails.
 *
 * Business goal:
 *
 * - Todo statuses are centrally defined in `todo_app_todo_statuses` and addressed
 *   by their business `code`.
 * - DELETE /todoApp/todoAdmin/todoStatuses/{statusCode} must _not_ behave as a
 *   silently idempotent delete when the status is already deprecated. Instead,
 *   a second deprecation attempt for the same `statusCode` must respond with an
 *   error to keep administrators' mental model of catalogue state accurate.
 *
 * Scenario steps:
 *
 * 1. Register a new todoAdmin using POST /auth/todoAdmin/join and obtain an
 *    authenticated connection (the SDK wires the JWT into headers).
 * 2. As that admin, create a new active, non-default Todo status via POST
 *    /todoApp/todoAdmin/todoStatuses with a unique code such as
 *    "TEST_ALREADY_DEPRECATED_*".
 * 3. Call DELETE /todoApp/todoAdmin/todoStatuses/{statusCode} once using the
 *    created status.code. This is expected to succeed and logically deprecate
 *    the status in the catalogue.
 * 4. Call the same DELETE endpoint a second time with the identical `statusCode`.
 *    This second call must _fail_ with an error instead of silently succeeding,
 *    reflecting the "already deprecated" constraint described in the endpoint
 *    documentation.
 * 5. Assert that the second call throws by wrapping it with `await
 *    TestValidator.error`. We do not inspect HTTP status codes or error
 *    bodies—only that an error is raised.
 */
export async function test_api_todo_status_deprecate_already_deprecated_status(
  connection: api.IConnection,
) {
  // 1. Register a new todoAdmin and obtain an authorized context.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const admin = await api.functional.auth.todoAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert<ITodoAppTodoAdmin.IAuthorized>(admin);

  // 2. Create a new active, non-default Todo status to be deprecated.
  const uniqueSuffix = RandomGenerator.alphaNumeric(8).toUpperCase();
  const statusCode = `TEST_ALREADY_DEPRECATED_${uniqueSuffix}`;

  const createBody = {
    code: statusCode,
    label: `Already deprecated test ${uniqueSuffix}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    group: "e2e-test",
    sort_order: 100,
    is_default: false,
    is_active: true,
  } satisfies ITodoAppTodoStatus.ICreate;

  const createdStatus =
    await api.functional.todoApp.todoAdmin.todoStatuses.create(connection, {
      body: createBody,
    });
  typia.assert<ITodoAppTodoStatus>(createdStatus);

  // Sanity check: ensure the status code we will use for deletion matches.
  TestValidator.equals(
    "created status.code must equal requested statusCode",
    createdStatus.code,
    statusCode,
  );

  // 3. First deprecation attempt: should succeed without throwing.
  await api.functional.todoApp.todoAdmin.todoStatuses.erase(connection, {
    statusCode: createdStatus.code,
  });

  // 4. Second deprecation attempt: must fail with an error because the status
  //    is already deprecated.
  await TestValidator.error(
    "second erase on already-deprecated status must throw",
    async () => {
      await api.functional.todoApp.todoAdmin.todoStatuses.erase(connection, {
        statusCode: createdStatus.code,
      });
    },
  );
}
