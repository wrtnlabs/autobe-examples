import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IRedditCommunityModeratorKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModeratorKarma";

/**
 * Test retrieving karma statistics for a username that does not exist.
 *
 * This test validates the error handling behavior when requesting karma for a
 * non-existent moderator. The system should return an appropriate HTTP error
 * status (such as 404 Not Found) with a clear error message indicating the
 * moderator was not found.
 *
 * Test workflow:
 *
 * 1. Generate a random username that is extremely unlikely to exist
 * 2. Attempt to retrieve karma statistics for this non-existent username
 * 3. Verify that the API throws an HTTP error (expected 404 Not Found)
 * 4. This ensures the endpoint properly validates the username parameter and
 *    provides meaningful feedback when invalid usernames are provided
 */
export async function test_api_moderator_karma_nonexistent_username(
  connection: api.IConnection,
) {
  // Generate a random username with high entropy to ensure it doesn't exist
  const nonexistentUsername = `nonexistent_user_${RandomGenerator.alphaNumeric(16)}_${Date.now()}`;

  // Attempt to retrieve karma for non-existent moderator - should fail
  await TestValidator.error(
    "should return error for non-existent moderator username",
    async () => {
      await api.functional.redditCommunity.moderators.karma.at(connection, {
        username: nonexistentUsername,
      });
    },
  );
}
