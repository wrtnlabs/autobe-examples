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
 * Test session deletion idempotency when attempting to delete an
 * already-terminated session.
 *
 * This test validates the system's behavior when a moderator session deletion
 * is attempted multiple times. It ensures that the session termination
 * operation is idempotent and handles repeated deletion requests gracefully
 * without causing errors.
 *
 * Test Flow:
 *
 * 1. Create a new moderator account and establish authentication
 * 2. Retrieve the moderator's current session list to obtain a valid session ID
 * 3. Successfully delete the session for the first time
 * 4. Attempt to delete the same session ID again (already terminated)
 * 5. Verify that the second deletion either succeeds idempotently or returns
 *    appropriate error
 *
 * This validates robust session lifecycle management and concurrent deletion
 * request handling.
 */
export async function test_api_moderator_session_already_terminated(
  connection: api.IConnection,
) {
  // Step 1: Create a new moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "TestPassword123!";
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        nickname: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Retrieve the moderator's session list to get a valid session ID
  const sessionListResponse: IPageIRedditCommunityModeratorSession.ISummary =
    await api.functional.redditCommunity.moderator.moderators.sessions.index(
      connection,
      {
        username: moderator.username,
        body: {} satisfies IRedditCommunityModeratorSession.IRequest,
      },
    );
  typia.assert(sessionListResponse);

  // Ensure we have at least one session
  TestValidator.predicate(
    "moderator should have at least one session",
    sessionListResponse.data.length > 0,
  );

  // Get the first session ID
  const sessionId = sessionListResponse.data[0].id;

  // Step 3: Delete the session for the first time
  const firstDeletion: IRedditCommunityModeratorSession =
    await api.functional.redditCommunity.moderator.moderators.sessions.erase(
      connection,
      {
        username: moderator.username,
        sessionId: sessionId,
      },
    );
  typia.assert(firstDeletion);

  // Verify that the session is marked as expired
  TestValidator.predicate(
    "first deletion should set expired_at timestamp",
    firstDeletion.expired_at !== null && firstDeletion.expired_at !== undefined,
  );

  // Step 4: Attempt to delete the same session again (already terminated)
  const secondDeletion: IRedditCommunityModeratorSession =
    await api.functional.redditCommunity.moderator.moderators.sessions.erase(
      connection,
      {
        username: moderator.username,
        sessionId: sessionId,
      },
    );
  typia.assert(secondDeletion);

  // Step 5: Verify idempotent behavior - both deletions should return the same session info
  TestValidator.equals(
    "session ID should match in both deletions",
    firstDeletion.id,
    secondDeletion.id,
  );
  TestValidator.equals(
    "expired_at should be consistent across deletions",
    firstDeletion.expired_at,
    secondDeletion.expired_at,
  );
}
