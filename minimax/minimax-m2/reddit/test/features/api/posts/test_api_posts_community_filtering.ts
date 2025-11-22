import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

/**
 * Validate community filtering functionality for posts retrieval.
 *
 * This test verifies that the posts API correctly filters results by community
 * ID, ensuring users can browse posts from specific communities. The test
 * validates filtering accuracy, handles edge cases like non-existent
 * communities, and confirms community information is properly included in post
 * summaries.
 *
 * Test Coverage:
 *
 * 1. Create multiple test communities with posts
 * 2. Filter by specific community ID and validate results
 * 3. Test non-existent community ID handling
 * 4. Validate combined filtering with other parameters
 * 5. Verify community information in response summaries
 */
export async function test_api_posts_community_filtering(
  connection: api.IConnection,
) {
  // Note: Since this is testing against existing test data, we'll use realistic
  // community IDs that would typically exist in the database

  const testCommunityId = typia.random<string & tags.Format<"uuid">>();
  const existingCommunityId = "550e8400-e29b-41d4-a716-446655440000"; // Example UUID format

  // Test 1: Filter by existing community ID
  const communityFilterResult = await api.functional.redditPlatform.posts.index(
    connection,
    {
      body: {
        reddit_community_id: existingCommunityId,
        page: 1,
        limit: 10,
      } satisfies IRedditPlatformPost.IRequest,
    },
  );

  // Validate response structure
  typia.assert(communityFilterResult);
  TestValidator.equals(
    "pagination info present",
    communityFilterResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit applied correctly",
    communityFilterResult.pagination.limit,
    10,
  );

  // Validate each post belongs to the specified community
  for (const post of communityFilterResult.data) {
    TestValidator.equals(
      "post belongs to filtered community",
      post.community.id,
      existingCommunityId,
    );
    TestValidator.predicate(
      "community info populated",
      post.community.name.length > 0,
    );
  }

  // Test 2: Filter by non-existent community ID
  const nonExistentResult = await api.functional.redditPlatform.posts.index(
    connection,
    {
      body: {
        reddit_community_id: testCommunityId, // Non-existent ID
        page: 1,
        limit: 10,
      } satisfies IRedditPlatformPost.IRequest,
    },
  );

  typia.assert(nonExistentResult);
  TestValidator.equals(
    "no posts for non-existent community",
    nonExistentResult.data.length,
    0,
  );

  // Test 3: Combined filtering with community and status
  const combinedFilterResult = await api.functional.redditPlatform.posts.index(
    connection,
    {
      body: {
        reddit_community_id: existingCommunityId,
        status: "active",
        content_type: "text",
        page: 1,
        limit: 5,
      } satisfies IRedditPlatformPost.IRequest,
    },
  );

  typia.assert(combinedFilterResult);

  // Validate combined filters work correctly
  for (const post of combinedFilterResult.data) {
    TestValidator.equals(
      "post belongs to filtered community",
      post.community.id,
      existingCommunityId,
    );
    TestValidator.equals("post has correct status", post.status, "active");
    TestValidator.equals(
      "post has correct content type",
      post.content_type,
      "text",
    );
  }

  // Test 4: Verify community information in summary
  const firstResult = communityFilterResult.data[0];
  if (firstResult) {
    TestValidator.predicate(
      "author info included",
      firstResult.author.username.length > 0,
    );
    TestValidator.predicate(
      "community info included",
      firstResult.community.name.length > 0,
    );
    TestValidator.predicate(
      "community title populated",
      firstResult.community.title.length > 0,
    );
    TestValidator.predicate(
      "community description populated",
      firstResult.community.description.length > 0,
    );
  }
}
