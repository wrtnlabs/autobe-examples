import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPolDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardAdmin";

/**
 * Validate that an authorized administrator can delete an existing admin
 * session.
 *
 * This test covers the entire business workflow for admin session deletion:
 *
 * 1. Creating an administrator account (econPolDiscussionBoardAdmins.create)
 * 2. Logging in as the administrator (auth.admin.join)
 * 3. Deleting an admin session identified by session id
 *    (econPolDiscussionBoardAdmins.sessions.erase)
 *
 * Steps:
 *
 * - Perform admin join to register the administrator and obtain authentication
 *   token.
 * - Create a new admin account with a specific adminUsername.
 * - Authenticate again as the admin to ensure the token is set in the connection.
 * - Simulate obtaining the admin's session id (for the purpose of this test,
 *   generate a uuid to represent a session ID).
 * - Call the erase API to delete the admin session by providing adminUsername and
 *   the session id.
 * - Confirm no errors are thrown and the operation is successful.
 *
 * This test ensures that only authorized admins can delete sessions, validating
 * security and authorization flows.
 */
export async function test_api_admin_delete_admin_session(
  connection: api.IConnection,
) {
  // 1. Admin join (create and authenticate admin to get token)
  const joinBody: IEconPolDiscussionBoardAdmin.IJoin = {
    username: `admin_${RandomGenerator.alphaNumeric(6)}`,
    email: `${RandomGenerator.alphaNumeric(4)}@example.com`,
    password: `P@ssw0rd${RandomGenerator.alphaNumeric(4)}`,
  } satisfies IEconPolDiscussionBoardAdmin.IJoin;
  // Perform join (which returns token and sets it in connection.headers)
  const adminAuthorized: IEconPolDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: joinBody });
  typia.assert(adminAuthorized);

  // 2. Create admin account for session deletion
  const createBody: IEconPolDiscussionBoardAdmin.ICreate = {
    adminUsername: adminAuthorized.adminUsername,
    email: adminAuthorized.email,
    password: joinBody.password,
    role: adminAuthorized.role,
  } satisfies IEconPolDiscussionBoardAdmin.ICreate;
  const createdAdmin: IEconPolDiscussionBoardAdmin =
    await api.functional.econPolDiscussionBoard.admin.econPolDiscussionBoardAdmins.create(
      connection,
      { body: createBody },
    );
  typia.assert(createdAdmin);

  // 3. Re-authenticate as the admin to ensure current token is valid
  // (simulate login again to refresh token, mandatory for subsequent session deletion)
  const reAuthenticatedAdmin: IEconPolDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: joinBody });
  typia.assert(reAuthenticatedAdmin);

  // 4. Prepare a session ID to delete
  // In real case, session ID would be obtained from actual sessions, here we generate a uuid
  const sessionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 5. Delete the admin session
  await api.functional.econPolDiscussionBoard.admin.econPolDiscussionBoardAdmins.sessions.erase(
    connection,
    {
      adminUsername: createdAdmin.adminUsername,
      id: sessionId,
    },
  );
}
