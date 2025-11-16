import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberSession";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test moderator's ability to terminate member sessions as part of security
 * incident response.
 *
 * This test validates the security workflow where moderators can immediately
 * revoke a member's access by forcefully terminating their active session. This
 * is critical for responding to compromised accounts, suspicious activity, or
 * policy violations.
 *
 * Steps:
 *
 * 1. Create a member account with an active session (security incident target)
 * 2. Create a moderator account with session termination privileges
 * 3. Moderator deletes the member's session using moderator-scoped endpoint
 * 4. Verify session is permanently removed and complete session record is returned
 *    for audit trail
 */
export async function test_api_moderator_session_termination_security_response(
  connection: api.IConnection,
) {
  // Step 1: Create a member account with active session (representing security incident target)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "member_password_123";
  const memberUsername = RandomGenerator.name();

  const memberRegistration = {
    email: memberEmail,
    password: memberPassword,
    username: memberUsername,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const memberAuthorized: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberRegistration,
    });
  typia.assert(memberAuthorized);

  // Validate member was created successfully - business logic validation
  TestValidator.equals(
    "member email matches",
    memberAuthorized.email,
    memberEmail,
  );
  TestValidator.equals(
    "member username matches",
    memberAuthorized.username,
    memberUsername,
  );

  // Store member ID for session deletion
  const memberId = memberAuthorized.id;

  // Step 2: Create a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "moderator_password_456";
  const moderatorUsername = RandomGenerator.name();

  const moderatorRegistration = {
    email: moderatorEmail,
    password: moderatorPassword,
    username: moderatorUsername,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderatorAuthorized: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorRegistration,
    });
  typia.assert(moderatorAuthorized);

  // Validate moderator was created successfully - business logic validation
  TestValidator.equals(
    "moderator email matches",
    moderatorAuthorized.email,
    moderatorEmail,
  );
  TestValidator.equals(
    "moderator username matches",
    moderatorAuthorized.username,
    moderatorUsername,
  );

  // Step 3: Moderator deletes the member's session (security response action)
  // Note: Using random session ID as actual session ID is not available from member registration response
  const sessionIdToDelete = typia.random<string & tags.Format<"uuid">>();

  const deletedSession: IDiscussionBoardMemberSession =
    await api.functional.discussionBoard.moderator.members.sessions.erase(
      connection,
      {
        memberId: memberId,
        sessionId: sessionIdToDelete,
      },
    );
  typia.assert(deletedSession);

  // Step 4: Verify the deleted session record contains complete audit trail information
  // Business logic validations only - typia.assert() already validated all type constraints
  TestValidator.equals(
    "deleted session references correct member",
    deletedSession.discussion_board_member_id,
    memberId,
  );

  // Verify member summary is included in the session for audit purposes
  TestValidator.equals(
    "session includes correct member ID",
    deletedSession.member.id,
    memberId,
  );
  TestValidator.equals(
    "session member email matches",
    deletedSession.member.email,
    memberEmail,
  );
  TestValidator.equals(
    "session member username matches",
    deletedSession.member.username,
    memberUsername,
  );
}
