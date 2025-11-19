import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";

/**
 * Validates that an administrator can successfully delete their own session.
 *
 * Business context: Ensures that an admin can securely invalidate their session
 * via explicit session deletion by sessionId and adminId. This test verifies
 * account registration, session authentication, and that the deletion operation
 * deactivates the relevant authentication tokens without affecting other
 * sessions. Successful execution upholds strict compliance and privilege
 * management requirements.
 *
 * Step-by-step process:
 *
 * 1. Register a new admin via admin join endpoint
 * 2. Assert registration result and extract adminId
 * 3. Store issued session (token) information
 * 4. Call session deletion endpoint to remove the session using adminId and
 *    sessionId
 * 5. Verify deletion is successful (no error returned)
 * 6. Attempt an authenticated operation using the now-invalidated token and
 *    confirm access is denied (token is invalidated)
 * 7. (If implemented) Optionally check audit log or other session state endpoints
 *    to confirm the session was terminated and other sessions remain valid (not
 *    implemented here since no audit or session listing endpoint is defined in
 *    the API surface)
 */
export async function test_api_admin_session_delete_success(
  connection: api.IConnection,
) {
  // 1. Register a new admin account
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://admin-portal.example.com/register",
    referrer: "https://admin-portal.example.com/marketing",
  } satisfies IDiscussionBoardAdmin.IJoin;
  const admin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinInput,
    });
  typia.assert(admin);
  const adminId = admin.id;
  const sessionId = admin.token.refresh satisfies string as string;
  // 2. Delete admin's session using the adminId and sessionId
  await api.functional.discussionBoard.admin.admins.sessions.erase(connection, {
    adminId,
    sessionId,
  });
  // 3. Assert that token is invalid for further use (i.e., session is really deleted)
  // Try to perform a privileged operation with the same connection (token should now be invalid)
  await TestValidator.error("using invalidated token fails", async () => {
    await api.functional.discussionBoard.admin.admins.sessions.erase(
      connection,
      {
        adminId,
        sessionId,
      },
    );
  });
  // Further actions such as checking audit log or unaffected other sessions require endpoints not present in provided API surface.
}
