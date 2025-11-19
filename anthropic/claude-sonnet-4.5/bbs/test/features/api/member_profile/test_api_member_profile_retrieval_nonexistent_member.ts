import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test error handling when moderator attempts to retrieve a nonexistent member
 * profile.
 *
 * This test validates that the system properly handles attempts to retrieve
 * member profiles using invalid or nonexistent member IDs. The test creates an
 * authenticated moderator account, generates a valid UUID that does not
 * correspond to any existing member in the database, and verifies that the API
 * returns an appropriate error response.
 *
 * Test workflow:
 *
 * 1. Create and authenticate a moderator account
 * 2. Generate a valid UUID format that doesn't exist in the database
 * 3. Attempt to retrieve member profile with the nonexistent ID
 * 4. Verify the operation returns a not found error with appropriate message
 */
export async function test_api_member_profile_retrieval_nonexistent_member(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator account
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    username: RandomGenerator.alphaNumeric(10),
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorData,
  });
  typia.assert(moderator);

  // Step 2: Generate a valid UUID that doesn't exist in the database
  const nonexistentMemberId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Attempt to retrieve member profile with nonexistent ID
  // This should throw an error (404 not found expected)
  await TestValidator.error(
    "should fail when retrieving nonexistent member profile",
    async () => {
      await api.functional.discussionBoard.moderator.members.at(connection, {
        memberId: nonexistentMemberId,
      });
    },
  );
}
