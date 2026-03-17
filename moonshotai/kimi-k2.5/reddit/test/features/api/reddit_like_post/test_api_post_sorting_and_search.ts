import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikePost";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_post_sorting_and_search(
  connection: api.IConnection,
): Promise<void> {
  const con: api.IConnection = { host: connection.host };
  // Test 1: Sort by 'new' - posts ordered by created_at DESC
  const newSorted = await api.functional.redditLike.posts.index(con, {
    body: {
      sort: "new",
    } satisfies IRedditLikePost.IRequest,
  });
  typia.assert(newSorted);
  TestValidator.predicate(
    "sort by new returns results",
    newSorted.data.length > 0,
  );
  // Verify descending order of created_at for 'new' sort
  TestValidator.predicate(
    "new sort orders by created_at descending",
    newSorted.data.length < 2 ||
      new Date(newSorted.data[0].created_at).getTime() >=
        new Date(newSorted.data[1].created_at).getTime(),
  );
  // Test 2: Sort by 'top' - posts ordered by vote_score DESC
  const topSorted = await api.functional.redditLike.posts.index(con, {
    body: {
      sort: "top",
    } satisfies IRedditLikePost.IRequest,
  });
  typia.assert(topSorted);
  TestValidator.predicate(
    "sort by top returns results",
    topSorted.data.length > 0,
  );
  // Verify descending order of vote_score for 'top' sort
  TestValidator.predicate(
    "top sort orders by vote_score descending",
    topSorted.data.length < 2 ||
      topSorted.data[0].vote_score >= topSorted.data[1].vote_score,
  );
  // Test 3: Sort by 'controversial' - posts with balanced scores near zero
  const controversialSorted = await api.functional.redditLike.posts.index(con, {
    body: {
      sort: "controversial",
    } satisfies IRedditLikePost.IRequest,
  });
  typia.assert(controversialSorted);
  TestValidator.predicate(
    "sort by controversial returns results",
    controversialSorted.data.length > 0,
  );
  // Test 4: Time filter options with top sorting
  const timeFilters = ["today", "week", "month", "year", "all_time"] as const;
  for (const timeFilter of timeFilters) {
    const timeFiltered = await api.functional.redditLike.posts.index(con, {
      body: {
        sort: "top",
        timeFilter,
      } satisfies IRedditLikePost.IRequest,
    });
    typia.assert(timeFiltered);
    TestValidator.predicate(
      `timeFilter ${timeFilter} with top sort returns results`,
      timeFiltered.pagination !== null,
    );
    // Verify descending order of vote_score is maintained with time filter
    if (timeFiltered.data.length >= 2) {
      TestValidator.predicate(
        `timeFilter ${timeFilter} maintains vote_score descending order`,
        timeFiltered.data[0].vote_score >= timeFiltered.data[1].vote_score,
      );
    }
  }
  // Test 5: Time filter options with controversial sorting
  for (const timeFilter of timeFilters) {
    const timeFilteredControversial =
      await api.functional.redditLike.posts.index(con, {
        body: {
          sort: "controversial",
          timeFilter,
        } satisfies IRedditLikePost.IRequest,
      });
    typia.assert(timeFilteredControversial);
    TestValidator.predicate(
      `timeFilter ${timeFilter} with controversial sort returns results`,
      timeFilteredControversial.pagination !== null,
    );
  }
  // Test 6: Full-text search on title using trigram matching
  const searchTerm = RandomGenerator.alphabets(5);
  const searchResult = await api.functional.redditLike.posts.index(con, {
    body: {
      search: searchTerm,
    } satisfies IRedditLikePost.IRequest,
  });
  typia.assert(searchResult);
  TestValidator.predicate(
    "full-text search returns valid response",
    searchResult.pagination !== null,
  );
  // Test 7: Search combined with sorting (new)
  const searchWithNewSort = await api.functional.redditLike.posts.index(con, {
    body: {
      search: searchTerm,
      sort: "new",
    } satisfies IRedditLikePost.IRequest,
  });
  typia.assert(searchWithNewSort);
  TestValidator.predicate(
    "search with new sort returns results",
    searchWithNewSort.pagination !== null,
  );
  if (searchWithNewSort.data.length >= 2) {
    TestValidator.predicate(
      "search with new sort maintains time-based ordering",
      new Date(searchWithNewSort.data[0].created_at).getTime() >=
        new Date(searchWithNewSort.data[1].created_at).getTime(),
    );
  }
  // Test 8: Search combined with sorting (top)
  const searchWithTopSort = await api.functional.redditLike.posts.index(con, {
    body: {
      search: searchTerm,
      sort: "top",
      timeFilter: "all_time",
    } satisfies IRedditLikePost.IRequest,
  });
  typia.assert(searchWithTopSort);
  TestValidator.predicate(
    "search with top sort returns results",
    searchWithTopSort.pagination !== null,
  );
  if (searchWithTopSort.data.length >= 2) {
    TestValidator.predicate(
      "search with top sort maintains vote-based ordering",
      searchWithTopSort.data[0].vote_score >=
        searchWithTopSort.data[1].vote_score,
    );
  }
  // Test 9: Pagination parameters
  const paginated = await api.functional.redditLike.posts.index(con, {
    body: {
      sort: "new",
      page: 1,
      limit: 10,
    } satisfies IRedditLikePost.IRequest,
  });
  typia.assert(paginated);
  TestValidator.equals(
    "pagination current page",
    paginated.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", paginated.pagination.limit, 10);
  TestValidator.predicate(
    "pagination data length within limit",
    paginated.data.length <= 10,
  );
  // Test 10: Post type filter combined with sorting
  const textPostsSorted = await api.functional.redditLike.posts.index(con, {
    body: {
      postType: "text",
      sort: "new",
    } satisfies IRedditLikePost.IRequest,
  });
  typia.assert(textPostsSorted);
  TestValidator.predicate(
    "text post filter with sort returns only text posts",
    textPostsSorted.data.every((post) => post.post_type === "text"),
  );
  // Test 11: Combined sortBy and sortOrder for custom sorting
  const customSorted = await api.functional.redditLike.posts.index(con, {
    body: {
      sortBy: "created_at",
      sortOrder: "desc",
    } satisfies IRedditLikePost.IRequest,
  });
  typia.assert(customSorted);
  if (customSorted.data.length >= 2) {
    TestValidator.predicate(
      "custom sort by created_at descending works",
      new Date(customSorted.data[0].created_at).getTime() >=
        new Date(customSorted.data[1].created_at).getTime(),
    );
  }
  // Test 12: Combined sortBy and sortOrder for vote_score
  const voteSorted = await api.functional.redditLike.posts.index(con, {
    body: {
      sortBy: "vote_score",
      sortOrder: "asc",
    } satisfies IRedditLikePost.IRequest,
  });
  typia.assert(voteSorted);
  if (voteSorted.data.length >= 2) {
    TestValidator.predicate(
      "custom sort by vote_score ascending works",
      voteSorted.data[0].vote_score <= voteSorted.data[1].vote_score,
    );
  }
}
