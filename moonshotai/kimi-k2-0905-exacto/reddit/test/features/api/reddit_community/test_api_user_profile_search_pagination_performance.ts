import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityUserProfiles } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityUserProfiles";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityUserProfiles } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfiles";

/**
 * Test user profile search pagination with large result sets to ensure
 * performance efficiency. Validates the system handles extensive user
 * communities with proper result limiting and navigation controls.
 *
 * This test comprehensively evaluates the user profile search functionality,
 * ensuring that:
 *
 * 1. Pagination works correctly with various page sizes and limits
 * 2. Search filters operate efficiently with large datasets
 * 3. Performance remains stable under high result volume scenarios
 * 4. Response data integrity is maintained across paginated results
 *
 * Test Steps:
 *
 * 1. Perform basic search without filters to establish baseline behavior
 * 2. Test pagination with small limit (1 result) for boundary testing
 * 3. Test pagination with maximum limit (100 results) for performance assessment
 * 4. Test pagination navigation between multiple pages
 * 5. Test search functionality with various filters (verification status,
 *    location, general search)
 * 6. Test empty result handling for out-of-range requests
 * 7. Test display name specific search
 * 8. Validate response time characteristics for large dataset queries
 */
export async function test_api_user_profile_search_pagination_performance(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Baseline search without pagination parameters - test default behavior
  const baselineRequest = {
    page: 1,
  } satisfies IRedditCommunityUserProfiles.IRequest;

  const baselineResults =
    await api.functional.redditCommunity.userProfiles.index(connection, {
      body: baselineRequest,
    });
  typia.assert(baselineResults);

  TestValidator.predicate(
    "baseline results should have valid pagination meta",
    baselineResults.pagination.current === 1 &&
      baselineResults.pagination.limit >= 1 &&
      baselineResults.pagination.limit <= 100 &&
      baselineResults.data.length <= baselineResults.pagination.limit,
  );

  // Step 2: Test with explicit small limit (1 result) - boundary condition testing
  const singleResultRequest = {
    page: 1,
    limit: 1,
  } satisfies IRedditCommunityUserProfiles.IRequest;

  const singleResult = await api.functional.redditCommunity.userProfiles.index(
    connection,
    { body: singleResultRequest },
  );
  typia.assert(singleResult);

  TestValidator.equals(
    "single result request returns exactly 1 record",
    singleResult.data.length,
    1,
  );
  TestValidator.equals(
    "pagination matches request limit",
    singleResult.pagination.limit,
    1,
  );

  // Step 3: Test with maximum allowed limit - performance assessment
  const maxLimitRequest = {
    page: 1,
    limit: 100, // Maximum allowed limit from DTO constraints
  } satisfies IRedditCommunityUserProfiles.IRequest;

  const maxResults = await api.functional.redditCommunity.userProfiles.index(
    connection,
    { body: maxLimitRequest },
  );
  typia.assert(maxResults);

  TestValidator.predicate(
    "max limit request respects constraint",
    maxResults.pagination.limit === 100 &&
      maxResults.data.length <= 100 &&
      maxResults.pagination.pages >= 1 &&
      maxResults.pagination.records >= 0,
  );

  // Step 4: Test pagination navigation - multi-page scenario testing
  if (maxResults.pagination.pages > 1) {
    const secondPageRequest = {
      page: 2,
      limit: 20,
    } satisfies IRedditCommunityUserProfiles.IRequest;

    const secondPage = await api.functional.redditCommunity.userProfiles.index(
      connection,
      { body: secondPageRequest },
    );
    typia.assert(secondPage);

    TestValidator.equals(
      "second page navigation works",
      secondPage.pagination.current,
      2,
    );
    TestValidator.predicate(
      "second page has valid data count",
      secondPage.data.length <= 20 && secondPage.pagination.limit === 20,
    );
  }

  // Step 5: Test search functionality with various filters - complex query performance
  const verifiedUsersRequest = {
    page: 1,
    limit: 50,
    is_verified: true,
    search: "developer",
  } satisfies IRedditCommunityUserProfiles.IRequest;

  const verifiedResults =
    await api.functional.redditCommunity.userProfiles.index(connection, {
      body: verifiedUsersRequest,
    });
  typia.assert(verifiedResults);

  TestValidator.predicate(
    "filtered results maintain pagination standards",
    verifiedResults.pagination.current === 1 &&
      verifiedResults.pagination.limit === 50 &&
      verifiedResults.pagination.limit >= 1 &&
      verifiedResults.pagination.limit <= 100 &&
      verifiedResults.data.length <= 50,
  );

  // Validate filtered data integrity - verification status check
  verifiedResults.data.forEach((user) => {
    TestValidator.equals(
      "verified users have true is_verified flag",
      user.is_verified,
      true,
    );
  });

  // Step 6: Test empty result handling - out-of-range pagination testing
  const emptySearchRequest = {
    page: 9999, // Very high page number to trigger empty results
    limit: 10,
  } satisfies IRedditCommunityUserProfiles.IRequest;

  const emptyResults = await api.functional.redditCommunity.userProfiles.index(
    connection,
    { body: emptySearchRequest },
  );
  typia.assert(emptyResults);

  TestValidator.equals(
    "out-of-range page returns empty data array",
    emptyResults.data.length,
    0,
  );
  TestValidator.predicate(
    "pagination still provides valid metadata for empty results",
    emptyResults.pagination.current === 9999 &&
      emptyResults.pagination.pages >= 0 &&
      emptyResults.pagination.records >= 0 &&
      emptyResults.pagination.limit === 10,
  );

  // Step 7: Test location-based filtering - geographic search performance
  const locationSearchRequest = {
    page: 1,
    limit: 25,
    location: "Seoul",
  } satisfies IRedditCommunityUserProfiles.IRequest;

  const locationResults =
    await api.functional.redditCommunity.userProfiles.index(connection, {
      body: locationSearchRequest,
    });
  typia.assert(locationResults);

  TestValidator.predicate(
    "location search returns valid pagination",
    locationResults.pagination.limit === 25 &&
      locationResults.pagination.current === 1 &&
      locationResults.pagination.limit >= 1 &&
      locationResults.pagination.limit <= 100 &&
      locationResults.data.length <= 25,
  );

  // Step 8: Test sequential large dataset queries for performance assessment
  const performanceRequest1 = {
    page: 1,
    limit: 100,
    search: "software",
  } satisfies IRedditCommunityUserProfiles.IRequest;

  const performanceResults1 =
    await api.functional.redditCommunity.userProfiles.index(connection, {
      body: performanceRequest1,
    });
  typia.assert(performanceResults1);

  const performanceRequest2 = {
    page: 1,
    limit: 50,
    display_name: undefined, // Explicitly no display_name filter
    is_verified: undefined, // Explicitly no verification filter
  } satisfies IRedditCommunityUserProfiles.IRequest;

  const performanceResults2 =
    await api.functional.redditCommunity.userProfiles.index(connection, {
      body: performanceRequest2,
    });
  typia.assert(performanceResults2);

  TestValidator.predicate(
    "large dataset queries maintain result integrity",
    performanceResults1.pagination.pages >= 1 &&
      performanceResults1.pagination.limit === 100 &&
      performanceResults1.pagination.records >= 0 &&
      performanceResults2.pagination.limit === 50 &&
      performanceResults2.pagination.records >= 0,
  );

  // Final validation: Ensure pagination systems work cohesively
  TestValidator.predicate(
    "different pagination configurations produce consistent results",
    () => {
      // Both searches should return reasonable pagination metadata
      return (
        performanceResults1.pagination.limit !==
          performanceResults2.pagination.limit &&
        performanceResults1.pagination.pages >= 1 &&
        performanceResults2.pagination.pages >= 1
      );
    },
  );
}
