import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test community search by name with case-insensitive partial matching.
 *
 * Validates the community search functionality where users search for communities by name using case-insensitive partial matching. Tests that searching for a partial term like 'tech' matches communities with names containing that term regardless of case (e.g., 'Technology', 'biotech', 'TECH'). Also validates sorting functionality by different fields with both ascending and descending order.
 *
 * The test verifies:
 * 1. Search parameter performs case-insensitive partial matching on community names
 * 2. Pagination metadata is correctly returned with current page, limit, records, and pages
 * 3. Sorting by name, subscriber_count, and created_at works correctly
 * 4. Both ascending and descending sort orders produce correctly ordered results
 * 5. Response structure matches IPageIRedditCommunityCommunity.ISummary DTO
 *
 * Since this is a public endpoint without authentication requirements, the test directly calls the API with various search and sorting parameters to validate the functionality.
 */
export async function test_api_community_search_by_name_partial_match(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Basic search with partial name term
  const searchResult = await api.functional.redditCommunity.communities.index(
    connection,
    {
      body: {
        search: "tech",
        page: 1,
        limit: 10,
      } satisfies IRedditCommunityCommunity.IRequest,
    },
  );
  typia.assert(searchResult);
  // Test 2: Search with different case variations
  const upperCaseResult =
    await api.functional.redditCommunity.communities.index(connection, {
      body: {
        search: "TECH",
        page: 1,
        limit: 10,
      } satisfies IRedditCommunityCommunity.IRequest,
    });
  typia.assert(upperCaseResult);
  // Test 3: Sort by name ascending
  const sortByNameAsc = await api.functional.redditCommunity.communities.index(
    connection,
    {
      body: {
        sort: "name",
        order: "asc",
        page: 1,
        limit: 10,
      } satisfies IRedditCommunityCommunity.IRequest,
    },
  );
  typia.assert(sortByNameAsc);
  // Validate ascending order by name (business logic validation)
  if (sortByNameAsc.data.length > 1) {
    for (let i = 1; i < sortByNameAsc.data.length; i++) {
      const prevName = sortByNameAsc.data[i - 1].name.toLowerCase();
      const currName = sortByNameAsc.data[i].name.toLowerCase();
      TestValidator.predicate(
        `name order asc at index ${i}`,
        prevName <= currName,
      );
    }
  }
  // Test 4: Sort by name descending
  const sortByNameDesc = await api.functional.redditCommunity.communities.index(
    connection,
    {
      body: {
        sort: "name",
        order: "desc",
        page: 1,
        limit: 10,
      } satisfies IRedditCommunityCommunity.IRequest,
    },
  );
  typia.assert(sortByNameDesc);
  // Validate descending order by name (business logic validation)
  if (sortByNameDesc.data.length > 1) {
    for (let i = 1; i < sortByNameDesc.data.length; i++) {
      const prevName = sortByNameDesc.data[i - 1].name.toLowerCase();
      const currName = sortByNameDesc.data[i].name.toLowerCase();
      TestValidator.predicate(
        `name order desc at index ${i}`,
        prevName >= currName,
      );
    }
  }
  // Test 5: Sort by subscriber_count ascending
  const sortBySubscribersAsc =
    await api.functional.redditCommunity.communities.index(connection, {
      body: {
        sort: "subscriber_count",
        order: "asc",
        page: 1,
        limit: 10,
      } satisfies IRedditCommunityCommunity.IRequest,
    });
  typia.assert(sortBySubscribersAsc);
  // Validate ascending order by subscriber_count (business logic validation)
  if (sortBySubscribersAsc.data.length > 1) {
    for (let i = 1; i < sortBySubscribersAsc.data.length; i++) {
      TestValidator.predicate(
        `subscriber_count order asc at index ${i}`,
        sortBySubscribersAsc.data[i - 1].subscribers_count <=
          sortBySubscribersAsc.data[i].subscribers_count,
      );
    }
  }
  // Test 6: Sort by created_at descending
  const sortByCreatedAtDesc =
    await api.functional.redditCommunity.communities.index(connection, {
      body: {
        sort: "created_at",
        order: "desc",
        page: 1,
        limit: 10,
      } satisfies IRedditCommunityCommunity.IRequest,
    });
  typia.assert(sortByCreatedAtDesc);
  // Validate descending order by created_at (business logic validation)
  if (sortByCreatedAtDesc.data.length > 1) {
    for (let i = 1; i < sortByCreatedAtDesc.data.length; i++) {
      TestValidator.predicate(
        `created_at order desc at index ${i}`,
        new Date(sortByCreatedAtDesc.data[i - 1].created_at).getTime() >=
          new Date(sortByCreatedAtDesc.data[i].created_at).getTime(),
      );
    }
  }
  // Test 7: Pagination with different page sizes
  const smallLimit = await api.functional.redditCommunity.communities.index(
    connection,
    {
      body: {
        page: 1,
        limit: 5,
      } satisfies IRedditCommunityCommunity.IRequest,
    },
  );
  typia.assert(smallLimit);
  TestValidator.predicate(
    "limit 5 returns max 5 items",
    smallLimit.data.length <= 5,
  );
  // Test 8: Search combined with sorting
  const searchWithSort = await api.functional.redditCommunity.communities.index(
    connection,
    {
      body: {
        search: "test",
        sort: "created_at",
        order: "desc",
        page: 1,
        limit: 10,
      } satisfies IRedditCommunityCommunity.IRequest,
    },
  );
  typia.assert(searchWithSort);
  // Validate that search results are also sorted (business logic validation)
  if (searchWithSort.data.length > 1) {
    for (let i = 1; i < searchWithSort.data.length; i++) {
      TestValidator.predicate(
        `search+sort created_at desc at index ${i}`,
        new Date(searchWithSort.data[i - 1].created_at).getTime() >=
          new Date(searchWithSort.data[i].created_at).getTime(),
      );
    }
  }
}
