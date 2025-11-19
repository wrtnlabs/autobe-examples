import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminSession";

/**
 * Test retrieving a specific active session detail for a discussion board
 * administrator.
 *
 * This test performs the following steps:
 *
 * 1. Registers a new admin account to obtain authentication credentials.
 * 2. Creates a discussion board administrator entry.
 * 3. Creates an active session for the discussion board administrator.
 * 4. Retrieves the specific session details using the authorized admin context.
 *
 * The test validates that session metadata including IP address, connection
 * URL, referrer URL, creation timestamp, and expiration timestamp (expected
 * null for an active session) are correctly returned. It also ensures that the
 * authorization context is correctly enforced and that the session retrieval
 * only succeeds with proper admin authentication.
 */
export async function test_api_discussion_board_admin_session_detail_retrieval(
  connection: api.IConnection,
) {
  // 1. Register a new admin account with valid IJoin data
  const adminJoinBody = {
    email: `admin_${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: "StrongPass!1",
    nickname: RandomGenerator.name(2),
  } satisfies IDiscussionBoardAdmin.IJoin;
  const adminAuthorized: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(adminAuthorized);

  // 2. Create discussion board administrator entry
  const adminCreateBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    nickname: adminJoinBody.nickname,
  } satisfies IDiscussionBoardAdmin.ICreate;
  const admin: IDiscussionBoardAdmin =
    await api.functional.discussionBoard.admin.discussionBoardAdmins.create(
      connection,
      { body: adminCreateBody },
    );
  typia.assert(admin);

  // 3. Create an active session for the created admin
  const sessionCreateBody = {
    ip: "192.168.1.100",
    href: "https://localhost/dashboard",
    referrer: "https://localhost/login",
    expired_at: null,
  } satisfies IDiscussionBoardAdminSession.ICreate;
  const session: IDiscussionBoardAdminSession =
    await api.functional.discussionBoard.admin.discussionBoardAdmins.sessions.create(
      connection,
      {
        discussionBoardAdminId: admin.id,
        body: sessionCreateBody,
      },
    );
  typia.assert(session);

  // 4. Retrieve the specific session details using authorized admin context
  const retrievedSession: IDiscussionBoardAdminSession =
    await api.functional.discussionBoard.admin.discussionBoardAdmins.sessions.at(
      connection,
      {
        discussionBoardAdminId: admin.id,
        sessionId: session.id,
      },
    );
  typia.assert(retrievedSession);

  // 5. Validate session data integrity
  TestValidator.equals("session ID matches", retrievedSession.id, session.id);
  TestValidator.equals(
    "admin ID matches",
    retrievedSession.discussion_board_admin_id,
    admin.id,
  );
  TestValidator.equals(
    "IP address matches",
    retrievedSession.ip,
    sessionCreateBody.ip,
  );
  TestValidator.equals(
    "href matches",
    retrievedSession.href,
    sessionCreateBody.href,
  );
  TestValidator.equals(
    "referrer matches",
    retrievedSession.referrer,
    sessionCreateBody.referrer,
  );
  TestValidator.equals(
    "creation timestamp matches",
    retrievedSession.created_at,
    session.created_at,
  );
  TestValidator.equals(
    "expiration timestamp is null",
    retrievedSession.expired_at,
    null,
  );
}
