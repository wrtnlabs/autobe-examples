import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModeratorSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModeratorSession";

/**
 * Test that moderators can only view their own sessions and cannot access
 * sessions from other moderators. This validates critical security isolation in
 * the moderation system.
 *
 * The test creates two separate moderator accounts, authenticates as each one,
 * and verifies that session lists are properly isolated by moderator:
 *
 * 1. Create moderator A account and authenticate
 * 2. Create moderator B account and authenticate
 * 3. Moderator A retrieves their session list
 * 4. Moderator B retrieves their session list
 * 5. Verify moderator A only sees their own sessions
 * 6. Verify moderator B only sees their own sessions
 * 7. Confirm session metadata (IP, timestamp) is segregated
 * 8. Validate no cross-moderator session leakage
 * 9. Verify each moderator's session shows their own moderator summary
 */
export async function test_api_moderator_sessions_security_isolation(
  connection: api.IConnection,
) {
  // Step 1: Create moderator A account
  const moderatorAEmail = typia.random<string & tags.Format<"email">>();
  const moderatorAUsername = RandomGenerator.alphabets(8);
  const moderatorAPassword = RandomGenerator.alphaNumeric(12);
  const moderatorADisplayName = RandomGenerator.name();

  const moderatorAAuth: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorAEmail,
        username: moderatorAUsername,
        password: moderatorAPassword,
        display_name: moderatorADisplayName,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderatorAAuth);

  // Step 2: Create moderator B account
  const moderatorBEmail = typia.random<string & tags.Format<"email">>();
  const moderatorBUsername = RandomGenerator.alphabets(8);
  const moderatorBPassword = RandomGenerator.alphaNumeric(12);
  const moderatorBDisplayName = RandomGenerator.name();

  const moderatorBAuth: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorBEmail,
        username: moderatorBUsername,
        password: moderatorBPassword,
        display_name: moderatorBDisplayName,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderatorBAuth);

  // Step 3: Prepare connection for moderator A and retrieve sessions
  const moderatorAConnection: api.IConnection = {
    ...connection,
    headers: {
      Authorization: moderatorAAuth.token.access,
    },
  };

  const moderatorASessionsResponse: IPageIDiscussionBoardModeratorSession.ISummary =
    await api.functional.discussionBoard.moderator.auth.moderator.sessions.index(
      moderatorAConnection,
    );
  typia.assert(moderatorASessionsResponse);

  // Step 4: Prepare connection for moderator B and retrieve sessions
  const moderatorBConnection: api.IConnection = {
    ...connection,
    headers: {
      Authorization: moderatorBAuth.token.access,
    },
  };

  const moderatorBSessionsResponse: IPageIDiscussionBoardModeratorSession.ISummary =
    await api.functional.discussionBoard.moderator.auth.moderator.sessions.index(
      moderatorBConnection,
    );
  typia.assert(moderatorBSessionsResponse);

  // Step 5: Verify moderator A only sees their own sessions
  TestValidator.predicate(
    "moderator A session list should not be empty",
    moderatorASessionsResponse.data.length > 0,
  );

  const allModeratorASessionsBelongToA = moderatorASessionsResponse.data.every(
    (session) => session.moderator.id === moderatorAAuth.id,
  );
  TestValidator.predicate(
    "all sessions in moderator A list should belong to moderator A",
    allModeratorASessionsBelongToA,
  );

  const moderatorASessionIds = new Set(
    moderatorASessionsResponse.data.map((s) => s.id),
  );
  TestValidator.predicate(
    "moderator A should have at least one session",
    moderatorASessionIds.size > 0,
  );

  // Step 6: Verify moderator B only sees their own sessions
  TestValidator.predicate(
    "moderator B session list should not be empty",
    moderatorBSessionsResponse.data.length > 0,
  );

  const allModeratorBSessionsBelongToB = moderatorBSessionsResponse.data.every(
    (session) => session.moderator.id === moderatorBAuth.id,
  );
  TestValidator.predicate(
    "all sessions in moderator B list should belong to moderator B",
    allModeratorBSessionsBelongToB,
  );

  const moderatorBSessionIds = new Set(
    moderatorBSessionsResponse.data.map((s) => s.id),
  );
  TestValidator.predicate(
    "moderator B should have at least one session",
    moderatorBSessionIds.size > 0,
  );

  // Step 7: Verify no session IDs overlap between moderators
  const overlap = Array.from(moderatorASessionIds).filter((id) =>
    moderatorBSessionIds.has(id),
  );
  TestValidator.equals(
    "moderator sessions should not overlap",
    0,
    overlap.length,
  );

  // Step 8: Verify moderator A's session shows correct moderator info
  const moderatorASession = moderatorASessionsResponse.data[0];
  TestValidator.equals(
    "moderator A session should reference moderator A",
    moderatorASession.moderator.id,
    moderatorAAuth.id,
  );
  TestValidator.equals(
    "moderator A session should have moderator A display name",
    moderatorASession.moderator.display_name,
    moderatorADisplayName,
  );
  TestValidator.equals(
    "moderator A session should have active status",
    moderatorASession.moderator.account_status,
    "active",
  );

  // Step 9: Verify moderator B's session shows correct moderator info
  const moderatorBSession = moderatorBSessionsResponse.data[0];
  TestValidator.equals(
    "moderator B session should reference moderator B",
    moderatorBSession.moderator.id,
    moderatorBAuth.id,
  );
  TestValidator.equals(
    "moderator B session should have moderator B display name",
    moderatorBSession.moderator.display_name,
    moderatorBDisplayName,
  );
  TestValidator.equals(
    "moderator B session should have active status",
    moderatorBSession.moderator.account_status,
    "active",
  );

  // Step 10: Verify moderator A and B have different IDs
  TestValidator.notEquals(
    "moderator A and moderator B should be different users",
    moderatorAAuth.id,
    moderatorBAuth.id,
  );

  // Step 11: Verify session metadata contains valid values
  TestValidator.predicate(
    "moderator A session should have IP address",
    moderatorASession.ip.length > 0,
  );
  TestValidator.predicate(
    "moderator A session should have href URI",
    moderatorASession.href.length > 0,
  );
  TestValidator.predicate(
    "moderator A session should have created_at timestamp",
    moderatorASession.created_at.length > 0,
  );

  TestValidator.predicate(
    "moderator B session should have IP address",
    moderatorBSession.ip.length > 0,
  );
  TestValidator.predicate(
    "moderator B session should have href URI",
    moderatorBSession.href.length > 0,
  );
  TestValidator.predicate(
    "moderator B session should have created_at timestamp",
    moderatorBSession.created_at.length > 0,
  );
}
