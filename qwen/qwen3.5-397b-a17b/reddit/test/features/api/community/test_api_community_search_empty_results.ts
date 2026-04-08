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
 * Test community search endpoint edge cases with empty results.
 *
 * Validates that the community search and browsing endpoint handles scenarios where no matching communities are found. Tests two distinct cases: searching with a non-matching term and browsing when no communities exist in the system. Both scenarios should return empty data arrays with accurate pagination metadata showing zero records and zero pages.
 *
 * The endpoint must gracefully handle these edge cases without throwing errors, providing consistent pagination information even when the result set is empty. This ensures frontend applications can properly display "no results" states and pagination controls.
 *
 * 1. Search with non-matching term: Submit a unique search query that won't match any community names. Verify empty data array and pagination metadata with zero records and pages.
 * 2. Browse all communities: Call endpoint without search parameter. Verify response structure is valid with proper pagination metadata. When no communities exist, validates zero counts.
 */
export async function test_api_community_search_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Search with non-matching term
  const uniqueSearchTerm = `nonexistent_community_${RandomGenerator.alphaNumeric(12)}`;
  const searchResult: IPageIRedditCommunityCommunity.ISummary =
    await api.functional.redditCommunity.communities.index(connection, {
      body: {
        search: uniqueSearchTerm,
        page: 1,
        limit: 10,
      } satisfies IRedditCommunityCommunity.IRequest,
    });
  typia.assert(searchResult);
  TestValidator.equals(
    "search returns empty data",
    searchResult.data.length,
    0,
  );
  TestValidator.equals(
    "search records count",
    searchResult.pagination.records,
    0,
  );
  TestValidator.equals("search pages count", searchResult.pagination.pages, 0);
  TestValidator.equals(
    "search current page",
    searchResult.pagination.current,
    1,
  );
  TestValidator.equals("search limit", searchResult.pagination.limit, 10);
  // Test 2: Browse all communities (no search filter)
  const browseResult: IPageIRedditCommunityCommunity.ISummary =
    await api.functional.redditCommunity.communities.index(connection, {
      body: {
        page: 1,
        limit: 20,
      } satisfies IRedditCommunityCommunity.IRequest,
    });
  typia.assert(browseResult);
  // Validate response structure
  TestValidator.predicate(
    "browse data is array",
    Array.isArray(browseResult.data),
  );
  TestValidator.predicate(
    "browse current page >= 1",
    browseResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "browse limit >= 1",
    browseResult.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "browse records >= 0",
    browseResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "browse pages >= 0",
    browseResult.pagination.pages >= 0,
  );
  // Validate pagination consistency when no records exist
  if (browseResult.pagination.records === 0) {
    TestValidator.equals(
      "browse empty data length",
      browseResult.data.length,
      0,
    );
    TestValidator.equals(
      "browse empty pages count",
      browseResult.pagination.pages,
      0,
    );
  }
  // Validate data array length matches records when records > 0
  if (browseResult.pagination.records > 0) {
    TestValidator.predicate(
      "browse data length within limit",
      browseResult.data.length <= browseResult.pagination.limit,
    );
  }
}
