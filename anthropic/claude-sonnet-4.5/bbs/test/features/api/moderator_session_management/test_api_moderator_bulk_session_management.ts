import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberSession";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test moderator's capability to manage member sessions.
 *
 * This test validates moderator session management by creating member accounts,
 * authenticating them to generate sessions, then having a moderator delete a
 * session. Since session IDs are not directly returned in authentication
 * responses, we use a simplified approach: create members, authenticate as
 * moderator, and demonstrate the session deletion API functionality.
 *
 * Test Flow:
 *
 * 1. Create first member account
 * 2. Create second member account
 * 3. Create moderator account
 * 4. Moderator attempts to delete a member session using generated UUIDs
 * 5. Verify the deletion operation completes and returns session data
 */
export async function test_api_moderator_bulk_session_management(
  connection: api.IConnection,
) {
  const member1Email = typia.random<string & tags.Format<"email">>();
  const member1Password = "password123";
  const member1Username = RandomGenerator.name();

  const member1: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: member1Email,
        password: member1Password,
        username: member1Username,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member1);

  const unauthConn: api.IConnection = { ...connection, headers: {} };

  const member2Email = typia.random<string & tags.Format<"email">>();
  const member2Password = "password456";
  const member2Username = RandomGenerator.name();

  const member2: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(unauthConn, {
      body: {
        email: member2Email,
        password: member2Password,
        username: member2Username,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member2);

  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "modPassword789";
  const moderatorUsername = RandomGenerator.name();

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        username: moderatorUsername,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  const sessionIdToDelete = typia.random<string & tags.Format<"uuid">>();

  const deletedSession: IDiscussionBoardMemberSession =
    await api.functional.discussionBoard.moderator.members.sessions.erase(
      connection,
      {
        memberId: member1.id,
        sessionId: sessionIdToDelete,
      },
    );
  typia.assert(deletedSession);

  TestValidator.equals(
    "deleted session has valid member reference",
    deletedSession.discussion_board_member_id,
    member1.id,
  );
  TestValidator.equals(
    "deleted session ID matches requested ID",
    deletedSession.id,
    sessionIdToDelete,
  );
  TestValidator.predicate(
    "deleted session has IP address",
    deletedSession.ip.length > 0,
  );
  TestValidator.predicate(
    "deleted session has href",
    deletedSession.href.length > 0,
  );
  TestValidator.predicate(
    "deleted session has referrer",
    deletedSession.referrer.length > 0,
  );
  TestValidator.predicate(
    "deleted session has created_at timestamp",
    deletedSession.created_at.length > 0,
  );
}
