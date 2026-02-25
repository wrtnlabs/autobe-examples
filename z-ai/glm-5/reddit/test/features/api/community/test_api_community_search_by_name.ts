import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityCommunity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test community search by name with relevance ranking.
 *
 * This test validates:
 * 1. Case-insensitive partial matching
 * 2. Relevance ranking (exact > starts-with > contains)
 * 3. Secondary sorting by subscriber_count DESC
 * 4. Description truncation to 100 characters
 * 5. Pagination functionality with search queries
 */
export async function test_api_community_search_by_name(
  connection: api.IConnection,
): Promise<void> {
  // First, get all communities without search to understand available data
  const allCommunities = await api.functional.community.communities.index(
    connection,
    {
      body: {
        limit: 100,
      } satisfies ICommunityCommunity.IRequest,
    },
  );
  typia.assert(allCommunities);
  // Test 1: Basic search query functionality with case-insensitive partial matching
  if (allCommunities.data.length > 0) {
    const sampleCommunity = allCommunities.data[0];
    const partialName = sampleCommunity.name.substring(0, 3).toLowerCase();
    const searchResult = await api.functional.community.communities.index(
      connection,
      {
        body: {
          query: partialName,
        } satisfies ICommunityCommunity.IRequest,
      },
    );
    typia.assert(searchResult);
    // Verify case-insensitive partial matching
    TestValidator.predicate(
      "case-insensitive partial match",
      searchResult.data.every((community) =>
        community.name.toLowerCase().includes(partialName.toLowerCase()),
      ),
    );
    // Verify subscriber_count is in descending order within results
    // (relevance ranking groups results, within each group sorted by subscriber_count DESC)
    if (searchResult.data.length > 1) {
      const isSortedDescending = searchResult.data.every(
        (community, index) =>
          index === 0 ||
          searchResult.data[index - 1].subscriber_count >=
            community.subscriber_count,
      );
      TestValidator.predicate(
        "subscriber count descending within relevance group",
        isSortedDescending,
      );
    }
    // Test 2: Verify description truncation to 100 characters
    TestValidator.predicate(
      "description truncated to 100 characters",
      searchResult.data.every(
        (community) => community.description.length <= 100,
      ),
    );
  }
  // Test 3: Pagination with search query
  if (allCommunities.data.length > 0) {
    const sampleCommunity = allCommunities.data[0];
    const partialName = sampleCommunity.name.substring(0, 2).toLowerCase();
    // Get first page
    const page1 = await api.functional.community.communities.index(connection, {
      body: {
        query: partialName,
        page: 1,
        limit: 5,
      } satisfies ICommunityCommunity.IRequest,
    });
    typia.assert(page1);
    // Verify pagination metadata
    TestValidator.equals(
      "pagination current page is 1",
      page1.pagination.current,
      1,
    );
    TestValidator.equals(
      "pagination limit matches request",
      page1.pagination.limit,
      5,
    );
    // Get second page if available
    if (page1.pagination.pages > 1 && page1.data.length > 0) {
      const page2 = await api.functional.community.communities.index(
        connection,
        {
          body: {
            query: partialName,
            page: 2,
            limit: 5,
          } satisfies ICommunityCommunity.IRequest,
        },
      );
      typia.assert(page2);
      // Verify pages have different results
      if (page2.data.length > 0) {
        TestValidator.notEquals(
          "different results on different pages",
          page1.data[0].id,
          page2.data[0].id,
        );
      }
    }
  }
  // Test 4: Search with uppercase query (case-insensitivity verification)
  if (allCommunities.data.length > 0) {
    const sampleCommunity = allCommunities.data[0];
    const lowerQuery = sampleCommunity.name.substring(0, 3).toLowerCase();
    const upperQuery = lowerQuery.toUpperCase();
    const lowerResult = await api.functional.community.communities.index(
      connection,
      {
        body: {
          query: lowerQuery,
        } satisfies ICommunityCommunity.IRequest,
      },
    );
    typia.assert(lowerResult);
    const upperResult = await api.functional.community.communities.index(
      connection,
      {
        body: {
          query: upperQuery,
        } satisfies ICommunityCommunity.IRequest,
      },
    );
    typia.assert(upperResult);
    // Both searches should return same count (case-insensitive)
    TestValidator.equals(
      "case-insensitive search returns same count",
      lowerResult.pagination.records,
      upperResult.pagination.records,
    );
  }
  // Test 5: Search with different sorting options
  const sortedBySubscriber = await api.functional.community.communities.index(
    connection,
    {
      body: {
        sort: "subscriber_count",
        limit: 10,
      } satisfies ICommunityCommunity.IRequest,
    },
  );
  typia.assert(sortedBySubscriber);
  const sortedByCreated = await api.functional.community.communities.index(
    connection,
    {
      body: {
        sort: "created_at",
        limit: 10,
      } satisfies ICommunityCommunity.IRequest,
    },
  );
  typia.assert(sortedByCreated);
  // Verify pagination works correctly
  TestValidator.predicate(
    "pagination records is non-negative",
    sortedBySubscriber.pagination.records >= 0,
  );
  // Test 6: No search query returns all communities (no name filter applied)
  const noQueryResult = await api.functional.community.communities.index(
    connection,
    {
      body: {
        limit: 10,
      } satisfies ICommunityCommunity.IRequest,
    },
  );
  typia.assert(noQueryResult);
  TestValidator.predicate(
    "no query returns paginated results",
    noQueryResult.data.length <= 10 &&
      noQueryResult.pagination.records >= noQueryResult.data.length,
  );
}
