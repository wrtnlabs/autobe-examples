import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import type { ITodoAppTodoAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminJoin";
import type { ITodoAppTodoStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoStatus";

/**
 * Validate successful logical deprecation of a Todo status by todoAdmin.
 *
 * Business goal: Ensure that a privileged todoAdmin can deprecate (logically
 * disable) a specific Todo status by its business `statusCode` (the `code`
 * column), such that:
 *
 * - The status exists and is initially active and non-default.
 * - The first DELETE call succeeds and marks it as deprecated.
 * - A subsequent DELETE for the same code fails, implying the first call changed
 *   catalogue state instead of being a no-op.
 *
 * Constraints and assumptions from available APIs:
 *
 * - We only have join, create, and erase operations in this test scope. There is
 *   no read/list API for statuses exposed here, so we validate deprecation via
 *   behavior (success then failure) rather than direct re-fetch.
 * - The admin authentication context is established by /auth/todoAdmin/join,
 *   which sets Authorization headers on the provided connection via its
 *   token.access field.
 * - The status being deprecated must not be default, so we create a status with
 *   is_default=false.
 * - The status must be initially active, so we set is_active=true.
 *
 * Step-by-step scenario:
 *
 * 1. Register a new todoAdmin account with POST /auth/todoAdmin/join.
 * 2. Using the authenticated admin connection, create a new Todo status with a
 *    unique business code via POST /todoApp/todoAdmin/todoStatuses.
 * 3. Deprecate that status by calling DELETE
 *    /todoApp/todoAdmin/todoStatuses/{statusCode} once; expect success.
 * 4. Call the same DELETE again for the same statusCode and assert that an error
 *    is thrown, confirming that the previous call changed the catalogue state
 *    and that double deprecation is not allowed.
 */
export async function test_api_todo_status_deprecate_success_by_todoadmin(
  connection: api.IConnection,
) {
  // 1. Register a new todoAdmin account and obtain authorized context.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(2),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const admin: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<ITodoAppTodoAdmin.IAuthorized>(admin);

  // 2. Create a new active, non-default Todo status to be deprecated.
  const statusCodePrefix = "TEST_DEPRECATE_";
  const statusCode = `${statusCodePrefix}${RandomGenerator.alphaNumeric(8)}`;

  const createBody = {
    code: statusCode,
    label: RandomGenerator.paragraph({ sentences: 2 }),
    description: null,
    group: null,
    sort_order: typia.random<number & tags.Type<"int32">>(),
    is_default: false,
    is_active: true,
  } satisfies ITodoAppTodoStatus.ICreate;

  const createdStatus: ITodoAppTodoStatus =
    await api.functional.todoApp.todoAdmin.todoStatuses.create(connection, {
      body: createBody,
    });
  typia.assert<ITodoAppTodoStatus>(createdStatus);

  // Ensure that the created status code matches our requested business code.
  TestValidator.equals(
    "created status must keep requested business code",
    createdStatus.code,
    statusCode,
  );

  // 3. First deprecation attempt should succeed (no error thrown).
  await api.functional.todoApp.todoAdmin.todoStatuses.erase(connection, {
    statusCode: createdStatus.code,
  });

  // 4. Second deprecation attempt for the same code should now fail.
  await TestValidator.error(
    "second deprecate call must fail for already deprecated code",
    async () => {
      await api.functional.todoApp.todoAdmin.todoStatuses.erase(connection, {
        statusCode: createdStatus.code,
      });
    },
  );
}
