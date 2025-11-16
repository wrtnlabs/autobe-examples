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
 * Test that terminated sessions are correctly reflected in the session list
 * after deletion.
 *
 * This test validates the integration between session deletion and session
 * listing operations, ensuring that security dashboards and session management
 * interfaces display accurate, real-time session states after termination
 * events.
 *
 * Test Flow:
 *
 * 1. Create a new moderator account (establishes initial authenticated session)
 * 2. Retrieve the session list to confirm the active session is present
 * 3. Verify the initial session has no expired_at timestamp (is active)
 * 4. Delete/terminate the specific session
 * 5. Retrieve the session list again after termination
 * 6. Verify the session now shows as terminated with expired_at timestamp set
 */
export async function test_api_moderator_session_termination_impact_on_list(
  connection: api.IConnection,
) {
  // Step 1: Create a new moderator account with initial session
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "SecurePass123!";
  const moderatorNickname = RandomGenerator.name();

  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        nickname: moderatorNickname,
        ip: "127.0.0.1",
        href: "https://example.com/register" satisfies string &
          tags.Format<"uri">,
        referrer: "https://example.com/home" satisfies string &
          tags.Format<"uri">,
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Retrieve initial session list to find the active session
  const sessionListBefore: IPageIRedditCommunityModeratorSession.ISummary =
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
  typia.assert(sessionListBefore);

  // Step 3: Validate that at least one session exists (the one created during registration)
  TestValidator.predicate(
    "session list should contain at least one session after registration",
    sessionListBefore.data.length >= 1,
  );

  // Find the active session (one without expired_at)
  const activeSession = sessionListBefore.data.find(
    (session) =>
      session.expired_at === null || session.expired_at === undefined,
  );

  TestValidator.predicate(
    "should have at least one active session",
    activeSession !== undefined,
  );

  typia.assertGuard<IRedditCommunityModeratorSession.ISummary>(activeSession!);
  const sessionIdToDelete = activeSession.id;

  // Step 4: Verify the session is currently active (no expired_at timestamp)
  TestValidator.equals(
    "active session should not have expired_at set",
    activeSession.expired_at,
    null,
  );

  // Step 5: Delete/terminate the session
  const deletedSession: IRedditCommunityModeratorSession =
    await api.functional.redditCommunity.moderator.moderators.sessions.erase(
      connection,
      {
        username: moderator.username,
        sessionId: sessionIdToDelete,
      },
    );
  typia.assert(deletedSession);

  // Step 6: Verify the deleted session data is returned
  TestValidator.equals(
    "deleted session ID should match the target session",
    deletedSession.id,
    sessionIdToDelete,
  );

  // Step 7: Retrieve the session list again after deletion
  const sessionListAfter: IPageIRedditCommunityModeratorSession.ISummary =
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
  typia.assert(sessionListAfter);

  // Step 8: Find the terminated session in the list
  const terminatedSession = sessionListAfter.data.find(
    (session) => session.id === sessionIdToDelete,
  );

  // Step 9: Verify the session now shows as terminated
  if (terminatedSession) {
    // If the session still appears in the list, it should have expired_at set
    TestValidator.predicate(
      "terminated session should have expired_at timestamp set",
      terminatedSession.expired_at !== null &&
        terminatedSession.expired_at !== undefined,
    );
  } else {
    // Alternatively, the session might be removed from active session list entirely
    // This is also valid behavior - just verify it's no longer in the active list
    const activeSessionsAfter = sessionListAfter.data.filter(
      (session) =>
        session.expired_at === null || session.expired_at === undefined,
    );

    const stillActiveSession = activeSessionsAfter.find(
      (session) => session.id === sessionIdToDelete,
    );

    TestValidator.equals(
      "terminated session should not appear in active sessions",
      stillActiveSession,
      undefined,
    );
  }
}
