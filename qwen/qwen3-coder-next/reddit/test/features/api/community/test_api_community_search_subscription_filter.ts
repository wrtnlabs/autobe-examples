import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneCommunity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_search_subscription_filter(
  connection: api.IConnection,
): Promise<void> {
  // Test community search API with subscription status filtering
  // Since no user/community/subscription creation endpoints are available,
  // we test the search API contract and parameter handling
  // Test 1: Search with 'all' subscription status
  const allSearchResult = await api.functional.redditClone.communities.index(
    connection,
    {
      body: {
        subscriptionStatus: "all" as const,
        page: 1,
        limit: 20,
      },
    },
  );
  typia.assert(allSearchResult);
  // Validate response structure
  TestValidator.predicate("all search returns paginated data", () => {
    return (
      allSearchResult.data !== undefined &&
      Array.isArray(allSearchResult.data) &&
      allSearchResult.pagination !== undefined
    );
  });
  // Test 2: Search with 'subscribed' subscription status
  const subscribedSearchResult =
    await api.functional.redditClone.communities.index(connection, {
      body: {
        subscriptionStatus: "subscribed" as const,
        page: 1,
        limit: 20,
      },
    });
  typia.assert(subscribedSearchResult);
  // Test 3: Search with 'notSubscribed' subscription status
  const notSubscribedSearchResult =
    await api.functional.redditClone.communities.index(connection, {
      body: {
        subscriptionStatus: "notSubscribed" as const,
        page: 1,
        limit: 20,
      },
    });
  typia.assert(notSubscribedSearchResult);
  // Test 4: Verify pagination works correctly
  const paginatedResult = await api.functional.redditClone.communities.index(
    connection,
    {
      body: {
        subscriptionStatus: "all" as const,
        page: 1,
        limit: 5,
      },
    },
  );
  typia.assert(paginatedResult);
  // Validate pagination structure
  TestValidator.predicate("pagination has correct structure", () => {
    return (
      paginatedResult.pagination.current !== undefined &&
      paginatedResult.pagination.limit !== undefined &&
      paginatedResult.pagination.records !== undefined &&
      paginatedResult.pagination.pages !== undefined
    );
  });
  // Test 5: Search with additional parameters (search term, sort)
  const advancedSearchResult =
    await api.functional.redditClone.communities.index(connection, {
      body: {
        search: "test",
        subscriptionStatus: "all" as const,
        sort: "popularity" as const,
        page: 1,
        limit: 10,
      },
    });
  typia.assert(advancedSearchResult);
  // Test 6: Edge case - empty search results
  const emptySearchResult = await api.functional.redditClone.communities.index(
    connection,
    {
      body: {
        search: "nonexistentcommunity12345",
        subscriptionStatus: "all" as const,
        page: 1,
        limit: 10,
      },
    },
  );
  typia.assert(emptySearchResult);
  // Validate empty results still have correct pagination structure
  TestValidator.equals(
    "empty search has zero records",
    emptySearchResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty search has zero pages",
    emptySearchResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty search returns empty array",
    emptySearchResult.data.length,
    0,
  );
}
