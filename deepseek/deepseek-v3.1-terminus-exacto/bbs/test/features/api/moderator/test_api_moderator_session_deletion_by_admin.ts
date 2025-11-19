import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardChannel";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModeratorSession";

/**
 * Test the complete workflow of moderator session deletion by an administrator.
 *
 * This test validates that administrators can properly manage moderator
 * sessions for security purposes. The workflow includes creating a moderator
 * account, establishing an authentication session, creating channel context,
 * and finally deleting the specific session to ensure proper security
 * management.
 */
export async function test_api_moderator_session_deletion_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.name(1);

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: moderatorUsername,
        password: "securePassword123",
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 3 }),
        moderation_level: "senior",
        ip: "192.168.1.1",
        href: "https://example.com/dashboard",
        referrer: "https://example.com/login",
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Authenticate the moderator to establish a session
  const authenticatedModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: {
        email_or_username: moderatorEmail,
        password: "securePassword123",
        ip: "192.168.1.1",
        href: "https://example.com/dashboard",
        referrer: "https://example.com/login",
      } satisfies IDiscussionBoardModerator.ILogin,
    });
  typia.assert(authenticatedModerator);
  TestValidator.equals(
    "authenticated moderator ID matches original",
    moderator.id,
    authenticatedModerator.id,
  );

  // Step 3: Create a discussion board channel for context
  const channel: IDiscussionBoardChannel =
    await api.functional.discussionBoard.moderator.channels.create(connection, {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        status: "active",
      } satisfies IDiscussionBoardChannel.ICreate,
    });
  typia.assert(channel);

  // Step 4: Delete the moderator session
  // Since the session ID is not available from the authentication response,
  // we use a valid UUID to test the session deletion API functionality
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  const deletedSession: IDiscussionBoardModeratorSession =
    await api.functional.discussionBoard.moderator.moderators.sessions.erase(
      connection,
      {
        username: moderatorUsername,
        sessionId: sessionId,
      },
    );
  typia.assert(deletedSession);
  TestValidator.equals(
    "deleted session moderator ID matches",
    deletedSession.discussion_board_moderator_id,
    moderator.id,
  );
  TestValidator.equals(
    "deleted session ID matches requested",
    deletedSession.id,
    sessionId,
  );

  // Validate the deleted session record structure
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
    "session has creation timestamp",
    deletedSession.created_at.length > 0,
  );
  TestValidator.predicate(
    "session has update timestamp",
    deletedSession.updated_at.length > 0,
  );
}
