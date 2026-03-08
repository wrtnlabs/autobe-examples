import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunity";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test community search functionality with various filters, sorting options, and pagination.
 *
 * This test validates the community search endpoint's ability to:
 * 1. Filter communities by search term
 * 2. Sort results by different criteria (subscribers, newest, alpha)
 * 3. Support pagination with configurable limit values
 * 4. Return properly structured responses matching DTO specifications
 */
export async function test_api_community_search_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Basic search with search term
  const searchResult = await api.functional.redditLike.communities.search(
    connection,
    {
      body: {
        search: RandomGenerator.alphabets(3),
        sort: "subscribers",
        subscriptionStatus: "all",
        page: 1,
        limit: 10,
      } satisfies IRedditLikeCommunity.IRequest,
    },
  );
  typia.assert(searchResult);
  TestValidator.predicate(
    "search returns valid response structure",
    searchResult.pagination !== undefined && searchResult.data !== undefined,
  );
  // Test 2: Search with different sorting methods
  const newestResult = await api.functional.redditLike.communities.search(
    connection,
    {
      body: {
        sort: "newest",
        subscriptionStatus: "all",
        page: 1,
        limit: 10,
      } satisfies IRedditLikeCommunity.IRequest,
    },
  );
  typia.assert(newestResult);
  // Test 3: Search with alphabetical sorting
  const alphaResult = await api.functional.redditLike.communities.search(
    connection,
    {
      body: {
        sort: "alpha",
        subscriptionStatus: "all",
        page: 1,
        limit: 10,
      } satisfies IRedditLikeCommunity.IRequest,
    },
  );
  typia.assert(alphaResult);
  // Test 4: Search with pagination
  const paginationResult = await api.functional.redditLike.communities.search(
    connection,
    {
      body: {
        page: 1,
        limit: 3,
        sort: "subscribers",
        subscriptionStatus: "all",
      } satisfies IRedditLikeCommunity.IRequest,
    },
  );
  typia.assert(paginationResult);
  TestValidator.equals("pagination limit", paginationResult.data.length, 3);
  TestValidator.equals(
    "pagination current page",
    paginationResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    paginationResult.pagination.limit,
    3,
  );
  // Test 5: Boundary value - minimum limit (1)
  const minLimitResult = await api.functional.redditLike.communities.search(
    connection,
    {
      body: {
        limit: 1,
        sort: "subscribers",
        subscriptionStatus: "all",
        page: 1,
      } satisfies IRedditLikeCommunity.IRequest,
    },
  );
  typia.assert(minLimitResult);
  TestValidator.equals("min limit", minLimitResult.data.length, 1);
  // Test 6: Boundary value - maximum limit (100)
  const maxLimitResult = await api.functional.redditLike.communities.search(
    connection,
    {
      body: {
        limit: 100,
        sort: "subscribers",
        subscriptionStatus: "all",
        page: 1,
      } satisfies IRedditLikeCommunity.IRequest,
    },
  );
  typia.assert(maxLimitResult);
  TestValidator.predicate(
    "max limit respects boundary",
    maxLimitResult.data.length <= 100,
  );
  // Test 7: Search with different subscription status filters
  const subscribedResult = await api.functional.redditLike.communities.search(
    connection,
    {
      body: {
        subscriptionStatus: "subscribed",
        sort: "subscribers",
        page: 1,
        limit: 10,
      } satisfies IRedditLikeCommunity.IRequest,
    },
  );
  typia.assert(subscribedResult);
  // Test 8: Search with "unsubscribed" subscription status
  const unsubscribedResult = await api.functional.redditLike.communities.search(
    connection,
    {
      body: {
        subscriptionStatus: "unsubscribed",
        sort: "subscribers",
        page: 1,
        limit: 10,
      } satisfies IRedditLikeCommunity.IRequest,
    },
  );
  typia.assert(unsubscribedResult);
}
