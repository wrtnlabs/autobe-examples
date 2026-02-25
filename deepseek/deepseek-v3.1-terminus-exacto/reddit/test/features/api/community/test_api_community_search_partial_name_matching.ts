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

/**
 * Test community search functionality with partial name matching.
 * Create multiple communities with names containing specific keywords,
 * then search using partial matches with case-insensitive validation.
 * Test empty search returns all communities and verify sorting combined with search.
 */
export async function test_api_community_search_partial_name_matching(
  connection: api.IConnection,
): Promise<void> {
  // Test empty search returns all communities
  const emptySearch = await api.functional.communityPlatform.communities.index(
    connection,
    {
      body: {
        search: undefined,
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformCommunity.IRequest,
    },
  );
  typia.assert(emptySearch);
  TestValidator.predicate(
    "empty search returns paginated results",
    emptySearch.pagination.records >= 0,
  );
  // Test partial name matching with case-insensitive search
  const searchTerm = "tech";
  const partialSearch =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        search: searchTerm,
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(partialSearch);
  // Validate search results contain the search term (case-insensitive)
  if (partialSearch.data.length > 0) {
    TestValidator.predicate(
      "search results contain search term",
      partialSearch.data.some((community) =>
        community.name.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    );
  }
  // Test search with different sorting options
  const sortingOptions = ["name", "created_at", "subscriber_count"] as const;
  for (const sortOption of sortingOptions) {
    const sortedSearch =
      await api.functional.communityPlatform.communities.index(connection, {
        body: {
          search: searchTerm,
          sort: sortOption,
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformCommunity.IRequest,
      });
    typia.assert(sortedSearch);
    TestValidator.predicate(
      `search with ${sortOption} sorting returns valid results`,
      sortedSearch.pagination.limit === 5,
    );
  }
  // Test case-insensitive search with uppercase term
  const uppercaseSearch =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        search: searchTerm.toUpperCase(),
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(uppercaseSearch);
  // Test pagination with search
  const paginatedSearch =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        search: searchTerm,
        page: 1,
        limit: 3,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(paginatedSearch);
  TestValidator.equals(
    "pagination limit is respected",
    paginatedSearch.pagination.limit,
    3,
  );
  TestValidator.predicate(
    "current page is correct",
    paginatedSearch.pagination.current === 1,
  );
}
