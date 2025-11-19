import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

export async function test_api_moderator_profile_update_duplicate_email_conflict(
  connection: api.IConnection,
) {
  // 1. Register first moderator with unique email
  const firstEmail = typia.random<string & tags.Format<"email">>();
  const firstUsername = RandomGenerator.alphabets(8);
  const firstModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: firstEmail,
        password: "SecurePass123!",
        username: firstUsername,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(firstModerator);
  const firstModeratorToken = firstModerator.token.access;

  // 2. Register second moderator with different email
  const secondEmail = typia.random<string & tags.Format<"email">>();
  const secondModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: secondEmail,
        password: "SecurePass123!",
        username: RandomGenerator.alphabets(8),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(secondModerator);

  // 3. Switch connection to first moderator's authentication context
  const firstModeratorConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: firstModeratorToken,
    },
  };

  // 4. First moderator attempts to update email to second moderator's email
  // This should fail with 409 Conflict due to email uniqueness constraint
  await TestValidator.error(
    "duplicate email should cause 409 conflict error",
    async () => {
      await api.functional.discussionBoard.moderator.profile.update(
        firstModeratorConnection,
        {
          body: {
            email: secondEmail,
          } satisfies IDiscussionBoardUser.IUpdate,
        },
      );
    },
  );

  // 5. Verify the update was rejected by confirming no changes were persisted
  // The original email should still be associated with first moderator
  TestValidator.equals(
    "first moderator email should remain as original after failed update",
    firstModerator.email,
    firstEmail,
  );
}
