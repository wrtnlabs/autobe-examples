import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityUserProfiles } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityUserProfiles";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityUserProfiles } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfiles";

/**
 * Test user profile search behavior when no users match the specified criteria.
 * Validates graceful handling of empty result sets with appropriate pagination
 * structure.
 *
 * This comprehensive test ensures the user profile search API correctly handles
 * scenarios where search filters return no matching results. The test creates
 * multiple search queries with highly specific criteria that are unlikely to
 * match existing profiles, verifying:
 *
 * 1. Empty search results return proper pagination metadata (zero records, correct
 *    page info)
 * 2. Search using non-existent display name returns empty results
 * 3. Search using rare biographical terms returns empty results
 * 4. Search combining multiple restrictive filters returns empty results
 * 5. Pagination parameters work correctly with empty results
 * 6. Response structure remains consistent whether results are found or not
 *
 * The test demonstrates that the API maintains robust error handling and
 * graceful degradation when search criteria are too restrictive to find
 * matching profiles.
 */
export async function test_api_user_profile_search_empty_results_handling(
  connection: api.IConnection,
) {
  // Test 1: Search with non-existent display name
  const nonExistentDisplayName = "NonExistentUser123456789";
  const emptyResultsByDisplayName =
    await api.functional.redditCommunity.userProfiles.index(connection, {
      body: {
        display_name: nonExistentDisplayName,
        page: 1,
        limit: 20,
      } satisfies IRedditCommunityUserProfiles.IRequest,
    });
  typia.assert(emptyResultsByDisplayName);

  await TestValidator.equals(
    "empty results by display name - pagination current page",
    emptyResultsByDisplayName.pagination.current,
    1,
  );
  await TestValidator.equals(
    "empty results by display name - pagination records count",
    emptyResultsByDisplayName.pagination.records,
    0,
  );
  await TestValidator.equals(
    "empty results by display name - pagination pages",
    emptyResultsByDisplayName.pagination.pages,
    0,
  );
  await TestValidator.equals(
    "empty results by display name - data array length",
    emptyResultsByDisplayName.data.length,
    0,
  );

  // Test 2: Search with rare biographical terms that likely don't exist
  const rareBioTerms = "aardvark_xylophone_quantum_nebulous";
  const emptyResultsByBio =
    await api.functional.redditCommunity.userProfiles.index(connection, {
      body: {
        search: rareBioTerms,
        page: 1,
        limit: 10,
      } satisfies IRedditCommunityUserProfiles.IRequest,
    });
  typia.assert(emptyResultsByBio);

  await TestValidator.equals(
    "empty results by bio search - pagination current page",
    emptyResultsByBio.pagination.current,
    1,
  );
  await TestValidator.equals(
    "empty results by bio search - pagination records count",
    emptyResultsByBio.pagination.records,
    0,
  );
  await TestValidator.equals(
    "empty results by bio search - data array length",
    emptyResultsByBio.data.length,
    0,
  );

  // Test 3: Search with non-existent location
  const nonExistentLocation = "Atlantis_City_Underwater_Realm";
  const emptyResultsByLocation =
    await api.functional.redditCommunity.userProfiles.index(connection, {
      body: {
        location: nonExistentLocation,
        page: 1,
        limit: 5,
      } satisfies IRedditCommunityUserProfiles.IRequest,
    });
  typia.assert(emptyResultsByLocation);

  await TestValidator.equals(
    "empty results by location - pagination current page",
    emptyResultsByLocation.pagination.current,
    1,
  );
  await TestValidator.equals(
    "empty results by location - pagination records count",
    emptyResultsByLocation.pagination.records,
    0,
  );
  await TestValidator.equals(
    "empty results by location - data array length",
    emptyResultsByLocation.data.length,
    0,
  );

  // Test 4: Combine multiple restrictive filters that should return empty results
  const emptyResultsCombined =
    await api.functional.redditCommunity.userProfiles.index(connection, {
      body: {
        search: "impossible_search_term_12345",
        display_name: "DefinitelyNonExistent",
        location: "Imaginary_Location_Neverland",
        is_verified: true, // Add verification requirement
        page: 1,
        limit: 1,
      } satisfies IRedditCommunityUserProfiles.IRequest,
    });
  typia.assert(emptyResultsCombined);

  await TestValidator.equals(
    "empty results combined filters - pagination current page",
    emptyResultsCombined.pagination.current,
    1,
  );
  await TestValidator.equals(
    "empty results combined filters - pagination records count",
    emptyResultsCombined.pagination.records,
    0,
  );
  await TestValidator.equals(
    "empty results combined filters - pagination pages",
    emptyResultsCombined.pagination.pages,
    0,
  );
  await TestValidator.equals(
    "empty results combined filters - data array length",
    emptyResultsCombined.data.length,
    0,
  );

  // Test 5: Test pagination with empty results (different page numbers)
  const emptyResultsPage2 =
    await api.functional.redditCommunity.userProfiles.index(connection, {
      body: {
        search: "another_impossible_term_98765",
        page: 2,
        limit: 10,
      } satisfies IRedditCommunityUserProfiles.IRequest,
    });
  typia.assert(emptyResultsPage2);

  await TestValidator.equals(
    "empty results page 2 - pagination current page",
    emptyResultsPage2.pagination.current,
    2,
  );
  await TestValidator.equals(
    "empty results page 2 - pagination records count",
    emptyResultsPage2.pagination.records,
    0,
  );
  await TestValidator.equals(
    "empty results page 2 - data array length",
    emptyResultsPage2.data.length,
    0,
  );

  // Test 6: Test with maximum limit on empty results
  const emptyResultsMaxLimit =
    await api.functional.redditCommunity.userProfiles.index(connection, {
      body: {
        search: "max_limit_empty_test_54321",
        page: 1,
        limit: 100, // Maximum allowed limit
      } satisfies IRedditCommunityUserProfiles.IRequest,
    });
  typia.assert(emptyResultsMaxLimit);

  await TestValidator.equals(
    "empty results max limit - pagination current page",
    emptyResultsMaxLimit.pagination.current,
    1,
  );
  await TestValidator.equals(
    "empty results max limit - pagination records count",
    emptyResultsMaxLimit.pagination.records,
    0,
  );
  await TestValidator.equals(
    "empty results max limit - data array length",
    emptyResultsMaxLimit.data.length,
    0,
  );
  await TestValidator.equals(
    "empty results max limit - pagination limit",
    emptyResultsMaxLimit.pagination.limit,
    100,
  );
}
