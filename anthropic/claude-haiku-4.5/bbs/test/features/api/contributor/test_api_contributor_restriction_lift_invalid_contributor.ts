import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAccountRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAccountRestriction";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test error handling when attempting to lift restriction for non-existent
 * contributor.
 *
 * This test validates that the moderator API properly handles requests to lift
 * restrictions from contributor accounts that do not exist in the system. A
 * moderator attempts to lift a restriction using an invalid (non-existent)
 * contributor UUID, and the API should return a 404 Not Found error indicating
 * the contributor does not exist.
 *
 * Test flow:
 *
 * 1. Create a moderator account through authentication
 * 2. Attempt to lift a restriction using an invalid contributor UUID
 * 3. Verify the API returns appropriate error response for non-existent
 *    contributor
 */
export async function test_api_contributor_restriction_lift_invalid_contributor(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account for authentication
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "SecurePass123!",
        username: RandomGenerator.alphabets(15),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Attempt to lift restriction for non-existent contributor
  const invalidContributorId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "should return error when lifting restriction for non-existent contributor",
    async () => {
      await api.functional.discussionBoard.moderator.contributors.lift_restriction.liftRestriction(
        connection,
        {
          contributorId: invalidContributorId,
          body: {
            lifted_reason: RandomGenerator.paragraph(),
          } satisfies IDiscussionBoardAccountRestriction.IUpdate,
        },
      );
    },
  );
}
