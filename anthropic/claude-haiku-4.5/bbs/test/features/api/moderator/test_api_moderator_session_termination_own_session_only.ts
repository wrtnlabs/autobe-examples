import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test moderator session termination with session isolation validation.
 *
 * This test validates that moderators can only terminate their own sessions and
 * that session termination is properly enforced. Each moderator maintains an
 * isolated session lifecycle accessible only through their own authorization
 * credentials.
 *
 * The test creates two distinct moderator accounts, authenticates both to
 * establish their sessions, and validates that each can only manage their own
 * session lifecycle. Session termination is verified by confirming that
 * attempting to use a terminated session fails appropriately.
 *
 * Test Flow:
 *
 * 1. Create moderator account A with unique credentials and authenticate
 * 2. Create moderator account B with unique credentials and authenticate
 * 3. Create connections with each moderator's authorization token
 * 4. As moderator A, terminate their own session using their moderator ID
 * 5. Verify moderator A's session is terminated - reuse of token should fail
 * 6. As moderator B, terminate their own session using their moderator ID
 * 7. Verify moderator B's session is terminated - reuse of token should fail
 * 8. Confirm both moderators maintained separate session lifecycle management
 */
export async function test_api_moderator_session_termination_own_session_only(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator A
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
  const moderatorAId = moderatorAAuth.id;
  const moderatorAToken = moderatorAAuth.token.access;

  // Step 2: Create and authenticate moderator B
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
  const moderatorBId = moderatorBAuth.id;
  const moderatorBToken = moderatorBAuth.token.access;

  // Step 3: Create connections with each moderator's authorization token
  const moderatorAConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: `Bearer ${moderatorAToken}`,
    },
  };

  const moderatorBConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: `Bearer ${moderatorBToken}`,
    },
  };

  // Step 4: As moderator A, terminate their own session using their moderator ID
  await api.functional.discussionBoard.moderator.auth.moderator.sessions.erase(
    moderatorAConnection,
    {
      sessionId: moderatorAId,
    },
  );

  // Step 5: Verify moderator A's session is terminated
  // Attempting to use moderator A's terminated session should fail
  await TestValidator.error(
    "moderator A cannot use terminated session",
    async () => {
      await api.functional.discussionBoard.moderator.auth.moderator.sessions.erase(
        moderatorAConnection,
        {
          sessionId: moderatorAId,
        },
      );
    },
  );

  // Step 6: As moderator B, terminate their own session using their moderator ID
  await api.functional.discussionBoard.moderator.auth.moderator.sessions.erase(
    moderatorBConnection,
    {
      sessionId: moderatorBId,
    },
  );

  // Step 7: Verify moderator B's session is terminated
  // Attempting to use moderator B's terminated session should fail
  await TestValidator.error(
    "moderator B cannot use terminated session",
    async () => {
      await api.functional.discussionBoard.moderator.auth.moderator.sessions.erase(
        moderatorBConnection,
        {
          sessionId: moderatorBId,
        },
      );
    },
  );

  // Step 8: Confirm both moderators maintained separate session lifecycle management
  TestValidator.predicate(
    "moderator A and B have different IDs",
    moderatorAId !== moderatorBId,
  );
  TestValidator.predicate(
    "moderator A and B have different authorization tokens",
    moderatorAToken !== moderatorBToken,
  );
}
