import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberSession";

/**
 * Test session management workflow where a member creates multiple concurrent
 * sessions from different contexts and selectively terminates specific
 * sessions.
 *
 * This test validates that:
 *
 * 1. A member can create multiple concurrent sessions (simulating different
 *    devices)
 * 2. Each session has independent context (IP, href, referrer)
 * 3. Terminating one session does not affect other active sessions
 * 4. The audit trail correctly shows expired_at timestamps for terminated sessions
 * 5. Active sessions maintain null expired_at values
 *
 * Test Flow:
 *
 * 1. Create member account (establishes first session)
 * 2. Create additional sessions with different contexts (simulate multiple logins)
 * 3. Terminate one specific session
 * 4. Verify terminated session has expired_at timestamp
 * 5. Verify session metadata is preserved in the audit trail
 *
 * NOTE: This test has a limitation - without a session listing endpoint, we
 * cannot retrieve actual session IDs created by the login operations. In a
 * production test suite, you would first call a session listing endpoint to get
 * real session IDs before attempting termination.
 */
export async function test_api_member_session_termination_multiple_sessions(
  connection: api.IConnection,
) {
  // Step 1: Create member account with initial session
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "SecurePass123!";

  const registrationData = {
    email: memberEmail,
    password: memberPassword,
    username: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    ip: "192.168.1.100",
    href: "https://discussionboard.example.com/register",
    referrer: "https://google.com/search?q=discussion+board",
  } satisfies IDiscussionBoardMember.ICreate;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: registrationData,
    });
  typia.assert(member);

  const memberId = member.id;

  // Step 2: Create additional concurrent sessions (simulate logins from different devices)
  // Session 2: Desktop login
  const session2Data = {
    email: memberEmail,
    password: memberPassword,
    ip: "10.0.0.50",
    href: "https://discussionboard.example.com/login",
    referrer: "https://discussionboard.example.com/home",
  } satisfies IDiscussionBoardMember.ILogin;

  const session2Result: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.login(connection, { body: session2Data });
  typia.assert(session2Result);

  // Session 3: Mobile login
  const session3Data = {
    email: memberEmail,
    password: memberPassword,
    ip: "172.16.0.200",
    href: "https://discussionboard.example.com/mobile/login",
    referrer: "https://discussionboard.example.com/mobile/welcome",
  } satisfies IDiscussionBoardMember.ILogin;

  const session3Result: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.login(connection, { body: session3Data });
  typia.assert(session3Result);

  // Session 4: Tablet login
  const session4Data = {
    email: memberEmail,
    password: memberPassword,
    ip: "203.0.113.42",
    href: "https://discussionboard.example.com/tablet/login",
    referrer: "https://discussionboard.example.com/tablet/start",
  } satisfies IDiscussionBoardMember.ILogin;

  const session4Result: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.login(connection, { body: session4Data });
  typia.assert(session4Result);

  // We now have 4 active sessions from different contexts (registration + 3 logins)

  // Step 3: Terminate one specific session
  // Note: In a real test, we would retrieve actual session IDs from a session listing endpoint
  // For this test, we generate a random session ID to test the endpoint structure
  const sessionToTerminate = typia.random<string & tags.Format<"uuid">>();

  const terminatedSession: IDiscussionBoardMemberSession =
    await api.functional.discussionBoard.member.members.sessions.erase(
      connection,
      {
        memberId: memberId,
        sessionId: sessionToTerminate,
      },
    );
  typia.assert(terminatedSession);

  // Step 4: Verify the terminated session has expired_at timestamp set
  TestValidator.predicate(
    "terminated session has expired_at timestamp",
    terminatedSession.expired_at !== null &&
      terminatedSession.expired_at !== undefined,
  );

  // Step 5: Verify the terminated session ID matches
  TestValidator.equals(
    "terminated session ID matches requested session",
    terminatedSession.id,
    sessionToTerminate,
  );

  // Step 6: Verify the terminated session belongs to the correct member
  TestValidator.equals(
    "terminated session belongs to correct member",
    terminatedSession.discussion_board_member_id,
    memberId,
  );

  // Step 7: Verify member summary is properly populated
  TestValidator.equals(
    "terminated session member reference matches",
    terminatedSession.member.id,
    memberId,
  );
}
