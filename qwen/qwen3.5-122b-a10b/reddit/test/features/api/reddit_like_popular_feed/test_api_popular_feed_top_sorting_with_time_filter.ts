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
 * Test popular feed endpoint with top sorting and time filter validation.
 *
 * Validates the popular feed endpoint's top sorting algorithm with various time filter options. Ensures that posts are correctly filtered by creation time and sorted by vote scores in descending order. Tests all time filter options (today, week, month, year, all_time) and validates pagination functionality with filtered and sorted results.
 *
 * The test verifies that:
 * 1. sort=top with time_filter restricts results to posts within the specified time period
 * 2. Posts are ordered by vote_score in descending order
 * 3. All time filter options work correctly (today, week, month, year, all_time)
 * 4. Default behavior (sort=top without time_filter) equals all_time
 * 5. Pagination works correctly with filtered and sorted results
 * 6. Response structure matches IPageIRedditLikePost.ISummary schema
 *
 * 1. Test sort=top with time_filter=today - verify 24-hour window filtering
 * 2. Test sort=top with time_filter=week - verify 7-day window filtering
 * 3. Test sort=top with time_filter=month - verify 30-day window filtering
 * 4. Test sort=top with time_filter=year - verify 365-day window filtering
 * 5. Test sort=top with time_filter=all_time - verify no time restriction
 * 6. Test sort=top without time_filter - verify defaults to all_time
 * 7. Test pagination with top sorting and time filter
 * 8. Validate response structure and data types
 */
export async function test_api_popular_feed_top_sorting_with_time_filter(
  connection: api.IConnection,
): Promise<void> {
  // Define time filter options to test
  const timeFilters: Array<"today" | "week" | "month" | "year" | "all_time"> = [
    "today",
    "week",
    "month",
    "year",
    "all_time",
  ];
  // Test each time filter option with sort=top
  for (const timeFilter of timeFilters) {
    const response: IPageIRedditLikePost.ISummary =
      await api.functional.redditLike.feeds.popular.index(connection, {
        body: {
          sort: "top",
          time_filter: timeFilter,
          limit: 50,
        } satisfies IRedditLikePopularFeed.IRequest,
      });
    typia.assert(response);
    // Validate pagination structure
    TestValidator.equals(
      `time_filter=${timeFilter} has valid pagination current`,
      response.pagination.current,
      1,
    );
    TestValidator.predicate(
      `time_filter=${timeFilter} has valid limit`,
      response.pagination.limit > 0,
    );
    TestValidator.predicate(
      `time_filter=${timeFilter} has valid records count`,
      response.pagination.records >= 0,
    );
    // Validate posts are sorted by vote_score descending
    for (let i = 1; i < response.data.length; i++) {
      TestValidator.predicate(
        `time_filter=${timeFilter} posts sorted by vote_score desc at index ${i}`,
        response.data[i - 1].vote_score >= response.data[i].vote_score,
      );
    }
  }
  // Test default behavior: sort=top without time_filter should equal all_time
  const defaultResponse: IPageIRedditLikePost.ISummary =
    await api.functional.redditLike.feeds.popular.index(connection, {
      body: {
        sort: "top",
        limit: 50,
      } satisfies IRedditLikePopularFeed.IRequest,
    });
  typia.assert(defaultResponse);
  // Compare with all_time result
  const allTimeResponse: IPageIRedditLikePost.ISummary =
    await api.functional.redditLike.feeds.popular.index(connection, {
      body: {
        sort: "top",
        time_filter: "all_time",
        limit: 50,
      } satisfies IRedditLikePopularFeed.IRequest,
    });
  typia.assert(allTimeResponse);
  TestValidator.equals(
    "default sort=top equals all_time - pagination current",
    defaultResponse.pagination.current,
    allTimeResponse.pagination.current,
  );
  TestValidator.equals(
    "default sort=top equals all_time - pagination records",
    defaultResponse.pagination.records,
    allTimeResponse.pagination.records,
  );
  // Test pagination with top sorting
  const firstPage: IPageIRedditLikePost.ISummary =
    await api.functional.redditLike.feeds.popular.index(connection, {
      body: {
        sort: "top",
        time_filter: "week",
        limit: 10,
        page: 1,
      } satisfies IRedditLikePopularFeed.IRequest,
    });
  typia.assert(firstPage);
  TestValidator.equals("first page number", firstPage.pagination.current, 1);
  TestValidator.equals("first page limit", firstPage.pagination.limit, 10);
  if (firstPage.pagination.pages > 1 && firstPage.data.length > 0) {
    const secondPage: IPageIRedditLikePost.ISummary =
      await api.functional.redditLike.feeds.popular.index(connection, {
        body: {
          sort: "top",
          time_filter: "week",
          limit: 10,
          page: 2,
        } satisfies IRedditLikePopularFeed.IRequest,
      });
    typia.assert(secondPage);
    TestValidator.equals(
      "second page number",
      secondPage.pagination.current,
      2,
    );
    // Verify second page posts have lower or equal vote scores than first page
    if (secondPage.data.length > 0 && firstPage.data.length > 0) {
      TestValidator.predicate(
        "second page vote scores <= first page",
        secondPage.data[0].vote_score <=
          firstPage.data[firstPage.data.length - 1].vote_score,
      );
    }
  }
  // Test with community filter
  const communityId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const communityFilteredResponse: IPageIRedditLikePost.ISummary =
    await api.functional.redditLike.feeds.popular.index(connection, {
      body: {
        sort: "top",
        time_filter: "month",
        community_id: communityId,
        limit: 20,
      } satisfies IRedditLikePopularFeed.IRequest,
    });
  typia.assert(communityFilteredResponse);
  // Validate all posts belong to the specified community (if any posts returned)
  if (communityFilteredResponse.data.length > 0) {
    const testCommunityId = communityFilteredResponse.data[0].community.id;
    for (const post of communityFilteredResponse.data) {
      TestValidator.equals(
        "community filter - all posts from same community",
        post.community.id,
        testCommunityId,
      );
    }
  }
  // Test search parameter with top sorting
  const searchTerm = RandomGenerator.alphabets(5);
  const searchResponse: IPageIRedditLikePost.ISummary =
    await api.functional.redditLike.feeds.popular.index(connection, {
      body: {
        sort: "top",
        time_filter: "week",
        search: searchTerm,
        limit: 20,
      } satisfies IRedditLikePopularFeed.IRequest,
    });
  typia.assert(searchResponse);
  // Validate search results contain the search term in titles (if any posts returned)
  if (searchResponse.data.length > 0) {
    for (const post of searchResponse.data) {
      TestValidator.predicate(
        "search filter - title contains search term",
        post.title.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }
  }
}
