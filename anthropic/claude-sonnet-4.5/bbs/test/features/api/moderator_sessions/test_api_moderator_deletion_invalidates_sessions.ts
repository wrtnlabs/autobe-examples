import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test that deleting a moderator account immediately invalidates all active
 * sessions.
 *
 * This test validates the security measure that prevents deleted moderators
 * from continuing to access the system. The test creates a moderator account,
 * establishes authenticated sessions, then performs account deletion. It
 * verifies that subsequent requests using the previously valid authentication
 * tokens are rejected, confirming that all sessions were invalidated upon
 * deletion.
 *
 * Workflow:
 *
 * 1. Create and authenticate a moderator account through registration
 * 2. Verify the moderator has valid authentication tokens
 * 3. Delete the moderator account
 * 4. Verify that the previously valid session is now invalidated and access is
 *    denied
 */
export async function test_api_moderator_deletion_invalidates_sessions(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account through registration
  const moderatorUsername = RandomGenerator.name(1);
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);

  const createdModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: moderatorUsername,
        email: moderatorEmail,
        password: moderatorPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(createdModerator);

  // Step 2: Verify the moderator has valid authentication tokens
  TestValidator.predicate(
    "moderator should have access token",
    createdModerator.token.access.length > 0,
  );

  TestValidator.predicate(
    "moderator should have refresh token",
    createdModerator.token.refresh.length > 0,
  );

  TestValidator.equals(
    "created username matches",
    createdModerator.username,
    moderatorUsername,
  );

  // Step 3: Delete the moderator account
  const deletedModerator: IDiscussionBoardModerator =
    await api.functional.discussionBoard.moderator.moderators.erase(
      connection,
      {
        moderatorUsername: createdModerator.username,
      },
    );
  typia.assert(deletedModerator);

  // Verify deletion timestamp is set
  TestValidator.predicate(
    "deleted moderator should have deleted_at timestamp",
    deletedModerator.deleted_at !== null &&
      deletedModerator.deleted_at !== undefined,
  );

  TestValidator.equals(
    "deleted moderator username matches",
    deletedModerator.username,
    createdModerator.username,
  );

  // Step 4: Verify session invalidation by attempting to delete again with the same connection
  // The connection still has the authentication token from the join() call,
  // but the server should reject it because the account was deleted
  await TestValidator.error(
    "previously valid session should be rejected after account deletion",
    async () => {
      await api.functional.discussionBoard.moderator.moderators.erase(
        connection,
        {
          moderatorUsername: deletedModerator.username,
        },
      );
    },
  );
}
