import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityCategory";

/**
 * Test community retrieval with a non-existent slug to validate proper error
 * handling and 404 response behavior. Ensures the system correctly identifies
 * when a community does not exist and returns appropriate error status and
 * message.
 */
export async function test_api_community_retrieval_nonexistent_slug(
  connection: api.IConnection,
) {
  // Generate a random slug that does not exist in the system
  const nonExistentSlug = RandomGenerator.alphaNumeric(10);

  // Attempt to retrieve community with non-existent slug
  await TestValidator.error(
    "retrieving non-existent community should fail",
    async () => {
      await api.functional.communityPlatform.communities.getBySlug(connection, {
        slug: nonExistentSlug,
      });
    },
  );
}
