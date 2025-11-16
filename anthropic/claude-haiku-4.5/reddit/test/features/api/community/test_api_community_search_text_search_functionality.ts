import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";

/**
 * Test community discovery with text search filter functionality.
 *
 * Validates text-based search across community names and identifiers,
 * including:
 *
 * - Exact and partial matching behavior
 * - Case-insensitive search handling
 * - Empty result sets with correct pagination metadata
 * - Special characters and boundary conditions in search terms
 *
 * This test ensures users can discover communities through flexible keyword
 * searching.
 */
export async function test_api_community_search_text_search_functionality(
  connection: api.IConnection,
) {
  // Test 1: Basic search with a common keyword
  const searchKeyword = "tech";
  const searchResult1: IPageICommunityPlatformCommunity.ISummary =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        search: searchKeyword,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(searchResult1);
  TestValidator.predicate(
    "search results contain valid pagination metadata",
    searchResult1.pagination.current >= 0 &&
      searchResult1.pagination.limit > 0 &&
      searchResult1.pagination.records >= 0 &&
      searchResult1.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "all search results match the search term in name or identifier",
    searchResult1.data.every(
      (c) =>
        c.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        c.identifier.toLowerCase().includes(searchKeyword.toLowerCase()),
    ),
  );

  // Test 2: Case-insensitive search comparison
  const searchTermUpper = "TECHNOLOGY";
  const resultUpper: IPageICommunityPlatformCommunity.ISummary =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        search: searchTermUpper,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(resultUpper);

  const searchTermLower = "technology";
  const resultLower: IPageICommunityPlatformCommunity.ISummary =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        search: searchTermLower,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(resultLower);

  TestValidator.equals(
    "case-insensitive search returns same number of results",
    resultUpper.data.length,
    resultLower.data.length,
  );

  // Test 3: Non-matching search term returns empty results
  const nonMatchingTerm = "xyz_nonexistent_" + RandomGenerator.alphaNumeric(12);
  const emptySearchResult: IPageICommunityPlatformCommunity.ISummary =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        search: nonMatchingTerm,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(emptySearchResult);
  TestValidator.equals(
    "non-matching search returns empty data array",
    emptySearchResult.data.length,
    0,
  );
  TestValidator.predicate(
    "pagination metadata is valid in empty search results",
    emptySearchResult.pagination.records >= 0 &&
      emptySearchResult.pagination.limit > 0 &&
      emptySearchResult.pagination.pages >= 0,
  );

  // Test 4: Partial matching behavior
  const partialSearchTerm = "learn";
  const partialResult: IPageICommunityPlatformCommunity.ISummary =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        search: partialSearchTerm,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(partialResult);
  TestValidator.predicate(
    "partial search matches communities containing the term",
    partialResult.data.every(
      (c) =>
        c.name.toLowerCase().includes(partialSearchTerm) ||
        c.identifier.toLowerCase().includes(partialSearchTerm),
    ),
  );

  // Test 5: Search with special characters
  const specialCharTerm = "test-community";
  const specialCharResult: IPageICommunityPlatformCommunity.ISummary =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        search: specialCharTerm,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(specialCharResult);
  TestValidator.predicate(
    "search with special characters handled gracefully",
    Array.isArray(specialCharResult.data),
  );

  // Test 6: Pagination limit and offset parameters with search
  const paginatedSearch: IPageICommunityPlatformCommunity.ISummary =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        search: "community",
        limit: 10,
        offset: 0,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(paginatedSearch);
  TestValidator.predicate(
    "pagination parameters respected in search results",
    paginatedSearch.data.length <= 10,
  );

  // Test 7: Search with minimum length boundary
  const minLengthSearch = "a";
  const minLengthResult: IPageICommunityPlatformCommunity.ISummary =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        search: minLengthSearch,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(minLengthResult);
  TestValidator.predicate(
    "minimum length search term processed successfully",
    Array.isArray(minLengthResult.data),
  );

  // Test 8: Search matches across both name and identifier fields
  const fieldSearchTerm = "sci";
  const fieldSearchResult: IPageICommunityPlatformCommunity.ISummary =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        search: fieldSearchTerm,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(fieldSearchResult);
  TestValidator.predicate(
    "search filters across both name and identifier fields",
    fieldSearchResult.data.every(
      (c) =>
        c.name.toLowerCase().includes(fieldSearchTerm) ||
        c.identifier.toLowerCase().includes(fieldSearchTerm),
    ),
  );
}
