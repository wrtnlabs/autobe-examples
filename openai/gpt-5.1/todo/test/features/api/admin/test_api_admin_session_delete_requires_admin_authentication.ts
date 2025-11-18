import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";

/**
 * Verify that deleting an admin session requires proper adminUser
 * authentication.
 *
 * This test exercises the following authorization behaviors on the admin
 * session deletion endpoint:
 *
 * 1. An unauthenticated caller (no Authorization header) must not be allowed to
 *    delete an admin session.
 * 2. A caller using a connection that does not have adminUser credentials set
 *    (simulating a non-admin context in the absence of other actor types) must
 *    also be rejected.
 * 3. A properly authenticated adminUser, obtained via POST /auth/adminUser/join,
 *    must be able to invoke DELETE
 *    /todoApp/adminUser/adminUsers/{adminUserId}/sessions/{sessionId} without
 *    authorization errors.
 *
 * Because the SDK only exposes the adminUser join endpoint and the
 * todoApp.adminUser.adminUsers.sessions.erase endpoint, this test focuses on
 * authorization rather than verifying actual persistence of session rows. The
 * {adminUserId, sessionId} pair used for deletion is generated as random UUIDs
 * to satisfy the type contracts. The key contract under test is that the server
 * enforces the `authorizationActors: ["adminUser"]` requirement for the
 * sessions.erase endpoint.
 */
export async function test_api_admin_session_delete_requires_admin_authentication(
  connection: api.IConnection,
) {
  // 1. Register an admin user to obtain adminUser credentials and
  // Authorization header on the primary connection.
  const adminJoinInput = typia.random<ITodoAppAdminUser.IJoin>();
  const authorizedAdmin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinInput,
    });
  typia.assert<ITodoAppAdminUser.IAuthorized>(authorizedAdmin);

  // At this point, the SDK's join() implementation has set
  // connection.headers.Authorization = output.token.access.
  // We'll treat this connection as an authenticated adminUser context.

  // Prepare a target adminUserId/sessionId pair. In a full system we'd derive
  // this from a real session, but for this test we only need well-typed
  // identifiers for authorization behavior.
  const adminUserId: string & tags.Format<"uuid"> = authorizedAdmin.id;
  const sessionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 2. Unauthenticated call: create a separate connection object with no
  // headers to simulate a completely unauthenticated context.
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated caller cannot delete admin session",
    async () => {
      await api.functional.todoApp.adminUser.adminUsers.sessions.erase(
        unauthenticatedConnection,
        {
          adminUserId,
          sessionId,
        },
      );
    },
  );

  // 3. Simulated non-admin context. Since we have no explicit memberUser or
  // other non-admin role in the available SDK, we simulate this by using
  // another fresh connection without any Authorization header as a distinct
  // logical actor.
  const nonAdminConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "non-admin context cannot delete admin session",
    async () => {
      await api.functional.todoApp.adminUser.adminUsers.sessions.erase(
        nonAdminConnection,
        {
          adminUserId,
          sessionId,
        },
      );
    },
  );

  // 4. Positive path: authenticated adminUser should be able to call the
  // deletion endpoint without authorization errors using the main connection.
  await api.functional.todoApp.adminUser.adminUsers.sessions.erase(connection, {
    adminUserId,
    sessionId,
  });

  // No further assertions are made on the response body since erase() returns
  // void and its primary contract is successful completion under valid admin
  // authentication.
}
