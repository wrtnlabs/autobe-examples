import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberSession";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test moderator's ability to terminate member authentication sessions for
 * account restriction enforcement.
 *
 * This test validates the security enforcement mechanism where moderators can
 * terminate specific member sessions as part of account restriction workflows.
 * While the full "logout from all devices" workflow would require session
 * listing capabilities, this test demonstrates the core session termination API
 * functionality that moderators use to enforce access restrictions.
 *
 * Test workflow:
 *
 * 1. Create a member account to simulate a user requiring restriction
 * 2. Establish multiple login sessions for the member (multi-device simulation)
 * 3. Authenticate as a moderator with proper authorization
 * 4. Terminate member sessions using the session deletion API
 * 5. Verify session termination responses include proper audit information
 * 6. Validate terminated sessions have expired_at timestamps and member
 *    attribution
 *
 * Note: This test uses generated session IDs as the API does not provide
 * session listing. In production, moderators would retrieve actual session IDs
 * before termination.
 */
export async function test_api_moderator_session_termination_account_restriction(
  connection: api.IConnection,
) {
  // Step 1: Create a member account that will be subject to session termination
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "SecurePassword123!";

  const memberRegistration = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      username: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: "https://example.com/register" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com/home" satisfies string &
        tags.Format<"uri">,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(memberRegistration);

  const memberId = memberRegistration.id;

  // Step 2: Simulate multiple device logins (mobile, web, tablet) to establish concurrent sessions
  const mobileSession = await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: "https://example.com/mobile-app" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com/login" satisfies string &
        tags.Format<"uri">,
    } satisfies IDiscussionBoardMember.ILogin,
  });
  typia.assert(mobileSession);

  const webSession = await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: "https://example.com/web-browser" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com/dashboard" satisfies string &
        tags.Format<"uri">,
    } satisfies IDiscussionBoardMember.ILogin,
  });
  typia.assert(webSession);

  const tabletSession = await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: "https://example.com/tablet" satisfies string & tags.Format<"uri">,
      referrer: "https://example.com/articles" satisfies string &
        tags.Format<"uri">,
    } satisfies IDiscussionBoardMember.ILogin,
  });
  typia.assert(tabletSession);

  // Step 3: Authenticate as a moderator to gain session termination privileges
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: "ModeratorPass456!",
      username: RandomGenerator.alphaNumeric(10),
      display_name: RandomGenerator.name(),
      href: "https://example.com/moderator/register" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com/admin" satisfies string &
        tags.Format<"uri">,
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 4: Generate session IDs to simulate session termination workflow
  // Note: In production, these would be retrieved from a session listing endpoint
  const sessionIdsToTerminate = ArrayUtil.repeat(4, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );

  // Step 5: Systematically terminate all sessions as part of account restriction
  const terminatedSessions = await ArrayUtil.asyncMap(
    sessionIdsToTerminate,
    async (sessionId) => {
      const terminated =
        await api.functional.discussionBoard.moderator.members.sessions.erase(
          connection,
          {
            memberId: memberId,
            sessionId: sessionId,
          },
        );
      typia.assert(terminated);
      return terminated;
    },
  );

  // Step 6: Validate all session termination responses
  TestValidator.equals(
    "all sessions terminated count matches",
    terminatedSessions.length,
    4,
  );

  // Verify each terminated session belongs to the correct member
  terminatedSessions.forEach((session, index) => {
    TestValidator.equals(
      `terminated session ${index + 1} belongs to member`,
      session.discussion_board_member_id,
      memberId,
    );

    TestValidator.predicate(
      `terminated session ${index + 1} has expired_at timestamp`,
      session.expired_at !== null && session.expired_at !== undefined,
    );

    TestValidator.equals(
      `terminated session ${index + 1} member reference matches`,
      session.member.id,
      memberId,
    );
  });

  // Verify audit trail information is present
  const firstTerminatedSession = terminatedSessions[0];

  TestValidator.predicate(
    "session has creation timestamp for audit trail",
    firstTerminatedSession.created_at !== null &&
      firstTerminatedSession.created_at !== undefined,
  );

  TestValidator.predicate(
    "session has connection context for security monitoring",
    firstTerminatedSession.ip.length > 0 &&
      firstTerminatedSession.href.length > 0,
  );
}
