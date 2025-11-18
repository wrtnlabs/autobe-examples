import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";

/**
 * Validate deletion of an admin session after admin join/login flow.
 *
 * Business intent:
 *
 * - Ensure that once an admin user has been registered (and implicitly logged-in)
 *   via POST /auth/adminUser/join, the same authenticated actor can invoke the
 *   admin-only session deletion endpoint DELETE
 *   /todoApp/adminUser/adminUsers/{adminUserId}/sessions/{sessionId} using a
 *   valid adminUserId and sessionId pair.
 * - Because no session listing/detail SDK functions are available, we treat the
 *   sessionId as a plausible UUID and focus on the contract and authorization
 *   behavior of the erase endpoint, not on actual persistence verification.
 *
 * Flow covered by this test:
 *
 * 1. Register a fresh admin account via api.functional.auth.adminUser.join,
 *    supplying a random but valid ITodoAppAdminUser.IJoin payload. This returns
 *    ITodoAppAdminUser.IAuthorized and also installs the admin access token
 *    into the shared connection headers.
 * 2. Extract the adminUserId from the authorized payload (authorized.id) to use as
 *    the {adminUserId} path parameter for the session deletion endpoint.
 * 3. Generate a random UUID value for {sessionId} to act as the target session
 *    identifier. The backend will determine whether such a session exists; our
 *    goal is to ensure that, when called from an authenticated admin context,
 *    the request is well-formed and reaches the endpoint without client-side
 *    contract issues.
 * 4. Call api.functional.todoApp.adminUser.adminUsers.sessions.erase using the
 *    authenticated connection and the derived adminUserId and sessionId
 *    parameters, and assert that no client-side errors are thrown (successful
 *    completion of the Promise). Because the response type is void, there is no
 *    response body to assert; successful resolution is sufficient.
 * 5. Exercise a basic negative path: create an unauthenticated connection clone
 *    with empty headers and attempt to call the same erase endpoint. Verify via
 *    TestValidator.error that this unauthenticated call fails with some error
 *    (without asserting on concrete HTTP status codes), confirming that
 *    authorization is required for this operation.
 */
export async function test_api_admin_session_delete_after_login_flow(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new admin user via join
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
  } satisfies ITodoAppAdminUser.IJoin;

  const authorized: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2. Extract adminUserId from the authorized payload
  const adminUserId: string & tags.Format<"uuid"> = authorized.id;

  // 3. Generate a plausible sessionId for the target session
  const sessionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 4. Call erase as authenticated admin and ensure it completes without error
  await api.functional.todoApp.adminUser.adminUsers.sessions.erase(connection, {
    adminUserId,
    sessionId,
  });

  // 5. Negative path: unauthenticated connection should not be able to erase
  const unauthenticated: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error("unauthenticated erase must fail", async () => {
    await api.functional.todoApp.adminUser.adminUsers.sessions.erase(
      unauthenticated,
      {
        adminUserId,
        sessionId,
      },
    );
  });
}
