import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";

/**
 * Test community search behavior when no communities match the search criteria.
 *
 * This test validates that the community search API properly handles empty
 * result scenarios by returning a well-formed paginated response structure with
 * zero results. The API should gracefully return an empty data array with
 * correct pagination metadata rather than throwing errors or returning
 * malformed responses.
 *
 * Steps:
 *
 * 1. Generate a highly unique search query that won't match any existing
 *    communities
 * 2. Call the community search API with the non-matching query
 * 3. Validate response structure is correct and complete
 * 4. Verify pagination metadata shows zero records and zero pages
 * 5. Verify data array is empty
 * 6. Ensure no errors or exceptions occur during the process
 */
export async function test_api_community_search_empty_results(
  connection: api.IConnection,
) {
  // Generate a highly unique search string that is extremely unlikely to match any community
  const uniqueSearchQuery = `nonexistent_community_${typia.random<string & tags.Format<"uuid">>()}_${RandomGenerator.alphaNumeric(16)}`;

  // Search for communities with the non-matching query
  const searchResult: IPageIRedditCommunityCommunity.ISummary =
    await api.functional.redditCommunity.communities.index(connection, {
      body: {
        search: uniqueSearchQuery,
        page: 1,
        limit: 10,
      } satisfies IRedditCommunityCommunity.IRequest,
    });

  // Validate the response structure
  typia.assert(searchResult);

  // Verify pagination metadata shows zero results
  TestValidator.equals(
    "pagination records should be 0",
    searchResult.pagination.records,
    0,
  );

  TestValidator.equals(
    "pagination pages should be 0",
    searchResult.pagination.pages,
    0,
  );

  // Verify pagination current page is set correctly
  TestValidator.equals(
    "pagination current page should be 0",
    searchResult.pagination.current,
    0,
  );

  // Verify pagination limit is set correctly
  TestValidator.equals(
    "pagination limit should be 10",
    searchResult.pagination.limit,
    10,
  );

  // Verify the data array is empty
  TestValidator.equals(
    "data array should be empty",
    searchResult.data.length,
    0,
  );

  // Verify data is an array
  TestValidator.predicate(
    "data should be an array",
    Array.isArray(searchResult.data),
  );
}
