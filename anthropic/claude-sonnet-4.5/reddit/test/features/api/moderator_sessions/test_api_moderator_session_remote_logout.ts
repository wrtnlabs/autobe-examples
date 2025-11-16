import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityModeratorSession";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModeratorSession";

/**
 * Test remote logout security scenario for moderator sessions.
 *
 * This test validates that moderators can remotely terminate their
 * authentication sessions, which is critical for security scenarios such as:
 *
 * - Logging out from a compromised device
 * - Revoking access after using a public/shared computer
 * - Terminating sessions when a device is lost or stolen
 *
 * The test workflow:
 *
 * 1. Create a new moderator account (establishes initial session)
 * 2. Retrieve session information to identify the target session
 * 3. Remotely terminate that specific session
 * 4. Verify the session termination was successful
 */
export async function test_api_moderator_session_remote_logout(
  connection: api.IConnection,
) {
  // Step 1: Create a new moderator account and establish authentication session
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "SecurePassword123!";
  const moderatorNickname = RandomGenerator.name();

  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        nickname: moderatorNickname,
        ip: "127.0.0.1",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Retrieve session information to get the current session ID
  const sessionsPage: IPageIRedditCommunityModeratorSession.ISummary =
    await api.functional.redditCommunity.moderator.moderators.sessions.index(
      connection,
      {
        username: moderator.username,
        body: {
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityModeratorSession.IRequest,
      },
    );
  typia.assert(sessionsPage);

  // Verify we have at least one session
  TestValidator.predicate(
    "moderator should have at least one active session",
    sessionsPage.data.length > 0,
  );

  // Get the first session (current session)
  const currentSession = sessionsPage.data[0];
  typia.assert(currentSession);

  // Step 3: Remotely terminate the specific session
  const deletedSession: IRedditCommunityModeratorSession =
    await api.functional.redditCommunity.moderator.moderators.sessions.erase(
      connection,
      {
        username: moderator.username,
        sessionId: currentSession.id,
      },
    );
  typia.assert(deletedSession);

  // Step 4: Validate the deleted session response
  TestValidator.equals(
    "deleted session ID should match requested session ID",
    deletedSession.id,
    currentSession.id,
  );

  TestValidator.equals(
    "deleted session moderator ID should match",
    deletedSession.reddit_community_moderator_id,
    moderator.id,
  );

  // Verify session metadata is present
  TestValidator.predicate(
    "deleted session should have IP address",
    deletedSession.ip.length > 0,
  );

  TestValidator.predicate(
    "deleted session should have creation timestamp",
    deletedSession.created_at.length > 0,
  );
}
