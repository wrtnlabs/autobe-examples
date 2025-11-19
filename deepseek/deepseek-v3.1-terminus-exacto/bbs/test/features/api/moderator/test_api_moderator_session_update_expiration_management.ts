import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModeratorSession";

/**
 * Test the ability for moderators to update session expiration times for proper
 * session lifecycle management. This scenario validates that session expiration
 * can be extended or shortened based on administrative needs while preserving
 * audit trail integrity for connection context fields. The test follows a
 * complete workflow: create a moderator account, establish an active session,
 * update the session expiration time, and verify the changes are properly
 * reflected while maintaining connection context integrity.
 */
export async function test_api_moderator_session_update_expiration_management(
  connection: api.IConnection,
) {
  // Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.alphabets(10);

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: moderatorUsername,
      password: "password123",
      moderation_level: "basic",
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Login to establish active session
  const loggedInModerator = await api.functional.auth.moderator.login(
    connection,
    {
      body: {
        email_or_username: moderatorEmail,
        password: "password123",
        href: "https://example.com/login",
        referrer: "https://example.com/join",
      } satisfies IDiscussionBoardModerator.ILogin,
    },
  );
  typia.assert(loggedInModerator);

  // Extend session expiration by 1 hour
  const extendedExpiration = new Date(Date.now() + 3600000).toISOString();

  const updatedSession =
    await api.functional.discussionBoard.moderator.moderators.sessions.update(
      connection,
      {
        username: moderatorUsername,
        sessionId: typia.assert(loggedInModerator.id!),
        body: {
          expired_at: extendedExpiration,
        } satisfies IDiscussionBoardModeratorSession.IUpdate,
      },
    );
  typia.assert(updatedSession);

  // Verify expiration was updated while preserving connection context
  TestValidator.equals(
    "session expiration should be extended",
    updatedSession.expired_at,
    extendedExpiration,
  );

  TestValidator.equals(
    "connection context should be preserved",
    updatedSession.href,
    "https://example.com/login",
  );

  TestValidator.equals(
    "moderator reference should be maintained",
    updatedSession.discussion_board_moderator_id,
    moderator.id,
  );

  // Shorten session expiration to test both directions
  const shortenedExpiration = new Date(Date.now() + 600000).toISOString(); // 10 minutes

  const sessionWithShortExpiration =
    await api.functional.discussionBoard.moderator.moderators.sessions.update(
      connection,
      {
        username: moderatorUsername,
        sessionId: updatedSession.id,
        body: {
          expired_at: shortenedExpiration,
        } satisfies IDiscussionBoardModeratorSession.IUpdate,
      },
    );
  typia.assert(sessionWithShortExpiration);

  // Verify the updated expiration time
  TestValidator.equals(
    "session expiration should be shortened",
    sessionWithShortExpiration.expired_at,
    shortenedExpiration,
  );

  // Verify all connection context fields remain unchanged
  TestValidator.equals(
    "IP address should remain unchanged",
    sessionWithShortExpiration.ip,
    updatedSession.ip,
  );

  TestValidator.equals(
    "referrer should remain unchanged",
    sessionWithShortExpiration.referrer,
    updatedSession.referrer,
  );

  TestValidator.equals(
    "moderator ID should remain unchanged",
    sessionWithShortExpiration.discussion_board_moderator_id,
    updatedSession.discussion_board_moderator_id,
  );
}
