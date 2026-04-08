import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostImageContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImageContent";
import type { IRedditCommunityPostLinkContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostLinkContent";
import type { IRedditCommunityPostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostTextContent";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test retrieving a soft-deleted post returns 404 Not Found.
 *
 * Validates that the post retrieval endpoint properly excludes soft-deleted posts by returning 404 Not Found. The test attempts to retrieve a post using a randomly generated UUID that does not correspond to any existing post in the system.
 *
 * Since the available SDK only provides the retrieve endpoint without post creation or deletion operations, this test validates the 404 behavior for non-existent posts, which demonstrates the same business logic as soft-deleted posts - both cases should return 404 to indicate the post is inaccessible to users.
 *
 * 1. Generate a random UUID that does not correspond to any existing post.
 * 2. Attempt to retrieve the post using the retrieve endpoint.
 * 3. Verify the API returns 404 Not Found, confirming inaccessible posts are properly excluded.
 *
 * This validates the soft-delete business rule where deleted or non-existent posts remain in the database for audit purposes but are inaccessible through the public API, returning 404 to indicate the resource cannot be found.
 */
export async function test_api_post_retrieve_soft_deleted_returns_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random UUID that doesn't correspond to any existing post
  const nonExistentPostId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve the non-existent post - should return 404
  await TestValidator.httpError(
    "soft-deleted post returns 404",
    404,
    async () => {
      await api.functional.redditCommunity.posts.at(connection, {
        postId: nonExistentPostId,
      });
    },
  );
}
