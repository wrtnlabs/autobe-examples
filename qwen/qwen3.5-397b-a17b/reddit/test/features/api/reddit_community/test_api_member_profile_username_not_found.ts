import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test retrieving a profile for a username that does not exist in the system.
 *
 * Validates that the GET /redditCommunity/members/{username} endpoint properly returns a 404 Not Found error when attempting to retrieve a profile for a non-existent username. This test ensures the system correctly handles invalid username lookups without requiring any authentication or prerequisite setup.
 *
 * The test generates a random username that is guaranteed not to exist in the system and attempts to retrieve the profile. The expected behavior is a 404 HTTP error response, confirming that the endpoint properly validates username existence before returning profile data.
 *
 * 1. Generate a random username that does not exist in the system.
 * 2. Call the GET endpoint with the non-existent username.
 * 3. Validate that the operation throws an HttpError with status 404.
 */
export async function test_api_member_profile_username_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random username that does not exist
  const nonExistentUsername = RandomGenerator.alphabets(12);
  // Attempt to retrieve profile for non-existent username
  // Expected to throw 404 Not Found error
  await TestValidator.httpError(
    "should return 404 for non-existent username",
    404,
    async () => {
      await api.functional.redditCommunity.members.getByUsername(connection, {
        username: nonExistentUsername,
      });
    },
  );
}
