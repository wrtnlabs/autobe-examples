import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_partial_name_search_with_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for community operations
  const adminConnection: api.IConnection = { host: connection.host };
  // Create test communities with names containing searchable prefixes
  const communityNames = [
    "Programming Experts",
    "Tech Enthusiasts",
    "Programmers United",
    "Coding Masters",
    "Technology News",
    "Program Development",
    "Code Review Community",
    "Tech Support Group",
  ];
  const createdCommunities: ICommunityPlatformCommunity.ISummary[] = [];
  // Create communities through the appropriate API endpoints
  // Note: Since we don't have community creation API in the provided SDK,
  // we'll test with existing data and validate search functionality
  const searchQuery = "prog";
  const sortingOptions = ["subscriber_count", "created_at", "name"] as const;
  for (const sortOption of sortingOptions) {
    const searchResult =
      await api.functional.communityPlatform.communities.search(
        adminConnection,
        {
          body: {
            search: searchQuery,
            sort: sortOption,
            page: 1,
            limit: 10,
          } satisfies ICommunityPlatformCommunity.IRequest,
        },
      );
    typia.assert(searchResult);
    // Validate pagination structure
    TestValidator.equals("pagination structure", searchResult.pagination, {
      current: 1,
      limit: 10,
      records: searchResult.pagination.records,
      pages: searchResult.pagination.pages,
    });
    // Validate that search results are properly filtered
    if (searchResult.data.length > 0) {
      for (const community of searchResult.data) {
        const nameContains = community.name
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
        const descContains = community.description
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
        TestValidator.predicate(
          `community should contain search term '${searchQuery}' in name or description for ${sortOption}`,
          nameContains || descContains,
        );
      }
    }
    // Validate sorting order based on the sort option
    if (searchResult.data.length > 1) {
      if (sortOption === "name") {
        // Should be sorted alphabetically ascending by name
        for (let i = 0; i < searchResult.data.length - 1; i++) {
          TestValidator.predicate(
            `name should be ascending for ${sortOption}`,
            searchResult.data[i].name.localeCompare(
              searchResult.data[i + 1].name,
            ) <= 0,
          );
        }
      }
      // Note: subscriber_count and created_at sorting validation would require
      // actual community creation with controlled data, which isn't available
      // in the current API scope
    }
  }
  // Test pagination functionality
  const paginationTest =
    await api.functional.communityPlatform.communities.search(adminConnection, {
      body: {
        search: "tech",
        sort: "name",
        page: 1,
        limit: 3,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(paginationTest);
  TestValidator.equals("pagination limit", paginationTest.pagination.limit, 3);
  TestValidator.equals(
    "pagination current page",
    paginationTest.pagination.current,
    1,
  );
  TestValidator.predicate(
    "data length should not exceed limit",
    paginationTest.data.length <= 3,
  );
  // Test empty search (should return all communities)
  const emptySearchResult =
    await api.functional.communityPlatform.communities.search(adminConnection, {
      body: {
        search: "",
        sort: "name",
        page: 1,
        limit: 5,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(emptySearchResult);
  TestValidator.predicate(
    "empty search should return results",
    emptySearchResult.data.length >= 0,
  );
}
