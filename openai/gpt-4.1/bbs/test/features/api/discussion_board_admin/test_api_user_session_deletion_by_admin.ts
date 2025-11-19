import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";

/**
 * Tests admin-only user session deletion behavior:
 *
 * 1. Register a new admin (to get authentication tokens).
 * 2. Attempt to delete a random session for a random user via
 *    /discussionBoard/admin/users/{userId}/sessions/{sessionId} as admin
 *    (should succeed even though IDs are arbitrary—they pass format
 *    validation).
 * 3. Attempt the same deletion while unauthenticated to confirm that only admins
 *    can access this endpoint (should fail with error).
 *
 * Note: The test can't create actual user/sessions as there are no user/session
 * creation endpoints among the allowed API calls, so uses random but valid
 * UUIDs for userId and sessionId. This exercises the authorization logic and
 * verifies proper format validation and permission enforcement.
 */
export async function test_api_user_session_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Register admin, get tokens
  const adminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.MinLength<8> &
      tags.Format<"password">,
    href: "https://test.example.com/join",
    referrer: "https://test.example.com/login",
  } satisfies IDiscussionBoardAdmin.IJoin;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminJoinInput,
  });
  typia.assert(adminAuth);

  // 2. As authenticated admin, delete a random session for a random user (should succeed: format/authorization only tested)
  const userId = typia.random<string & tags.Format<"uuid">>();
  const sessionId = typia.random<string & tags.Format<"uuid">>();
  await api.functional.discussionBoard.admin.users.sessions.erase(connection, {
    userId,
    sessionId,
  });

  // 3. Attempt to delete with unauthenticated connection (should fail)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized session deletion should fail",
    async () => {
      await api.functional.discussionBoard.admin.users.sessions.erase(
        unauthConn,
        { userId, sessionId },
      );
    },
  );
}
