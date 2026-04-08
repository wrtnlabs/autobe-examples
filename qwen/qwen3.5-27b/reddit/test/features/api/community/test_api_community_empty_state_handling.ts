import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneCommunity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test the system's handling of empty community lists and search results.
 *
 * Validates that the community listing endpoint properly handles empty states in two scenarios: when no communities exist on the platform at all, and when searching for a non-existent community name. Ensures that pagination metadata correctly reflects zero results and that the response structure remains consistent.
 *
 * 1. Calls the community listing endpoint with an empty search to retrieve all communities.
 * 2. Verifies the response has empty data array and pagination shows 0 records and 0 pages.
 * 3. Calls the endpoint with a search term that doesn't match any communities.
 * 4. Verifies the empty search result also returns proper pagination metadata with 0 records.
 * 5. Confirms response structure is valid and consistent in both empty state scenarios.
 */
export async function test_api_community_empty_state_handling(
  connection: api.IConnection,
) {
  // 1. Test empty community list (no communities exist)
  const emptyListResponse = await api.functional.redditClone.communities.index(
    connection,
    {
      body: {} satisfies IRedditCloneCommunity.IRequest,
    },
  );
  typia.assert(emptyListResponse);
  // Verify empty list structure
  TestValidator.equals("data array is empty", emptyListResponse.data.length, 0);
  TestValidator.equals(
    "current page is 1",
    emptyListResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "records count is 0",
    emptyListResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "pages count is 0",
    emptyListResponse.pagination.pages,
    0,
  );
  TestValidator.predicate(
    "limit is positive",
    emptyListResponse.pagination.limit > 0,
  );
  // 2. Test search for non-existent community
  const nonExistentSearchTerm = "nonexistent_community_xyz_12345";
  const searchResponse = await api.functional.redditClone.communities.index(
    connection,
    {
      body: {
        search: nonExistentSearchTerm,
      } satisfies IRedditCloneCommunity.IRequest,
    },
  );
  typia.assert(searchResponse);
  // Verify empty search result structure
  TestValidator.equals(
    "search data array is empty",
    searchResponse.data.length,
    0,
  );
  TestValidator.equals(
    "search current page is 1",
    searchResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "search records count is 0",
    searchResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "search pages count is 0",
    searchResponse.pagination.pages,
    0,
  );
  TestValidator.predicate(
    "search limit is positive",
    searchResponse.pagination.limit > 0,
  );
  // 3. Verify response structure consistency
  TestValidator.equals(
    "pagination structure consistent",
    Object.keys(emptyListResponse.pagination).length,
    Object.keys(searchResponse.pagination).length,
  );
}
