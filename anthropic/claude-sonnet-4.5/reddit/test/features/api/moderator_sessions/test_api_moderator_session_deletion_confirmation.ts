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
 * Test that session deletion returns complete session information for audit and
 * confirmation purposes.
 *
 * This test verifies the critical security compliance requirement that when a
 * moderator deletes a session, the system returns the complete session record
 * including all metadata and the expired_at timestamp. This enables proper
 * audit logging and provides confirmation to the moderator that the correct
 * session was terminated.
 *
 * Test flow:
 *
 * 1. Create a new moderator account (establishes initial authenticated session)
 * 2. Retrieve the session list to obtain the session ID
 * 3. Delete the specific session via the erase endpoint
 * 4. Validate that the deletion response contains the full session record with
 *    expired_at timestamp
 */
export async function test_api_moderator_session_deletion_confirmation(
  connection: api.IConnection,
) {
  // Step 1: Create new moderator account with initial session
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "SecurePass123!";
  const moderatorNickname = RandomGenerator.name();
  const sessionIp = "192.168.1.100";
  const sessionHref = typia.random<string & tags.Format<"uri">>();
  const sessionReferrer = typia.random<string & tags.Format<"uri">>();

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      nickname: moderatorNickname,
      ip: sessionIp,
      href: sessionHref,
      referrer: sessionReferrer,
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Retrieve session list to get the session ID
  const sessionListResponse =
    await api.functional.redditCommunity.moderator.moderators.sessions.index(
      connection,
      {
        username: moderator.username,
        body: {} satisfies IRedditCommunityModeratorSession.IRequest,
      },
    );
  typia.assert(sessionListResponse);

  // Verify we have at least one session
  TestValidator.predicate(
    "session list should contain at least one session",
    sessionListResponse.data.length > 0,
  );

  // Get the first session (the one we just created)
  const session = sessionListResponse.data[0];
  typia.assert(session);

  // Step 3: Delete the session
  const deletedSession =
    await api.functional.redditCommunity.moderator.moderators.sessions.erase(
      connection,
      {
        username: moderator.username,
        sessionId: session.id,
      },
    );
  typia.assert(deletedSession);

  // Step 4: Validate deletion response contains complete session information

  // Verify session ID matches
  TestValidator.equals(
    "deleted session ID matches requested session ID",
    deletedSession.id,
    session.id,
  );

  // Verify moderator ID matches
  TestValidator.equals(
    "deleted session belongs to the moderator",
    deletedSession.reddit_community_moderator_id,
    moderator.id,
  );

  // CRITICAL: Verify expired_at timestamp is populated (indicates termination)
  TestValidator.predicate(
    "deleted session has expired_at timestamp indicating termination",
    deletedSession.expired_at !== null &&
      deletedSession.expired_at !== undefined,
  );
}
