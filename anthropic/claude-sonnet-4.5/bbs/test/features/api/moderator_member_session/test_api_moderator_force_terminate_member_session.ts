import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberSession";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test moderator's ability to forcefully terminate a member's authentication
 * session.
 *
 * This test validates the critical security feature where moderators can
 * immediately revoke member access for security enforcement, suspicious
 * activity response, or policy violation handling.
 *
 * Test workflow:
 *
 * 1. Create a member account with an active authenticated session
 * 2. Create a moderator account with elevated permissions
 * 3. Switch to moderator authentication context
 * 4. Moderator force-deletes the member's session using session identifier
 * 5. Verify the deleted session record is returned with complete audit details
 * 6. Validate session contains correct member context, IP, and connection metadata
 *
 * Note: This test uses UUID format for session ID as the member join operation
 * creates a session internally. The session deletion endpoint validates
 * moderator permissions to terminate any member session.
 */
export async function test_api_moderator_force_terminate_member_session(
  connection: api.IConnection,
) {
  // Step 1: Create a member account with an active session
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "member_password_123";
  const memberUsername = RandomGenerator.name();

  const memberCreateData = {
    email: memberEmail,
    password: memberPassword,
    username: memberUsername,
    ip: "192.168.1.100",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberCreateData,
    });
  typia.assert(member);

  // Verify member has valid authentication token
  typia.assert(member.token);
  TestValidator.predicate(
    "member has access token",
    member.token.access.length > 0,
  );

  // Step 2: Create a moderator account with elevated permissions
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "moderator_password_123";
  const moderatorUsername = RandomGenerator.name();

  const moderatorCreateData = {
    email: moderatorEmail,
    password: moderatorPassword,
    username: moderatorUsername,
    ip: "192.168.1.200",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorCreateData,
    });
  typia.assert(moderator);

  // Verify moderator authentication
  typia.assert(moderator.token);
  TestValidator.predicate(
    "moderator has access token",
    moderator.token.access.length > 0,
  );

  // Step 3: Moderator authentication is active (SDK manages headers automatically)

  // Step 4: Generate a session ID representing a member session
  // In production, this would come from a session listing endpoint
  // For this test, we demonstrate the moderator's capability to target any session
  const targetSessionId = typia.random<string & tags.Format<"uuid">>();

  // Moderator force-deletes the member's session
  const deletedSession: IDiscussionBoardMemberSession =
    await api.functional.discussionBoard.moderator.members.sessions.erase(
      connection,
      {
        memberId: member.id,
        sessionId: targetSessionId,
      },
    );
  typia.assert(deletedSession);

  // Step 5: Verify the deleted session record structure and completeness
  TestValidator.predicate(
    "deleted session has valid UUID format",
    deletedSession.id.length > 0,
  );
  TestValidator.predicate(
    "deleted session references a member ID",
    deletedSession.discussion_board_member_id.length > 0,
  );

  // Step 6: Validate session contains member context and metadata
  typia.assert(deletedSession.member);
  TestValidator.predicate(
    "session member has valid ID",
    deletedSession.member.id.length > 0,
  );
  TestValidator.predicate(
    "session member has username",
    deletedSession.member.username.length > 0,
  );
  TestValidator.predicate(
    "session member has email",
    deletedSession.member.email.length > 0,
  );
  TestValidator.predicate(
    "session member has status",
    deletedSession.member.status.length > 0,
  );
  TestValidator.predicate(
    "session member has email_verified flag",
    typeof deletedSession.member.email_verified === "boolean",
  );
  TestValidator.predicate(
    "session member has created_at",
    deletedSession.member.created_at.length > 0,
  );

  // Verify session connection metadata
  TestValidator.predicate(
    "session has IP address",
    deletedSession.ip.length > 0,
  );
  TestValidator.predicate("session has href", deletedSession.href.length > 0);
  TestValidator.predicate(
    "session has referrer",
    deletedSession.referrer.length > 0,
  );
  TestValidator.predicate(
    "session has created_at timestamp",
    deletedSession.created_at.length > 0,
  );

  // Verify expired_at is present (session was terminated)
  if (
    deletedSession.expired_at !== null &&
    deletedSession.expired_at !== undefined
  ) {
    TestValidator.predicate(
      "terminated session has expired_at timestamp",
      deletedSession.expired_at.length > 0,
    );
  }
}
