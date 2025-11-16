import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

/**
 * Test retrieving a profile for a moderator username that does not exist.
 *
 * This test validates error handling when attempting to access a non-existent
 * moderator profile. The API should return an appropriate error response
 * indicating the moderator was not found, providing clear feedback to clients
 * about the invalid username.
 *
 * Steps:
 *
 * 1. Generate a random username that is guaranteed not to exist
 * 2. Attempt to retrieve the moderator profile with the non-existent username
 * 3. Verify that the API returns an error (not found)
 */
export async function test_api_moderator_profile_retrieval_nonexistent_username(
  connection: api.IConnection,
) {
  const nonExistentUsername = `nonexistent_${typia.random<string & tags.Format<"uuid">>()}`;

  await TestValidator.error(
    "should fail to retrieve profile for non-existent moderator username",
    async () => {
      await api.functional.redditCommunity.moderators.profile.at(connection, {
        username: nonExistentUsername,
      });
    },
  );
}
