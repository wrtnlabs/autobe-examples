import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test retrieving moderator details with a non-existent moderator ID.
 *
 * This test validates the system's error handling when attempting to retrieve
 * moderator profile information using a valid UUID format that does not
 * correspond to any existing moderator in the database.
 *
 * Test workflow:
 *
 * 1. Create and authenticate a moderator account to establish valid authentication
 *    context
 * 2. Generate a valid UUID that does not exist in the database
 * 3. Attempt to retrieve moderator details using the non-existent ID
 * 4. Validate that the API returns an appropriate error response
 *
 * This ensures proper error handling for invalid moderator ID lookups and
 * prevents the system from returning incorrect data or crashing when given
 * non-existent IDs.
 */
export async function test_api_moderator_detail_nonexistent_id(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a moderator account
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePassword123!",
    username: RandomGenerator.name(1),
    ip: undefined,
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

  // Step 3: Attempt to retrieve moderator details with non-existent ID and expect error
  await TestValidator.error(
    "should fail when retrieving moderator with non-existent ID",
    async () => {
      await api.functional.discussionBoard.moderator.moderators.at(connection, {
        moderatorId: nonExistentModeratorId,
      });
    },
  );
}
