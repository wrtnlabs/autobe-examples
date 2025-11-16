import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test retrieving a community with a non-existent ID.
 *
 * This test validates that the API properly handles requests for communities
 * that do not exist. When attempting to retrieve a community using a valid UUID
 * that does not correspond to any community in the system, the API should
 * return an HTTP 404 Not Found error.
 *
 * Test workflow:
 *
 * 1. Generate a valid UUID that represents a non-existent community ID
 * 2. Attempt to retrieve the community using this non-existent ID
 * 3. Verify that the API returns HTTP 404 Not Found error
 * 4. Confirm the error is properly structured as HttpError
 */
export async function test_api_community_retrieval_nonexistent_community(
  connection: api.IConnection,
) {
  // Generate a non-existent community ID (valid UUID format but doesn't exist)
  const nonExistentCommunityId = typia.random<string & tags.Format<"uuid">>();

  // Attempt to retrieve the non-existent community and expect HTTP 404 error
  await TestValidator.httpError(
    "retrieve non-existent community should return 404",
    404,
    async () => {
      await api.functional.communityPlatform.communities.at(connection, {
        communityId: nonExistentCommunityId,
      });
    },
  );
}
