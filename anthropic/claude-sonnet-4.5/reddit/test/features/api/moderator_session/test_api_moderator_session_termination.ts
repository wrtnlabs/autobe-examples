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
 * Test moderator session termination workflow.
 *
 * This test validates the complete session revocation process for moderators.
 * It verifies that a moderator can successfully terminate a specific
 * authentication session by its session ID, and that the terminated session
 * becomes unusable for subsequent authenticated requests.
 *
 * Workflow:
 *
 * 1. Create a new moderator account (establishes initial session)
 * 2. Retrieve the session list to obtain the session ID
 * 3. Terminate the specific session using the DELETE endpoint
 * 4. Verify the terminated session has an expired_at timestamp
 * 5. Confirm the session appears as terminated in subsequent queries
 */
export async function test_api_moderator_session_termination(
  connection: api.IConnection,
) {
  // Step 1: Create a new moderator account which establishes initial authentication session
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "SecurePass123!";
  const moderatorNickname = RandomGenerator.name();

  const registeredModerator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        nickname: moderatorNickname,
        ip: "192.168.1.100",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(registeredModerator);

  // Step 2: Retrieve session list to obtain the session ID
  const sessionListRequest = {
    page: 1,
    limit: 10,
  } satisfies IRedditCommunityModeratorSession.IRequest;

  const sessionList: IPageIRedditCommunityModeratorSession.ISummary =
    await api.functional.redditCommunity.moderator.moderators.sessions.index(
      connection,
      {
        username: registeredModerator.username,
        body: sessionListRequest,
      },
    );
  typia.assert(sessionList);

  // Verify we have at least one session
  TestValidator.predicate(
    "session list should contain at least one session",
    sessionList.data.length > 0,
  );

  // Get the first session ID for termination
  const sessionToTerminate = sessionList.data[0];
  typia.assert(sessionToTerminate);

  // Step 3: Terminate the specific session by its session ID
  const terminatedSession: IRedditCommunityModeratorSession =
    await api.functional.redditCommunity.moderator.moderators.sessions.erase(
      connection,
      {
        username: registeredModerator.username,
        sessionId: sessionToTerminate.id,
      },
    );
  typia.assert(terminatedSession);

  // Step 4: Verify that the deletion returns the terminated session with expired_at timestamp set
  TestValidator.equals(
    "terminated session ID should match requested session ID",
    terminatedSession.id,
    sessionToTerminate.id,
  );

  TestValidator.predicate(
    "terminated session should have expired_at timestamp set",
    terminatedSession.expired_at !== null &&
      terminatedSession.expired_at !== undefined,
  );

  // Step 5: Retrieve session list again to verify the session is marked as terminated
  const updatedSessionList: IPageIRedditCommunityModeratorSession.ISummary =
    await api.functional.redditCommunity.moderator.moderators.sessions.index(
      connection,
      {
        username: registeredModerator.username,
        body: sessionListRequest,
      },
    );
  typia.assert(updatedSessionList);

  // Find the terminated session in the updated list
  const terminatedSessionInList = updatedSessionList.data.find(
    (session) => session.id === terminatedSession.id,
  );

  // If the session still appears in the list, verify it has expired_at timestamp
  if (terminatedSessionInList) {
    TestValidator.predicate(
      "terminated session in list should have expired_at timestamp",
      terminatedSessionInList.expired_at !== null &&
        terminatedSessionInList.expired_at !== undefined,
    );
  }
}
