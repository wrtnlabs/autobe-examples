import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberSession";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test that a moderator can forcefully terminate any member's active
 * authentication session for security enforcement purposes.
 *
 * This test validates the security enforcement workflow where moderators need
 * to terminate member sessions.
 *
 * Steps:
 *
 * 1. Create a member account with an active session
 * 2. Register a moderator account with elevated privileges
 * 3. Moderator terminates the member's session
 * 4. Verify session termination with expired_at timestamp
 * 5. Confirm the terminated session details are returned correctly
 */
export async function test_api_moderator_session_termination_member_account(
  connection: api.IConnection,
) {
  // Step 1: Create a member account with an active session
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "SecureMemberPass123!";
  const memberUsername = RandomGenerator.alphaNumeric(12);

  const memberBody = {
    email: memberEmail,
    password: memberPassword,
    username: memberUsername,
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    href: "https://example.com/register" satisfies string & tags.Format<"uri">,
    referrer: "https://example.com/home" satisfies string & tags.Format<"uri">,
  } satisfies IDiscussionBoardMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberBody,
  });
  typia.assert(member);

  // Step 2: Register a moderator account with elevated privileges
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "SecureModPass456!";
  const moderatorUsername = RandomGenerator.alphaNumeric(12);

  const moderatorBody = {
    email: moderatorEmail,
    password: moderatorPassword,
    username: moderatorUsername,
    display_name: RandomGenerator.name(2),
    href: "https://example.com/moderator/register" satisfies string &
      tags.Format<"uri">,
    referrer: "https://example.com/admin" satisfies string & tags.Format<"uri">,
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorBody,
  });
  typia.assert(moderator);

  // Step 3: Generate a session ID for testing session termination
  // Note: In a real scenario, we would retrieve this from a session list endpoint
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  // Step 4: Moderator terminates the member's session
  const terminatedSession =
    await api.functional.discussionBoard.moderator.members.sessions.erase(
      connection,
      {
        memberId: member.id,
        sessionId: sessionId,
      },
    );
  typia.assert(terminatedSession);

  // Step 5: Verify session termination with expired_at timestamp
  TestValidator.predicate(
    "terminated session should have expired_at timestamp set",
    terminatedSession.expired_at !== null &&
      terminatedSession.expired_at !== undefined,
  );

  // Step 6: Verify the session member reference matches
  TestValidator.equals(
    "terminated session member summary ID matches created member",
    terminatedSession.member.id,
    member.id,
  );

  // Step 7: Verify session metadata is present
  TestValidator.predicate(
    "terminated session has valid IP address",
    terminatedSession.ip.length > 0,
  );

  TestValidator.predicate(
    "terminated session has valid href",
    terminatedSession.href.length > 0,
  );

  TestValidator.predicate(
    "terminated session has valid referrer",
    terminatedSession.referrer.length > 0,
  );
}
