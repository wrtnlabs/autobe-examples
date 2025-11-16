import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuthorizationToken";

/**
 * Validate session deletion by admin for discussion board system.
 *
 * This test verifies that an authenticated administrator can permanently delete
 * the session of an administrator account by targeting
 * /discussionBoard/admin/admins/{adminId}/sessions/{sessionId}. The flow
 * covers:
 *
 * 1. Admin registration to establish a valid account and receive session and token
 *    context.
 * 2. Generate a random sessionId (UUID) for negative testing. Erase returns void
 *    regardless of session existence, but we can test that invalid or random
 *    session deletion is handled gracefully.
 * 3. Confirm that unauthorized users (no token) cannot perform session deletion.
 * 4. Validate all business/security requirements: session deletion is an
 *    admin-only action, and attempts to delete sessions without authentication
 *    are rejected.
 */
export async function test_api_admin_session_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new administrator and get login/session context
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://admin-portal.example.com/registration",
    referrer: "https://admin-portal.example.com/login",
  } satisfies IDiscussionBoardAdmin.IJoin;
  const admin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: joinInput });
  typia.assert(admin);
  TestValidator.equals(
    "admin email matches join",
    admin.email,
    joinInput.email,
  );
  TestValidator.predicate("admin account is active", admin.is_active === true);
  TestValidator.predicate("admin is not blocked", admin.is_blocked === false);
  TestValidator.predicate(
    "admin session has JWT token",
    typeof admin.token.access === "string" && admin.token.access.length > 0,
  );

  // 2. Attempt to delete a random (non-existent) session for negative testing (to confirm endpoint behavior)
  const randomSessionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await api.functional.discussionBoard.admin.admins.sessions.erase(connection, {
    adminId: admin.id,
    sessionId: randomSessionId,
  });
  // Since erase returns void, we can only test that the call succeeds (or fails appropriately if the backend validates existence)

  // 3. Unauthenticated users CANNOT delete sessions
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "cannot delete session when unauthenticated",
    async () => {
      await api.functional.discussionBoard.admin.admins.sessions.erase(
        unauthConn,
        {
          adminId: admin.id,
          sessionId: randomSessionId,
        },
      );
    },
  );
}
