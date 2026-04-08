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
 * Test popular feed pagination flow with page-based pagination.
 *
 * Validates the pagination functionality of the popular feed endpoint, ensuring correct page retrieval, metadata accuracy, and proper handling of edge cases across multiple pagination requests.
 *
 * The test verifies that pagination maintains consistent ordering, correctly limits results per page, and handles requests beyond available pages appropriately. Different limit values are tested to confirm proper page size control.
 *
 * 1. Request first page with default parameters and validate response structure.
 * 2. Request second page using page parameter and verify correct data retrieval.
 * 3. Test pagination with various limit values (1, 10, 50, 100).
 * 4. Verify pagination metadata accuracy (current page, limit, records, pages).
 * 5. Test requesting beyond available pages returns empty data array.
 * 6. Test cursor parameter is accepted (even if not fully testable without cursor in response).
 * 7. Test search parameter interaction with pagination.
 */
export async function test_api_popular_feed_pagination_flow(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: First page request with default parameters
  const firstPage = await api.functional.redditLike.feeds.popular.index(
    connection,
    {
      body: {
        limit: 10,
        sort: "hot",
      } satisfies IRedditLikePopularFeed.IRequest,
    },
  );
  typia.assert(firstPage);
  // Validate first page structure
  TestValidator.equals("first page current", firstPage.pagination.current, 1);
  TestValidator.equals("first page limit", firstPage.pagination.limit, 10);
  TestValidator.predicate(
    "first page has valid records",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "first page has valid pages",
    firstPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "first page data is array",
    Array.isArray(firstPage.data),
  );
  // Test 2: Second page request using page parameter
  const secondPage = await api.functional.redditLike.feeds.popular.index(
    connection,
    {
      body: {
        page: 2,
        limit: 10,
        sort: "hot",
      } satisfies IRedditLikePopularFeed.IRequest,
    },
  );
  typia.assert(secondPage);
  // Validate second page
  TestValidator.equals("second page current", secondPage.pagination.current, 2);
  TestValidator.equals("second page limit", secondPage.pagination.limit, 10);
  // Test 3: Verify no duplicate posts between pages (if both have data)
  if (firstPage.data.length > 0 && secondPage.data.length > 0) {
    const firstPageIds = new Set(firstPage.data.map((post) => post.id));
    const secondPageIds = new Set(secondPage.data.map((post) => post.id));
    const duplicates = firstPage.data.filter((post) =>
      secondPageIds.has(post.id),
    );
    TestValidator.equals(
      "no duplicate posts between pages",
      duplicates.length,
      0,
    );
  }
  // Test 4: Test with different limit values
  const limitValues = [1, 10, 50, 100] as const;
  for (const limit of limitValues) {
    const pageWithLimit = await api.functional.redditLike.feeds.popular.index(
      connection,
      {
        body: {
          limit,
          sort: "new",
        } satisfies IRedditLikePopularFeed.IRequest,
      },
    );
    typia.assert(pageWithLimit);
    TestValidator.equals(
      `limit ${limit} matches`,
      pageWithLimit.pagination.limit,
      limit,
    );
    TestValidator.predicate(
      `limit ${limit} respects page size`,
      pageWithLimit.data.length <= limit,
    );
  }
  // Test 5: Test requesting beyond available pages
  const emptyPage = await api.functional.redditLike.feeds.popular.index(
    connection,
    {
      body: {
        page: 9999,
        limit: 10,
        sort: "hot",
      } satisfies IRedditLikePopularFeed.IRequest,
    },
  );
  typia.assert(emptyPage);
  TestValidator.equals(
    "beyond pages returns empty data",
    emptyPage.data.length,
    0,
  );
  TestValidator.predicate(
    "beyond pages has valid pagination",
    emptyPage.pagination.pages >= 0,
  );
  // Test 6: Test cursor parameter is accepted (cursor-based pagination)
  // Note: Since response doesn't include cursor token, we test that API accepts cursor parameter
  const cursorPage = await api.functional.redditLike.feeds.popular.index(
    connection,
    {
      body: {
        cursor: typia.random<string>(),
        limit: 10,
        sort: "hot",
      } satisfies IRedditLikePopularFeed.IRequest,
    },
  );
  typia.assert(cursorPage);
  TestValidator.predicate(
    "cursor parameter accepted",
    cursorPage.pagination.current >= 1,
  );
  // Test 7: Test with search parameter
  const searchPage = await api.functional.redditLike.feeds.popular.index(
    connection,
    {
      body: {
        search: "test",
        limit: 10,
        sort: "hot",
      } satisfies IRedditLikePopularFeed.IRequest,
    },
  );
  typia.assert(searchPage);
  TestValidator.predicate(
    "search returns valid page",
    searchPage.pagination.current >= 1,
  );
  // Test 8: Verify pagination metadata consistency
  TestValidator.equals(
    "pages calculation correct",
    Math.ceil(firstPage.pagination.records / firstPage.pagination.limit),
    firstPage.pagination.pages,
  );
}
