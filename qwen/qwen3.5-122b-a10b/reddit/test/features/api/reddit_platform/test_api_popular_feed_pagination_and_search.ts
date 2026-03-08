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

export async function test_api_popular_feed_pagination_and_search(
  connection: api.IConnection,
): Promise<void> {
  // Create a guest connection for accessing public feed
  const guestConnection: api.IConnection = { host: connection.host };
  // Test 1: Basic pagination with default parameters
  const firstPage = await api.functional.redditPlatform.feeds.popular.index(
    guestConnection,
    {
      body: {
        page: 1,
        limit: 20,
        sort_by: "new",
      } satisfies IRedditPlatformPost.IRequest,
    },
  );
  typia.assert(firstPage);
  // Validate pagination metadata
  TestValidator.equals("first page current", firstPage.pagination.current, 1);
  TestValidator.equals("first page limit", firstPage.pagination.limit, 20);
  TestValidator.predicate("has records", firstPage.pagination.records >= 0);
  TestValidator.predicate("has pages", firstPage.pagination.pages >= 0);
  // Test 2: Pagination with custom limit
  const secondPage = await api.functional.redditPlatform.feeds.popular.index(
    guestConnection,
    {
      body: {
        page: 1,
        limit: 10,
        sort_by: "new",
      } satisfies IRedditPlatformPost.IRequest,
    },
  );
  typia.assert(secondPage);
  TestValidator.equals("custom limit applied", secondPage.pagination.limit, 10);
  TestValidator.predicate(
    "second page has fewer or equal records than first",
    secondPage.data.length <= firstPage.data.length,
  );
  // Test 3: Test maximum limit (100)
  const maxLimitPage = await api.functional.redditPlatform.feeds.popular.index(
    guestConnection,
    {
      body: {
        page: 1,
        limit: 100,
        sort_by: "new",
      } satisfies IRedditPlatformPost.IRequest,
    },
  );
  typia.assert(maxLimitPage);
  TestValidator.equals("max limit applied", maxLimitPage.pagination.limit, 100);
  // Test 4: Test pagination across multiple pages (if enough data exists)
  if (firstPage.pagination.records > 10) {
    const page2 = await api.functional.redditPlatform.feeds.popular.index(
      guestConnection,
      {
        body: {
          page: 2,
          limit: 10,
          sort_by: "new",
        } satisfies IRedditPlatformPost.IRequest,
      },
    );
    typia.assert(page2);
    TestValidator.equals("page 2 current", page2.pagination.current, 2);
    TestValidator.predicate(
      "page 2 limit same as requested",
      page2.pagination.limit === 10,
    );
  }
  // Test 5: Search functionality - search by title keyword
  // First get a post to extract a keyword from its title
  if (firstPage.data.length > 0) {
    const samplePost = firstPage.data[0];
    const searchKeyword = samplePost.title.substring(
      0,
      Math.min(5, samplePost.title.length),
    );
    if (searchKeyword.length >= 2) {
      const searchResults =
        await api.functional.redditPlatform.feeds.popular.index(
          guestConnection,
          {
            body: {
              page: 1,
              limit: 20,
              sort_by: "new",
              search: searchKeyword,
            } satisfies IRedditPlatformPost.IRequest,
          },
        );
      typia.assert(searchResults);
      TestValidator.equals(
        "search results current page",
        searchResults.pagination.current,
        1,
      );
      TestValidator.equals(
        "search results limit",
        searchResults.pagination.limit,
        20,
      );
      // Verify all returned posts match the search keyword (case-insensitive)
      const allMatchKeyword = searchResults.data.every((post) =>
        post.title.toLowerCase().includes(searchKeyword.toLowerCase()),
      );
      TestValidator.predicate(
        "all search results match keyword",
        allMatchKeyword,
      );
    }
  }
  // Test 6: Search with pagination (if enough search results exist)
  const searchPage1 = await api.functional.redditPlatform.feeds.popular.index(
    guestConnection,
    {
      body: {
        page: 1,
        limit: 10,
        sort_by: "new",
        search: "the",
      } satisfies IRedditPlatformPost.IRequest,
    },
  );
  typia.assert(searchPage1);
  TestValidator.equals(
    "search page 1 current",
    searchPage1.pagination.current,
    1,
  );
  TestValidator.equals("search page 1 limit", searchPage1.pagination.limit, 10);
  if (searchPage1.pagination.records > 10) {
    const searchPage2 = await api.functional.redditPlatform.feeds.popular.index(
      guestConnection,
      {
        body: {
          page: 2,
          limit: 10,
          sort_by: "new",
          search: "the",
        } satisfies IRedditPlatformPost.IRequest,
      },
    );
    typia.assert(searchPage2);
    TestValidator.equals(
      "search page 2 current",
      searchPage2.pagination.current,
      2,
    );
    TestValidator.equals(
      "search page 2 limit",
      searchPage2.pagination.limit,
      10,
    );
    // Verify pagination metadata consistency
    TestValidator.equals(
      "search total records consistent",
      searchPage1.pagination.records,
      searchPage2.pagination.records,
    );
  }
  // Test 7: Different sort options with search
  const hotSearchResults =
    await api.functional.redditPlatform.feeds.popular.index(guestConnection, {
      body: {
        page: 1,
        limit: 20,
        sort_by: "hot",
        search: "the",
      } satisfies IRedditPlatformPost.IRequest,
    });
  typia.assert(hotSearchResults);
  TestValidator.equals(
    "hot search current",
    hotSearchResults.pagination.current,
    1,
  );
  TestValidator.equals(
    "hot search limit",
    hotSearchResults.pagination.limit,
    20,
  );
  // Test 8: Test with top sorting and time filter
  const topSearchResults =
    await api.functional.redditPlatform.feeds.popular.index(guestConnection, {
      body: {
        page: 1,
        limit: 20,
        sort_by: "top",
        time_filter: "all_time",
        search: "the",
      } satisfies IRedditPlatformPost.IRequest,
    });
  typia.assert(topSearchResults);
  TestValidator.equals(
    "top search current",
    topSearchResults.pagination.current,
    1,
  );
  TestValidator.equals(
    "top search limit",
    topSearchResults.pagination.limit,
    20,
  );
  // Test 9: Test controversial sorting with search
  const controversialSearchResults =
    await api.functional.redditPlatform.feeds.popular.index(guestConnection, {
      body: {
        page: 1,
        limit: 20,
        sort_by: "controversial",
        search: "the",
      } satisfies IRedditPlatformPost.IRequest,
    });
  typia.assert(controversialSearchResults);
  TestValidator.equals(
    "controversial search current",
    controversialSearchResults.pagination.current,
    1,
  );
  TestValidator.equals(
    "controversial search limit",
    controversialSearchResults.pagination.limit,
    20,
  );
  // Test 10: Verify post summary structure
  if (firstPage.data.length > 0) {
    const post = firstPage.data[0];
    typia.assert(post);
    TestValidator.predicate("has valid id", post.id.length > 0);
    TestValidator.predicate("has title", post.title.length > 0);
    TestValidator.predicate("has author", post.author !== null);
    TestValidator.predicate("has community", post.community !== null);
    TestValidator.predicate("has vote score", post.vote_score >= 0);
    TestValidator.predicate("has comment count", post.comment_count >= 0);
    TestValidator.predicate("has created_at", post.created_at.length > 0);
    TestValidator.predicate("has post_type", post.post_type.length > 0);
    TestValidator.predicate("has preview", post.preview.length >= 0);
  }
}