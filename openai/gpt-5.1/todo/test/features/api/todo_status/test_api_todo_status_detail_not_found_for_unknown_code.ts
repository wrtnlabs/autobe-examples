import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import type { ITodoAppTodoAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminJoin";
import type { ITodoAppTodoStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoStatus";

/**
 * Verify that requesting a Todo status detail with an unknown statusCode
 * results in a not-found style error and does not return a ITodoAppTodoStatus.
 *
 * Business context: The todoApp service maintains a catalogue of valid Todo
 * statuses in the `todo_app_todo_statuses` table. Clients can look up a
 * specific status by its stable business `code` using GET
 * /todoApp/todoStatuses/{statusCode}. When a client passes a code that does not
 * exist, the backend should not fabricate a status; instead it must signal that
 * the resource is not found via an HTTP error. This test ensures that behavior,
 * using a realistic setup where the catalogue is not empty.
 *
 * Steps:
 *
 * 1. Register (join) a new todoAdmin account using /auth/todoAdmin/join so that we
 *    have administrative privileges and valid JWT tokens attached to the SDK
 *    connection.
 * 2. As that admin, create at least one real Todo status using POST
 *    /todoApp/todoAdmin/todoStatuses with a unique `code`.
 * 3. Choose another `statusCode` string that is guaranteed not to exist in the
 *    catalogue (for example, by prefixing/suffixing the known code with a
 *    random token).
 * 4. Call GET /todoApp/todoStatuses/{statusCode} with this non-existent code.
 * 5. Assert that the call fails with an error (no ITodoAppTodoStatus is returned)
 *    using TestValidator.error, focusing on the fact that an error is thrown
 *    rather than on specific status codes or error payload shapes.
 */
export async function test_api_todo_status_detail_not_found_for_unknown_code(
  connection: api.IConnection,
) {
  // 1. Register a new todoAdmin and obtain authorized context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: null,
    href: "https://admin.todo-app.example.com/join",
    referrer: "https://admin.todo-app.example.com/landing",
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const adminAuthorized: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create at least one real Todo status in the catalogue
  const existingStatusBody = {
    code: `ACTIVE_${RandomGenerator.alphaNumeric(8)}`,
    label: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    group: "core",
    sort_order: 1,
    is_default: true,
    is_active: true,
  } satisfies ITodoAppTodoStatus.ICreate;

  const existingStatus: ITodoAppTodoStatus =
    await api.functional.todoApp.todoAdmin.todoStatuses.create(connection, {
      body: existingStatusBody,
    });
  typia.assert(existingStatus);
  TestValidator.equals(
    "created status code should match request body code",
    existingStatus.code,
    existingStatusBody.code,
  );

  // 3. Choose a guaranteed non-existent statusCode
  const unknownStatusCode: string = `${existingStatus.code}__UNKNOWN_${RandomGenerator.alphaNumeric(12)}`;
  TestValidator.notEquals(
    "unknown status code must be different from existing code",
    unknownStatusCode,
    existingStatus.code,
  );

  // 4 & 5. Call detail endpoint with unknown code and assert error
  await TestValidator.error(
    "unknown status code should result in error",
    async () => {
      await api.functional.todoApp.todoStatuses.at(connection, {
        statusCode: unknownStatusCode,
      });
    },
  );
}
