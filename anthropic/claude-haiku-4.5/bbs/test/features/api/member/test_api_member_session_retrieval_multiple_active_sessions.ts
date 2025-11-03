import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberSession";

/**
 * Test retrieval of current session details for a member with multiple active
 * sessions.
 *
 * This test validates that a member can retrieve session details after
 * establishing multiple concurrent sessions. The workflow simulates a
 * real-world scenario where:
 *
 * 1. A member registers a new account with email and password
 * 2. First authentication creates an initial session (simulating login from device
 *    1)
 * 3. Second authentication creates a concurrent session (simulating login from
 *    device 2)
 * 4. Session retrieval endpoint returns correct metadata for the current session
 * 5. Session information includes connection details (IP, href, referrer) and
 *    timestamps
 *
 * This ensures that the discussion board platform correctly handles
 * multi-session management and provides accurate session information to
 * authenticated members.
 */
export async function test_api_member_session_retrieval_multiple_active_sessions(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "SecurePass123";

  const registered = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IDiscussionBoardMember.IRegisterRequest,
  });
  typia.assert(registered);
  TestValidator.predicate(
    "member registration should return valid authorization token",
    registered.token !== null && registered.token !== undefined,
  );

  // Step 2: First authentication - create initial session
  const firstSession = await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IDiscussionBoardMember.ILoginRequest,
  });
  typia.assert(firstSession);
  TestValidator.predicate(
    "first login should create valid session",
    firstSession.token !== null && firstSession.token !== undefined,
  );

  // Step 3: Retrieve session details from first authentication
  const sessionDetails1 =
    await api.functional.discussionBoard.member.auth.sessions.index(connection);
  typia.assert(sessionDetails1);
  TestValidator.predicate(
    "first session has valid id",
    sessionDetails1.id !== null && sessionDetails1.id.length > 0,
  );
  TestValidator.predicate(
    "first session member id exists",
    sessionDetails1.discussion_board_member_id !== null &&
      sessionDetails1.discussion_board_member_id.length > 0,
  );

  // Step 4: Second authentication - create second concurrent session
  // Create a new connection for the second session to simulate different device
  const secondConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  const secondSession = await api.functional.auth.member.login(
    secondConnection,
    {
      body: {
        email: memberEmail,
        password: memberPassword,
      } satisfies IDiscussionBoardMember.ILoginRequest,
    },
  );
  typia.assert(secondSession);
  TestValidator.predicate(
    "second login should create valid session",
    secondSession.token !== null && secondSession.token !== undefined,
  );

  // Step 5: Verify tokens from first and second sessions are different
  TestValidator.notEquals(
    "first and second session tokens should be different",
    firstSession.token.access,
    secondSession.token.access,
  );

  // Step 6: Retrieve session details from second authentication
  const sessionDetails2 =
    await api.functional.discussionBoard.member.auth.sessions.index(
      secondConnection,
    );
  typia.assert(sessionDetails2);
  TestValidator.predicate(
    "second session has valid id",
    sessionDetails2.id !== null && sessionDetails2.id.length > 0,
  );

  // Step 7: Verify both sessions belong to the same member
  TestValidator.equals(
    "both sessions belong to same member",
    sessionDetails1.discussion_board_member_id,
    sessionDetails2.discussion_board_member_id,
  );

  // Step 8: Verify session IDs are different (independent sessions)
  TestValidator.notEquals(
    "session ids should be different for different sessions",
    sessionDetails1.id,
    sessionDetails2.id,
  );

  // Step 9: Validate session metadata structure
  TestValidator.predicate(
    "session contains valid IP address",
    sessionDetails1.ip !== null && sessionDetails1.ip.length > 0,
  );
  TestValidator.predicate(
    "session contains valid href URL",
    sessionDetails1.href !== null && sessionDetails1.href.length > 0,
  );
  TestValidator.predicate(
    "session contains valid referrer URL",
    sessionDetails1.referrer !== null && sessionDetails1.referrer.length > 0,
  );

  // Step 10: Validate timestamp information
  TestValidator.predicate(
    "session has creation timestamp",
    sessionDetails1.created_at !== null &&
      sessionDetails1.created_at.length > 0,
  );

  // Step 11: Verify session is still active (no expiration)
  TestValidator.predicate(
    "active session has no expiration set",
    sessionDetails1.expired_at === null ||
      sessionDetails1.expired_at === undefined,
  );

  // Step 12: Return to first connection and verify can still retrieve first session
  const sessionDetails1Reload =
    await api.functional.discussionBoard.member.auth.sessions.index(connection);
  typia.assert(sessionDetails1Reload);
  TestValidator.equals(
    "first session remains accessible and unchanged",
    sessionDetails1Reload.id,
    sessionDetails1.id,
  );
}
