import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityCategories";

/**
 * Test the retrieval attempt for a community that does not exist with a
 * provided name. Validates proper error handling and response structure when
 * attempting to retrieve community information for invalid or non-existent
 * community names in the URL path parameter.
 *
 * Steps:
 *
 * 1. Generate a random community name that is unlikely to exist
 * 2. Attempt to retrieve the non-existent community
 * 3. Verify that the API call fails as expected
 *
 * This test ensures that the API properly handles error cases when communities
 * cannot be found by their unique name identifier.
 */
export async function test_api_community_retrieval_nonexistent_name(
  connection: api.IConnection,
) {
  // Generate a random community name that is unlikely to exist
  // Using a random string to minimize the chance of accidentally matching a real community
  const randomCommunityName = RandomGenerator.alphaNumeric(20);

  // Attempt to retrieve the non-existent community and verify it fails
  await TestValidator.error(
    "should fail for non-existent community name",
    async () => {
      await api.functional.redditCommunity.communities.at(connection, {
        communityName: randomCommunityName,
      });
    },
  );
}
