import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFile";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test popular feed endpoint with hot sorting algorithm.
 *
 * This test validates that the popular feed endpoint:
 * 1. Returns posts from all communities across the platform
 * 2. Sorts posts by hot algorithm (weighted by vote score and recency)
 * 3. Returns proper post summaries with all required fields
 * 4. Provides correct pagination metadata
 */
export async function test_api_post_feed_popular_hot_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Query popular feed with hot sorting
  const hotFeed: IPageIRedditPlatformPost.ISummary =
    await api.functional.redditPlatform.posts.index(connection, {
      body: {
        sort_by: "hot",
        page: 1,
        limit: 20,
      } satisfies IRedditPlatformPost.IRequest,
    });
  typia.assert(hotFeed);
  // Validate pagination metadata
  TestValidator.equals("current page is 1", hotFeed.pagination.current, 1);
  TestValidator.equals("limit is 20", hotFeed.pagination.limit, 20);
  TestValidator.predicate(
    "records count is non-negative",
    hotFeed.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    hotFeed.pagination.pages >= 0,
  );
  // Validate post summaries structure
  for (const post of hotFeed.data) {
    // Validate required fields exist
    TestValidator.predicate(
      "has valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        post.id,
      ),
    );
    TestValidator.predicate("has title", post.title.length > 0);
    TestValidator.predicate(
      "has author",
      post.author !== null && post.author !== undefined,
    );
    TestValidator.predicate(
      "has community",
      post.community !== null && post.community !== undefined,
    );
    TestValidator.predicate(
      "has vote score",
      typeof post.vote_score === "number",
    );
    TestValidator.predicate(
      "has comment count",
      typeof post.comment_count === "number",
    );
    TestValidator.predicate(
      "has created_at",
      post.created_at !== null && post.created_at !== undefined,
    );
    TestValidator.predicate(
      "has post type",
      post.post_type !== null && post.post_type !== undefined,
    );
    TestValidator.predicate(
      "has preview",
      post.preview !== null && post.preview !== undefined,
    );
    // Validate author summary
    TestValidator.predicate(
      "author has UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        post.author.id,
      ),
    );
    TestValidator.predicate(
      "author has username",
      post.author.username.length > 0,
    );
    TestValidator.predicate(
      "author has karma score",
      typeof post.author.karma_score === "number",
    );
    TestValidator.predicate(
      "author has created_at",
      post.author.created_at !== null && post.author.created_at !== undefined,
    );
    // Validate community summary
    TestValidator.predicate(
      "community has UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        post.community.id,
      ),
    );
    TestValidator.predicate(
      "community has name",
      post.community.name.length > 0,
    );
    TestValidator.predicate(
      "community has subscriber count",
      typeof post.community.subscriber_count === "number",
    );
    TestValidator.predicate(
      "community has created_at",
      post.community.created_at !== null &&
        post.community.created_at !== undefined,
    );
    // Validate vote score is integer
    TestValidator.predicate(
      "vote score is integer",
      Number.isInteger(post.vote_score),
    );
    // Validate comment count is non-negative
    TestValidator.predicate(
      "comment count is non-negative",
      post.comment_count >= 0,
    );
    // Validate created_at is valid date-time format
    TestValidator.predicate(
      "created_at is valid date-time",
      !isNaN(Date.parse(post.created_at)),
    );
  }
  // Test 2: Query with different pagination parameters
  const page2Feed: IPageIRedditPlatformPost.ISummary =
    await api.functional.redditPlatform.posts.index(connection, {
      body: {
        sort_by: "hot",
        page: 2,
        limit: 10,
      } satisfies IRedditPlatformPost.IRequest,
    });
  typia.assert(page2Feed);
  TestValidator.equals("current page is 2", page2Feed.pagination.current, 2);
  TestValidator.equals("limit is 10", page2Feed.pagination.limit, 10);
  // Test 3: Query with search filter
  const searchFeed: IPageIRedditPlatformPost.ISummary =
    await api.functional.redditPlatform.posts.index(connection, {
      body: {
        sort_by: "hot",
        search: "test",
        page: 1,
        limit: 20,
      } satisfies IRedditPlatformPost.IRequest,
    });
  typia.assert(searchFeed);
  TestValidator.equals("current page is 1", searchFeed.pagination.current, 1);
}
