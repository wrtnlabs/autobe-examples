import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import type { ITodoAppTodoAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminJoin";
import type { ITodoAppTodoStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoStatus";

/**
 * Verify that todoAdmin detail view endpoint rejects unauthenticated access.
 *
 * Business context: The `GET /todoApp/todoAdmin/todoAdmins/{todoAdminId}`
 * endpoint exposes detailed information about privileged administrative
 * accounts. According to its contract, it should only be callable by
 * authenticated todoAdmin actors. Any attempt to access this endpoint without a
 * valid Authorization context must fail with an HTTP error and must not leak
 * the admin DTO payload.
 *
 * Test flow:
 *
 * 1. Register a new todoAdmin via `POST /auth/todoAdmin/join` to obtain a real
 *    admin id and to cause the SDK to attach an Authorization token to the base
 *    `connection`.
 * 2. As an authenticated admin, create one Todo status configuration row via `POST
 *    /todoApp/todoAdmin/todoStatuses` to respect the declared dependency, even
 *    though it does not directly affect the detail-view behavior.
 * 3. Derive an `unauthenticatedConnection` from the original `connection` by
 *    shallow-copying it and overriding `headers` with an empty object, ensuring
 *    that subsequent calls using this connection do not carry any Authorization
 *    header.
 * 4. Invoke `GET /todoApp/todoAdmin/todoAdmins/{todoAdminId}` using the
 *    unauthenticated connection and the previously created admin id, and assert
 *    that the call fails with an HTTP error using `TestValidator.httpError`.
 * 5. As a sanity check, call the same endpoint again with the original,
 *    authenticated `connection` and verify that it succeeds and returns a
 *    properly typed `ITodoAppTodoAdmin` whose id matches the created admin id.
 */
export async function test_api_todoadmin_detail_view_unauthorized(
  connection: api.IConnection,
) {
  // 1. Register a new todoAdmin and obtain an authorized context
  const joinBody = typia.random<ITodoAppTodoAdminJoin.IRequest>();

  const authorizedAdmin: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<ITodoAppTodoAdmin.IAuthorized>(authorizedAdmin);

  const adminId = authorizedAdmin.id;

  // 2. As authenticated admin, create a Todo status entry per dependency
  const statusCreateBody = typia.random<ITodoAppTodoStatus.ICreate>();

  const createdStatus: ITodoAppTodoStatus =
    await api.functional.todoApp.todoAdmin.todoStatuses.create(connection, {
      body: statusCreateBody,
    });
  typia.assert<ITodoAppTodoStatus>(createdStatus);

  // 3. Build an unauthenticated connection by overriding headers
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 4. Attempt to fetch admin detail without Authorization
  await TestValidator.httpError(
    "unauthenticated todoAdmin detail view should be rejected",
    [401, 403],
    async () => {
      await api.functional.todoApp.todoAdmin.todoAdmins.at(
        unauthenticatedConnection,
        {
          todoAdminId: adminId,
        },
      );
    },
  );

  // 5. Sanity check: same endpoint must succeed with valid Authorization
  const adminDetail: ITodoAppTodoAdmin =
    await api.functional.todoApp.todoAdmin.todoAdmins.at(connection, {
      todoAdminId: adminId,
    });
  typia.assert<ITodoAppTodoAdmin>(adminDetail);

  TestValidator.equals(
    "authorized detail view should return the same admin id",
    adminDetail.id,
    adminId,
  );
}
