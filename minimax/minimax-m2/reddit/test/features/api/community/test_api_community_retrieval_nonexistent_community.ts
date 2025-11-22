import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

/**
 * Test retrieving community information for a non-existent community name.
 *
 * This test validates that the API properly handles requests for communities
 * that don't exist in the system. It ensures that appropriate error handling is
 * implemented and that the system gracefully handles invalid community
 * identifiers without exposing sensitive information or causing system errors.
 *
 * The test generates a random, non-existent community name and attempts to
 * retrieve community information for it. It validates that the API call
 * properly throws an error, confirming that the error handling mechanisms work
 * correctly for missing resource scenarios.
 *
 * This is a critical error handling test that ensures users receive proper
 * feedback when attempting to access non-existent communities, maintaining good
 * user experience and system security.
 */
export async function test_api_community_retrieval_nonexistent_community(
  connection: api.IConnection,
) {
  // Generate a non-existent community name using random alphanumeric string
  const nonExistentCommunityName = `test_nonexistent_${RandomGenerator.alphaNumeric(8)}`;

  // Validate that attempting to retrieve a non-existent community throws an error
  await TestValidator.error(
    "non-existent community retrieval should throw error",
    async () => {
      await api.functional.redditPlatform.communities.at(connection, {
        communityName: nonExistentCommunityName,
      });
    },
  );

  // Test with another format of non-existent community name to ensure consistent behavior
  const anotherNonExistentName = `fake_community_${RandomGenerator.alphaNumeric(10)}`;

  await TestValidator.error(
    "another non-existent community name should also throw error",
    async () => {
      await api.functional.redditPlatform.communities.at(connection, {
        communityName: anotherNonExistentName,
      });
    },
  );
}
