import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuthorizationToken";

/**
 * Test that an authenticated administrator can delete a specific user session
 * (forced logout).
 *
 * Steps:
 *
 * 1. Register an admin via admin join API to get admin credentials (and JWT token
 *    is automatically set in connection)
 * 2. Choose random userId and sessionId UUID (because creation endpoints are not
 *    available for users/sessions)
 * 3. Call admin user session erase with valid admin credentials, expect success
 *    (void response, no error)
 * 4. Attempt to delete again the same session, expect error (already deleted)
 * 5. Attempt to call erase unauthenticated: create a connection snapshot with
 *    empty headers and expect error.
 * 6. Attempt to call erase with invalid admin (new random admin token): register
 *    another admin, set their token, and try deleting the previous session,
 *    expect error (can't delete sessions for other user's sessions even as a
 *    valid admin if platform enforces per-admin scoping)
 */
export async function test_api_discussion_board_user_session_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Register an admin (get JWT token)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://test.example.com/admin/onboarding",
    referrer: "https://test.example.com/landing",
  } satisfies IDiscussionBoardAdmin.IJoin;
  const adminAuth: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(adminAuth);

  // 2. Create random user/session UUIDs for test (simulate existing user session)
  const userId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const sessionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Authenticated admin deletes the user session
  await api.functional.discussionBoard.admin.users.sessions.erase(connection, {
    userId,
    sessionId,
  });

  // 4. Attempt to delete again - expected error (simulate already deleted or not found)
  await TestValidator.error(
    "admin cannot delete the same session twice",
    async () => {
      await api.functional.discussionBoard.admin.users.sessions.erase(
        connection,
        { userId, sessionId },
      );
    },
  );

  // 5. Attempt to call erase unauthenticated (use empty headers)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated erase should fail", async () => {
    await api.functional.discussionBoard.admin.users.sessions.erase(
      unauthConn,
      { userId, sessionId },
    );
  });

  // 6. Attempt to call erase with a different admin (register new admin, use its token)
  const altAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://test.example.com/admin/secondary",
    referrer: "https://test.example.com/landing",
  } satisfies IDiscussionBoardAdmin.IJoin;
  const altAdminAuth: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: altAdminJoinBody,
    });
  typia.assert(altAdminAuth);
  await TestValidator.error(
    "other admin cannot delete nonexistent or foreign session",
    async () => {
      await api.functional.discussionBoard.admin.users.sessions.erase(
        connection,
        { userId, sessionId },
      );
    },
  );
}
