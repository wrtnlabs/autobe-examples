import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test the hot feed endpoint to verify the primary success path where an authenticated member retrieves a paginated list of posts sorted by the Hot ranking algorithm.
 *
 * Test steps:
 * 1. Call the hot feed endpoint without authentication (public access)
 * 2. Verify default pagination (page=1, limit=20)
 * 3. Verify response contains paginated result with pagination metadata
 * 4. Test sorting options: NEW (sorts by created_at DESC), TOP (sorts by vote_score DESC), CONTROVERSIAL
 * 5. For TOP sorting, test time_range filter (TODAY, WEEK, MONTH, YEAR, ALL)
 * 6. Verify each post includes required fields: id, title, post_type, vote_score, comment_count, author, community, created_at, deleted_at
 * 7. Test pagination parameters with different page and limit values
 */
export async function test_api_hot_feed_display(
  connection: api.IConnection,
): Promise<void> {
  // 1. Test default hot feed (no parameters)
  const defaultFeed = await api.functional.redditPlatform.feeds.hot.index(
    connection,
    {
      body: {},
    },
  );
  typia.assert(defaultFeed);
  TestValidator.equals(
    "default pagination current page",
    defaultFeed.pagination.current,
    1,
  );
  TestValidator.equals(
    "default pagination limit",
    defaultFeed.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    defaultFeed.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    defaultFeed.pagination.pages >= 0,
  );
  TestValidator.equals(
    "pagination pages calculation",
    defaultFeed.pagination.pages,
    Math.ceil(defaultFeed.pagination.records / defaultFeed.pagination.limit),
  );
  // 2. Test custom pagination parameters
  const paginatedFeed = await api.functional.redditPlatform.feeds.hot.index(
    connection,
    {
      body: { page: 2, limit: 10 },
    },
  );
  typia.assert(paginatedFeed);
  TestValidator.equals(
    "custom pagination current page",
    paginatedFeed.pagination.current,
    2,
  );
  TestValidator.equals(
    "custom pagination limit",
    paginatedFeed.pagination.limit,
    10,
  );
  // 3. Test NEW sorting (most recent first)
  const newFeed = await api.functional.redditPlatform.feeds.hot.index(
    connection,
    {
      body: { sort_type: "NEW" },
    },
  );
  typia.assert(newFeed);
  TestValidator.equals(
    "sort type applied",
    newFeed.data.length,
    Math.min(20, newFeed.pagination.records),
  );
  // 4. Test TOP sorting with time ranges
  const todayFeed = await api.functional.redditPlatform.feeds.hot.index(
    connection,
    {
      body: { sort_type: "TOP", time_range: "TODAY" },
    },
  );
  typia.assert(todayFeed);
  const weekFeed = await api.functional.redditPlatform.feeds.hot.index(
    connection,
    {
      body: { sort_type: "TOP", time_range: "WEEK" },
    },
  );
  typia.assert(weekFeed);
  const monthFeed = await api.functional.redditPlatform.feeds.hot.index(
    connection,
    {
      body: { sort_type: "TOP", time_range: "MONTH" },
    },
  );
  typia.assert(monthFeed);
  const yearFeed = await api.functional.redditPlatform.feeds.hot.index(
    connection,
    {
      body: { sort_type: "TOP", time_range: "YEAR" },
    },
  );
  typia.assert(yearFeed);
  const allFeed = await api.functional.redditPlatform.feeds.hot.index(
    connection,
    {
      body: { sort_type: "TOP", time_range: "ALL" },
    },
  );
  typia.assert(allFeed);
  // 5. Test CONTROVERSIAL sorting
  const controversialFeed = await api.functional.redditPlatform.feeds.hot.index(
    connection,
    {
      body: { sort_type: "CONTROVERSIAL" },
    },
  );
  typia.assert(controversialFeed);
  // 6. Test post type filtering
  const textPostFeed = await api.functional.redditPlatform.feeds.hot.index(
    connection,
    {
      body: { post_type: "TEXT" },
    },
  );
  typia.assert(textPostFeed);
  const linkPostFeed = await api.functional.redditPlatform.feeds.hot.index(
    connection,
    {
      body: { post_type: "LINK" },
    },
  );
  typia.assert(linkPostFeed);
  const imagePostFeed = await api.functional.redditPlatform.feeds.hot.index(
    connection,
    {
      body: { post_type: "IMAGE" },
    },
  );
  typia.assert(imagePostFeed);
  // 7. Test search filtering
  const searchFeed = await api.functional.redditPlatform.feeds.hot.index(
    connection,
    {
      body: { search: "test" },
    },
  );
  typia.assert(searchFeed);
  // 8. Test date range filtering
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  const dateRangeFeed = await api.functional.redditPlatform.feeds.hot.index(
    connection,
    {
      body: {
        start_date: startDate.toISOString(),
        end_date: new Date().toISOString(),
      },
    },
  );
  typia.assert(dateRangeFeed);
  // 9. Test response structure validation
  if (defaultFeed.data.length > 0) {
    const firstPost = defaultFeed.data[0];
    typia.assert(firstPost);
    // Verify post summary has all required fields
    TestValidator.equals(
      "post id is uuid format",
      firstPost.id !== undefined && typeof firstPost.id === "string",
      true,
    );
    TestValidator.equals(
      "post has title",
      typeof firstPost.title === "string",
      true,
    );
    TestValidator.equals(
      "post has post_type",
      ["TEXT", "LINK", "IMAGE"].includes(firstPost.post_type),
      true,
    );
    TestValidator.predicate(
      "vote score is integer",
      typeof firstPost.vote_score === "number" &&
        Number.isInteger(firstPost.vote_score),
    );
    TestValidator.predicate(
      "comment count is integer",
      typeof firstPost.comment_count === "number" &&
        Number.isInteger(firstPost.comment_count),
    );
    TestValidator.equals(
      "post has author summary",
      firstPost.author !== undefined && typeof firstPost.author === "object",
      true,
    );
    TestValidator.equals(
      "post has community summary",
      firstPost.community !== undefined &&
        typeof firstPost.community === "object",
      true,
    );
    TestValidator.equals(
      "post created_at is datetime format",
      typeof firstPost.created_at === "string",
      true,
    );
    TestValidator.equals(
      "deleted_at is null or datetime format",
      firstPost.deleted_at === null ||
        (typeof firstPost.deleted_at === "string" &&
          !Number.isNaN(Date.parse(firstPost.deleted_at))),
      true,
    );
  }
}
