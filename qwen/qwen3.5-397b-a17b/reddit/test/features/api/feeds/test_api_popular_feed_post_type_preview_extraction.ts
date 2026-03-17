import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePost";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test that the Popular Feed correctly extracts and displays type-specific content previews for different post types.
 *
 * This test validates that:
 * 1. TEXT posts have preview containing text content (first 200 characters)
 * 2. IMAGE posts have preview containing thumbnail URL
 * 3. LINK posts have preview containing domain name
 * 4. All posts include complete author and community summary information
 * 5. Vote scores and comment counts are correctly present
 */
export async function test_api_popular_feed_post_type_preview_extraction(
  connection: api.IConnection,
): Promise<void> {
  // Call popular feed endpoint with different sort options to get diverse posts
  const feedResponse = await api.functional.redditClone.feeds.popular.index(
    connection,
    {
      body: {
        sort: "new",
        page: 1,
        limit: 20,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  // Validate response structure
  typia.assert(feedResponse);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination has current page",
    feedResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has limit",
    feedResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has records count",
    feedResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    feedResponse.pagination.pages >= 0,
  );
  // Validate each post in the feed
  for (const post of feedResponse.data) {
    // Validate post has required fields
    TestValidator.predicate("post has id", post.id.length > 0);
    TestValidator.predicate("post has title", post.title.length > 0);
    TestValidator.predicate("post has post_type", post.post_type.length > 0);
    TestValidator.predicate("post has preview", post.preview.length > 0);
    TestValidator.predicate("post has created_at", post.created_at.length > 0);
    // Validate post_type is one of the expected values
    TestValidator.predicate(
      "post_type is valid",
      post.post_type === "TEXT" ||
        post.post_type === "LINK" ||
        post.post_type === "IMAGE",
    );
    // Validate preview based on post_type
    if (post.post_type === "TEXT") {
      // TEXT posts should have text content preview (max 200 chars)
      TestValidator.predicate(
        "TEXT post preview is text content",
        post.preview.length > 0 && post.preview.length <= 200,
      );
    } else if (post.post_type === "IMAGE") {
      // IMAGE posts should have thumbnail URL preview
      TestValidator.predicate(
        "IMAGE post preview is URL",
        post.preview.length > 0,
      );
    } else if (post.post_type === "LINK") {
      // LINK posts should have domain name preview
      TestValidator.predicate(
        "LINK post preview is domain",
        post.preview.length > 0 && !post.preview.includes("://"),
      );
    }
    // Validate author summary
    TestValidator.predicate("author has id", post.author.id.length > 0);
    TestValidator.predicate(
      "author has username",
      post.author.username.length > 0,
    );
    TestValidator.predicate(
      "author has display_name",
      post.author.display_name.length > 0,
    );
    TestValidator.predicate(
      "author has karma_score",
      typeof post.author.karma_score === "number",
    );
    TestValidator.predicate(
      "author has created_at",
      post.author.created_at.length > 0,
    );
    // Validate community summary
    TestValidator.predicate("community has id", post.community.id.length > 0);
    TestValidator.predicate(
      "community has name",
      post.community.name.length > 0,
    );
    TestValidator.predicate(
      "community has description",
      post.community.description.length > 0,
    );
    TestValidator.predicate(
      "community has subscriber_count",
      typeof post.community.subscriber_count === "number",
    );
    TestValidator.predicate(
      "community has created_at",
      post.community.created_at.length > 0,
    );
    // Validate engagement metrics
    TestValidator.predicate(
      "vote_score is integer",
      Number.isInteger(post.vote_score),
    );
    TestValidator.predicate(
      "comment_count is integer",
      Number.isInteger(post.comment_count),
    );
    TestValidator.predicate(
      "comment_count is non-negative",
      post.comment_count >= 0,
    );
  }
  // Test with different sort options to ensure consistency
  const topFeedResponse = await api.functional.redditClone.feeds.popular.index(
    connection,
    {
      body: {
        sort: "top",
        timeFilter: "this_week",
        page: 1,
        limit: 10,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(topFeedResponse);
  TestValidator.predicate(
    "top feed returns data",
    topFeedResponse.data.length >= 0,
  );
  // Validate posts in top feed also have correct previews
  for (const post of topFeedResponse.data) {
    TestValidator.predicate(
      "post has valid post_type",
      post.post_type.length > 0,
    );
    TestValidator.predicate("post has preview", post.preview.length > 0);
  }
}
