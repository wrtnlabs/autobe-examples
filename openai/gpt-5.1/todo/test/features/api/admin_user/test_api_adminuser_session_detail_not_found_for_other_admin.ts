import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppAdminuserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminuserSession";

/**
 * Verify that an authenticated admin user cannot retrieve arbitrary admin
 * session details using a guessed or foreign session identifier.
 *
 * Business intent:
 *
 * - Ensure that GET
 *   /todoApp/adminUser/adminUsers/{adminUserId}/sessions/{sessionId} does not
 *   leak session information when the requested session id does not belong to
 *   the specified admin user, or does not exist at all.
 * - Demonstrate that an authenticated admin (Admin A) cannot use the endpoint to
 *   probe or enumerate sessions that are not legitimately associated with
 *   them.
 *
 * Due to API and DTO limitations (no way to list or directly access concrete
 * session ids from the join/login flow), we approximate a "foreign" or
 * non-owned session id by using a random UUID that is not issued by the system.
 * The expectation is that any such lookup fails rather than returning a valid
 * ITodoAppAdminuserSession.
 *
 * Test flow:
 *
 * 1. Register and authenticate an admin user (Admin A) using POST
 *    /auth/adminUser/join on the provided connection.
 *
 *    - Build ITodoAppAdminUser.IJoin with random but valid email and password.
 *    - Verify the returned ITodoAppAdminUser.IAuthorized object via typia.assert().
 *         This also configures the connection to carry Admin A's Authorization
 *         header for subsequent calls.
 * 2. Generate a random UUID value to serve as a candidate foreign session
 *    identifier.
 * 3. Call GET /todoApp/adminUser/adminUsers/{adminUserId}/sessions/{sessionId}
 *    through api.functional.todoApp.adminUser.adminUsers.sessions.at using:
 *
 *    - AdminUserId = Admin A.id
 *    - SessionId = the generated random UUID Wrap this call in
 *         TestValidator.error(), expecting it to throw rather than return an
 *         ITodoAppAdminuserSession.
 * 4. Do not inspect HttpError status or message; only assert that an error occurs,
 *    thereby ensuring that no session details are exposed for this arbitrary
 *    id.
 */
export async function test_api_adminuser_session_detail_not_found_for_other_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate Admin A via join()
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
  } satisfies ITodoAppAdminUser.IJoin;

  const adminA = await api.functional.auth.adminUser.join(connection, {
    body: joinBody,
  });
  typia.assert(adminA);

  // 2. Generate a random UUID to act as a foreign/invalid session id
  const foreignSessionId = typia.random<string & tags.Format<"uuid">>();

  // 3. Attempt to fetch a session for Admin A using the foreign session id
  //    Expectation: the call must fail (no ITodoAppAdminuserSession is
  //    returned), so we wrap it in TestValidator.error(). We do not check
  //    specific status codes or error messages, only that an error occurs.
  await TestValidator.error(
    "admin user cannot read arbitrary session details",
    async () => {
      await api.functional.todoApp.adminUser.adminUsers.sessions.at(
        connection,
        {
          adminUserId: adminA.id,
          sessionId: foreignSessionId,
        },
      );
    },
  );
}
