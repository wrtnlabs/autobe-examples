import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberSession";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test moderator authentication and authorization for session termination
 * endpoint.
 *
 * This test validates that moderators can authenticate and access the session
 * termination endpoint for security enforcement. Due to API limitations (no
 * session listing endpoint available), this test focuses on:
 *
 * 1. Creating a member account with multiple sessions to establish session records
 * 2. Authenticating as a moderator with security enforcement privileges
 * 3. Verifying moderator can access and call the session termination endpoint
 * 4. Validating the response structure of terminated sessions
 *
 * Note: The full workflow of identifying suspicious sessions cannot be tested
 * without a session listing endpoint, so we test the core authorization and
 * termination capability.
 */
export async function test_api_moderator_session_termination_security_investigation(
  connection: api.IConnection,
) {
  // Step 1: Create member account with initial session
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "SecurePassword123!";

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      username: typia.random<string & tags.MinLength<3> & tags.MaxLength<30>>(),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 7 }),
      ip: "192.168.1.100",
      href: "https://example.com/signup" satisfies string & tags.Format<"uri">,
      referrer: "https://google.com" satisfies string & tags.Format<"uri">,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  const memberId = member.id;

  // Step 2: Create additional sessions with varying connection contexts to simulate multiple active sessions
  const session1 = await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      ip: "185.220.101.50",
      href: "https://example.com/dashboard" satisfies string &
        tags.Format<"uri">,
      referrer: "https://suspicious-site.com" satisfies string &
        tags.Format<"uri">,
    } satisfies IDiscussionBoardMember.ILogin,
  });
  typia.assert(session1);

  const session2 = await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      ip: "203.0.113.42",
      href: "https://example.com/profile" satisfies string & tags.Format<"uri">,
      referrer: "https://malicious-referrer.com" satisfies string &
        tags.Format<"uri">,
    } satisfies IDiscussionBoardMember.ILogin,
  });
  typia.assert(session2);

  const session3 = await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      ip: "192.168.1.101",
      href: "https://example.com/home" satisfies string & tags.Format<"uri">,
      referrer: "https://example.com" satisfies string & tags.Format<"uri">,
    } satisfies IDiscussionBoardMember.ILogin,
  });
  typia.assert(session3);

  // Step 3: Authenticate as moderator with security enforcement privileges
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: "ModeratorSecure456!",
      username: RandomGenerator.alphaNumeric(8),
      display_name: RandomGenerator.name(),
      ip: "10.0.0.50",
      href: "https://example.com/moderator/join" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com/admin" satisfies string &
        tags.Format<"uri">,
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 4: Test moderator can terminate a session (using realistic session ID placeholder)
  // Note: Since we cannot retrieve actual session IDs from the API, we create a valid UUID
  // In a real implementation, session IDs would be obtained from a session listing endpoint
  const sessionIdToTerminate = typia.random<string & tags.Format<"uuid">>();

  const terminatedSession =
    await api.functional.discussionBoard.moderator.members.sessions.erase(
      connection,
      {
        memberId: memberId,
        sessionId: sessionIdToTerminate,
      },
    );
  typia.assert(terminatedSession);

  // Step 5: Verify terminated session structure and data integrity
  TestValidator.equals(
    "terminated session member ID matches target member",
    terminatedSession.discussion_board_member_id,
    memberId,
  );

  TestValidator.equals(
    "terminated session member reference ID matches",
    terminatedSession.member.id,
    memberId,
  );

  // Verify session has expired_at timestamp indicating termination
  TestValidator.predicate(
    "terminated session has expired_at timestamp",
    terminatedSession.expired_at !== null &&
      terminatedSession.expired_at !== undefined,
  );

  // Validate expired_at is a valid date-time string
  const expiredAt = terminatedSession.expired_at;
  if (expiredAt !== null && expiredAt !== undefined) {
    const expiredDate = new Date(expiredAt);
    TestValidator.predicate(
      "expired_at is valid ISO date-time",
      !isNaN(expiredDate.getTime()),
    );
  }

  // Verify connection context metadata is preserved
  TestValidator.predicate(
    "session has IP address recorded",
    terminatedSession.ip.length > 0,
  );

  TestValidator.predicate(
    "session has href recorded",
    terminatedSession.href.length > 0,
  );

  TestValidator.predicate(
    "session has referrer recorded",
    terminatedSession.referrer.length > 0,
  );

  // Verify session ID matches the one we attempted to terminate
  TestValidator.equals(
    "terminated session ID matches requested session",
    terminatedSession.id,
    sessionIdToTerminate,
  );
}
