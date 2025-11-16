import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import type { ITodoAppTodoAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminJoin";
import type { ITodoAppTodoStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoStatus";

/**
 * Validate creation of Todo status entries by an authenticated todoAdmin.
 *
 * Business goal:
 *
 * - Ensure that a freshly registered todoAdmin can create a new Todo status entry
 *   in the centralized `todo_app_todo_statuses` catalogue using the dedicated
 *   administrative endpoint.
 * - Confirm that the created status echoes back the core configuration fields
 *   supplied in the ITodoAppTodoStatus.ICreate payload.
 * - Verify that an unauthenticated connection cannot call the protected creation
 *   endpoint successfully.
 *
 * High-level steps:
 *
 * 1. Register (join) a new todoAdmin account and obtain an authorized context with
 *    JWT tokens via /auth/todoAdmin/join.
 * 2. Using the authenticated connection (with SDK-managed Authorization header),
 *    call POST /todoApp/todoAdmin/todoStatuses with a valid
 *    ITodoAppTodoStatus.ICreate payload to create a new status.
 * 3. Assert that the response is a full ITodoAppTodoStatus object, and validate
 *    that its business fields (code, label, description, group, sort_order,
 *    is_default, is_active) match the sent values.
 * 4. Build an unauthenticated connection and verify that the same creation attempt
 *    fails via TestValidator.error, proving that authorization is enforced.
 */
export async function test_api_todo_status_creation_by_todoadmin(
  connection: api.IConnection,
) {
  // 1. Register a new todoAdmin (join) to obtain authorized context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    displayName: RandomGenerator.name(2),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const adminAuthorized: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<ITodoAppTodoAdmin.IAuthorized>(adminAuthorized);

  // 2. Prepare a valid Todo status creation payload
  const statusCodePrefix = "IN_PROGRESS_";
  const statusCodeSuffix = RandomGenerator.alphaNumeric(8).toUpperCase();
  const statusCode = `${statusCodePrefix}${statusCodeSuffix}`;

  const createBody = {
    code: statusCode,
    label: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
    description: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 4,
      wordMax: 10,
    }),
    group: "core",
    sort_order: typia.random<number & tags.Type<"int32">>(),
    is_default: false,
    is_active: true,
  } satisfies ITodoAppTodoStatus.ICreate;

  // 3. Call the admin Todo status creation endpoint with authenticated context
  const createdStatus: ITodoAppTodoStatus =
    await api.functional.todoApp.todoAdmin.todoStatuses.create(connection, {
      body: createBody,
    });
  typia.assert<ITodoAppTodoStatus>(createdStatus);

  // 3-1. Validate that response maps business fields correctly
  TestValidator.equals(
    "todo status code should match request payload",
    createdStatus.code,
    createBody.code,
  );
  TestValidator.equals(
    "todo status label should match request payload",
    createdStatus.label,
    createBody.label,
  );
  TestValidator.equals(
    "todo status description should match request payload",
    createdStatus.description,
    createBody.description,
  );
  TestValidator.equals(
    "todo status group should match request payload",
    createdStatus.group,
    createBody.group,
  );
  TestValidator.equals(
    "todo status sort_order should match request payload",
    createdStatus.sort_order,
    createBody.sort_order,
  );
  TestValidator.equals(
    "todo status is_default flag should match request payload",
    createdStatus.is_default,
    createBody.is_default,
  );
  TestValidator.equals(
    "todo status is_active flag should match request payload",
    createdStatus.is_active,
    createBody.is_active,
  );

  // 4. Unauthorized scenario: construct an unauthenticated connection
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  const unauthorizedCreateBody = {
    code: `${statusCode}_UNAUTH`,
    label: RandomGenerator.paragraph({ sentences: 1, wordMin: 3, wordMax: 8 }),
    description: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 4,
      wordMax: 10,
    }),
    group: "core",
    sort_order: typia.random<number & tags.Type<"int32">>(),
    is_default: false,
    is_active: true,
  } satisfies ITodoAppTodoStatus.ICreate;

  await TestValidator.error(
    "creating todo status without admin token must fail",
    async () => {
      await api.functional.todoApp.todoAdmin.todoStatuses.create(
        unauthConnection,
        {
          body: unauthorizedCreateBody,
        },
      );
    },
  );
}
