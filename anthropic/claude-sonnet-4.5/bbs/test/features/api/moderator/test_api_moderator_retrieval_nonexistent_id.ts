import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test moderator retrieval behavior when requesting a non-existent moderator
 * ID.
 *
 * This test validates the API's error handling when attempting to retrieve a
 * moderator account using a UUID that doesn't exist in the database. The test
 * ensures that the system properly rejects invalid moderator ID requests with
 * appropriate error responses.
 *
 * Test workflow:
 *
 * 1. Create and authenticate a moderator account for proper authorization
 * 2. Generate valid UUID formats that don't correspond to existing moderators
 * 3. Attempt to retrieve non-existent moderators using these UUIDs
 * 4. Verify that the API returns appropriate error responses without exposing
 *    system details
 */
export async function test_api_moderator_retrieval_nonexistent_id(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a moderator account
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "TestPassword123!",
    username: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const authenticatedModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(authenticatedModerator);

  // Step 2: Generate a non-existent moderator ID (valid UUID format)
  const nonExistentModeratorId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Attempt to retrieve the non-existent moderator and verify error
  await TestValidator.error(
    "should fail when retrieving non-existent moderator",
    async () => {
      await api.functional.discussionBoard.moderator.moderators.at(connection, {
        moderatorId: nonExistentModeratorId,
      });
    },
  );

  // Step 4: Test with multiple different non-existent UUIDs for consistency
  const additionalNonExistentIds = ArrayUtil.repeat(3, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );

  await ArrayUtil.asyncForEach(additionalNonExistentIds, async (testId) => {
    await TestValidator.error(
      "should consistently fail for various non-existent IDs",
      async () => {
        await api.functional.discussionBoard.moderator.moderators.at(
          connection,
          {
            moderatorId: testId,
          },
        );
      },
    );
  });
}
