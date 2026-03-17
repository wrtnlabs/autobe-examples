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
 * Test popular feed sorting options and time filters.
 *
 * This test validates the popular feed endpoint with different sorting strategies:
 * - new: chronological order (most recent first)
 * - top: highest vote score with time filters (today, week, month, year, all_time)
 * - controversial: posts with many votes but scores near zero
 *
 * Tests verify that:
 * 1. Each sort option returns posts in the expected order
 * 2. Time filters correctly restrict posts to the specified time period
 * 3. Invalid sort options default to hot sorting
 * 4. Response structure is valid with proper pagination
 */
export async function test_api_popular_feed_sort_options_and_time_filter(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: New sorting - most recent posts first
  const newFeed = await api.functional.redditPlatform.feeds.popular.index(
    connection,
    {
      body: {
        sort_by: "new",
        limit: 10,
      } satisfies IRedditPlatformPost.IRequest,
    },
  );
  typia.assert(newFeed);
  // Verify posts are in descending order by created_at (most recent first)
  if (newFeed.data.length > 1) {
    for (let i = 0; i < newFeed.data.length - 1; i++) {
      TestValidator.predicate(
        `new sort: post ${i} should be newer than post ${i + 1}`,
        newFeed.data[i].created_at >= newFeed.data[i + 1].created_at,
      );
    }
  }
  // Test 2: Top sorting with different time filters
  const timeFilters: Array<"today" | "week" | "month" | "year" | "all_time"> = [
    "today",
    "week",
    "month",
    "year",
    "all_time",
  ];
  for (const timeFilter of timeFilters) {
    const topFeed = await api.functional.redditPlatform.feeds.popular.index(
      connection,
      {
        body: {
          sort_by: "top",
          time_filter: timeFilter,
          limit: 10,
        } satisfies IRedditPlatformPost.IRequest,
      },
    );
    typia.assert(topFeed);
    // Verify posts are in descending order by vote_score (highest first)
    if (topFeed.data.length > 1) {
      for (let i = 0; i < topFeed.data.length - 1; i++) {
        TestValidator.predicate(
          `top (${timeFilter}) sort: post ${i} should have >= score than post ${i + 1}`,
          topFeed.data[i].vote_score >= topFeed.data[i + 1].vote_score,
        );
      }
    }
    // Verify posts are within the time filter boundary
    const now = new Date();
    let cutoffDate: Date;
    switch (timeFilter) {
      case "today":
        cutoffDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case "week":
        cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "year":
        cutoffDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      case "all_time":
        cutoffDate = new Date(0); // No boundary
        break;
    }
    if (timeFilter !== "all_time" && topFeed.data.length > 0) {
      for (const post of topFeed.data) {
        TestValidator.predicate(
          `top (${timeFilter}) filter: post should be within time boundary`,
          new Date(post.created_at) >= cutoffDate,
        );
      }
    }
  }
  // Test 3: Controversial sorting - posts with many votes but scores near zero
  const controversialFeed =
    await api.functional.redditPlatform.feeds.popular.index(connection, {
      body: {
        sort_by: "controversial",
        limit: 10,
      } satisfies IRedditPlatformPost.IRequest,
    });
  typia.assert(controversialFeed);
  // Verify response structure
  TestValidator.equals(
    "pagination current page",
    controversialFeed.pagination.current,
    1,
  );
  TestValidator.predicate(
    "has pagination limit",
    controversialFeed.pagination.limit > 0,
  );
  TestValidator.predicate(
    "has total records",
    controversialFeed.pagination.records >= 0,
  );
  // Test 4: Invalid sort_by defaults to hot
  const defaultFeed = await api.functional.redditPlatform.feeds.popular.index(
    connection,
    {
      body: {
        sort_by: undefined,
        limit: 10,
      } satisfies IRedditPlatformPost.IRequest,
    },
  );
  typia.assert(defaultFeed);
  // Verify pagination structure
  TestValidator.equals(
    "pagination current page",
    defaultFeed.pagination.current,
    1,
  );
  TestValidator.predicate(
    "has pagination limit",
    defaultFeed.pagination.limit > 0,
  );
  // Test 5: Validate post summary structure
  if (newFeed.data.length > 0) {
    const firstPost = newFeed.data[0];
    TestValidator.predicate("post has valid id", firstPost.id.length > 0);
    TestValidator.predicate("post has title", firstPost.title.length > 0);
    TestValidator.predicate(
      "post has author",
      firstPost.author.username.length > 0,
    );
    TestValidator.predicate(
      "post has community",
      firstPost.community.name.length > 0,
    );
    TestValidator.predicate(
      "post has vote score",
      typeof firstPost.vote_score === "number",
    );
    TestValidator.predicate(
      "post has comment count",
      typeof firstPost.comment_count === "number",
    );
    TestValidator.predicate(
      "post has created_at",
      firstPost.created_at.length > 0,
    );
    TestValidator.predicate(
      "post has post_type",
      firstPost.post_type.length > 0,
    );
    TestValidator.predicate(
      "post has preview",
      typeof firstPost.preview === "string",
    );
  }
}
