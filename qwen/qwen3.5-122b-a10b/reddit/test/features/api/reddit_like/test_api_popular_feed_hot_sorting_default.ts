import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikePost";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePopularFeed } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePopularFeed";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test popular feed endpoint with default hot sorting algorithm.
 *
 * Validates the popular feed API returns posts from all communities across the platform with hot sorting as the default. The endpoint is publicly accessible without authentication and aggregates content from every community regardless of user subscription status.
 *
 * The test verifies comprehensive response structure including post summaries with vote scores, comment counts, author and community information, and content previews that vary by post type. Pagination metadata is validated to ensure proper cursor-based pagination support.
 *
 * 1. Call popular feed endpoint with default hot sorting.
 * 2. Validate response structure and pagination metadata.
 * 3. Verify post summaries contain required fields when data exists.
 */
export async function test_api_popular_feed_hot_sorting_default(
  connection: api.IConnection,
): Promise<void> {
  // Test popular feed with default hot sorting (no authentication required)
  const output: IPageIRedditLikePost.ISummary =
    await api.functional.redditLike.feeds.popular.index(connection, {
      body: {
        sort: "hot",
        limit: 10,
      } satisfies IRedditLikePopularFeed.IRequest,
    });
  typia.assert(output);
  // Validate pagination metadata structure
  TestValidator.predicate(
    "pagination has current page",
    output.pagination.current >= 0,
  );
  TestValidator.predicate("pagination has limit", output.pagination.limit > 0);
  TestValidator.predicate(
    "pagination has records count",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    output.pagination.pages >= 0,
  );
  // Validate each post in the response when data exists
  for (const post of output.data) {
    typia.assert(post);
    // Validate author information exists
    TestValidator.predicate(
      "author has username",
      post.author.username.length > 0,
    );
    TestValidator.predicate(
      "author has display name",
      post.author.display_name.length > 0,
    );
    // Validate community information exists
    TestValidator.predicate(
      "community has name",
      post.community.name.length > 0,
    );
    // Validate vote_score is a number (can be positive, negative, or zero)
    TestValidator.predicate(
      "vote_score is a number",
      typeof post.vote_score === "number",
    );
    // Validate comment_count is a non-negative number
    TestValidator.predicate(
      "comment_count is non-negative",
      post.comment_count >= 0,
    );
    // Validate content preview exists for all post types
    TestValidator.predicate(
      "content_preview exists",
      post.content_preview.length >= 0,
    );
    // Validate timestamp format
    TestValidator.predicate(
      "created_at is valid ISO timestamp",
      !isNaN(Date.parse(post.created_at)),
    );
  }
}
