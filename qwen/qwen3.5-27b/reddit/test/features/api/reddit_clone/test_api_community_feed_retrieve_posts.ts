import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePost";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test retrieving posts from a community feed with default hot sorting.
 *
 * Validates the community feed retrieval endpoint by querying posts from a specific community. Ensures that the response contains properly structured post summaries with pagination metadata, and that all posts belong to the specified community. The endpoint is public and accessible without authentication.
 *
 * Special attention is given to verifying that the response structure matches the expected IPageIRedditClonePost.ISummary format, pagination metadata is accurate, and each post summary contains all required fields including author information, community details, vote scores, and comment counts.
 *
 * 1. Generate a valid community UUID for the feed query.
 * 2. Call the community feed endpoint with default hot sorting.
 * 3. Validate the response structure and pagination metadata.
 * 4. Verify all returned posts belong to the specified community.
 * 5. Validate each post summary contains required fields with correct types.
 */
export async function test_api_community_feed_retrieve_posts(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate a valid community UUID
  const communityId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 2. Retrieve community feed with default hot sorting
  const feed = await api.functional.redditClone.communities.feeds.index(
    connection,
    {
      communityId,
      body: {
        sortType: "hot",
        page: 1,
        limit: 25,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(feed);
  // 3. Validate pagination metadata
  TestValidator.equals("pagination current page", feed.pagination.current, 1);
  TestValidator.equals("pagination limit", feed.pagination.limit, 25);
  TestValidator.predicate(
    "pagination records is non-negative",
    feed.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is valid",
    feed.pagination.pages >= 0,
  );
  // 4. Validate posts array exists
  TestValidator.predicate("feed data is an array", Array.isArray(feed.data));
  // 5. Validate all posts belong to the specified community
  for (const post of feed.data) {
    TestValidator.equals(
      `post ${post.id} belongs to community ${communityId}`,
      post.community.id,
      communityId,
    );
    // Validate post has valid post_type enum value
    TestValidator.predicate(
      `post ${post.id} has valid post_type`,
      post.post_type === "text" ||
        post.post_type === "link" ||
        post.post_type === "image",
    );
  }
  // 6. Validate pagination consistency
  if (feed.data.length > 0) {
    TestValidator.predicate(
      "data length matches or is less than limit",
      feed.data.length <= feed.pagination.limit,
    );
    TestValidator.predicate(
      "data length matches or is less than records",
      feed.data.length <= feed.pagination.records,
    );
  }
}
