import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuthorizationToken";
import type { IDiscussionBoardUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSession";

/**
 * Validate that an administrator can retrieve all session details for a
 * specific user session, enforcing authorization, data consistency, and audit
 * trail accuracy.
 *
 * 1. Register and authenticate as a new admin, acquiring a valid session/token
 * 2. Attempt unauthorized session access (no admin login) to confirm access is
 *    denied
 * 3. Use a valid admin token, retrieve details for a random user session
 * 4. Validate the schema and fields (id, discussion_board_user_id, ip, href,
 *    referrer, created_at, expired_at) via typia.assert
 * 5. Confirm all required audit and session metadata is correctly provided for
 *    traceability
 */
export async function test_api_discussion_board_user_session_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as a new admin
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: typia.random<string & tags.MinLength<8>>(),
    ip: "127.0.0.1",
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/login",
  } satisfies IDiscussionBoardAdmin.IJoin;
  const adminAuth: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(adminAuth);

  // 2. Attempt session retrieval without admin authentication (should fail)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  const fakeUserId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const fakeSessionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "unauthenticated admin should not retrieve session",
    async () => {
      await api.functional.discussionBoard.admin.users.sessions.at(unauthConn, {
        userId: fakeUserId,
        sessionId: fakeSessionId,
      });
    },
  );

  // 3. Retrieve a user session as admin (simulate session)
  const testUserId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const testSessionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const session: IDiscussionBoardUserSession =
    await api.functional.discussionBoard.admin.users.sessions.at(connection, {
      userId: testUserId,
      sessionId: testSessionId,
    });
  typia.assert(session);
}
