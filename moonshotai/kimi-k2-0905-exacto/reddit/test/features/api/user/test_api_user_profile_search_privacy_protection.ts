import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityUserProfiles } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityUserProfiles";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityUserProfiles } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfiles";

/**
 * Test comprehensive user profile search functionality while ensuring privacy
 * protection standards are maintained.
 *
 * This test validates that the community platform properly filters and displays
 * only authorized public information during user discovery operations,
 * protecting sensitive user data while enabling legitimate community
 * interaction and member discovery. The test scenarios cover various search
 * patterns, privacy boundary validation, and pagination functionality.
 *
 * Test scenarios include:
 *
 * 1. General text search across display names and bio content
 * 2. Display name filtering with exact and partial matching
 * 3. Location-based user discovery
 * 4. Verification status filtering for trusted community members
 * 5. Pagination testing with different page sizes
 * 6. Privacy boundary validation ensuring no sensitive data exposure
 * 7. Edge case testing for empty searches and boundary conditions
 *
 * Privacy protection is validated by ensuring search results only contain
 * ISummary fields and never expose IRedditCommunityMember internal data like
 * email addresses or sensitive member information.
 */
export async function test_api_user_profile_search_privacy_protection(
  connection: api.IConnection,
) {
  // Step 1: Discover existing user profiles through various search methods
  const allUsersResults =
    await api.functional.redditCommunity.userProfiles.index(connection, {
      body: {
        limit: 50,
        page: 1,
      } satisfies IRedditCommunityUserProfiles.IRequest,
    });
  typia.assert(allUsersResults);

  // Step 2: Test general text search functionality
  const searchTerm = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 6,
  });
  const generalSearchResults =
    await api.functional.redditCommunity.userProfiles.index(connection, {
      body: {
        search: searchTerm,
        limit: 10,
        page: 1,
      } satisfies IRedditCommunityUserProfiles.IRequest,
    });
  typia.assert(generalSearchResults);

  TestValidator.predicate(
    "general search returns valid pagination structure",
    generalSearchResults.pagination.current === 1 &&
      generalSearchResults.pagination.limit === 10 &&
      generalSearchResults.pagination.records >= 0,
  );

  // Step 3: Test display name filtering with partial matching
  const displayNameTest = RandomGenerator.alphabets(3);
  const displayNameSearch =
    await api.functional.redditCommunity.userProfiles.index(connection, {
      body: {
        display_name: displayNameTest,
        limit: 5,
        page: 1,
      } satisfies IRedditCommunityUserProfiles.IRequest,
    });
  typia.assert(displayNameSearch);

  displayNameSearch.data.forEach((profile, index) => {
    TestValidator.predicate(
      `profile ${index} has display name matching search prefix`,
      profile.display_name !== undefined &&
        profile.display_name
          .toLowerCase()
          .includes(displayNameTest.toLowerCase()),
    );
  });

  // Step 4: Test location-based discovery
  const testLocation = RandomGenerator.name(2); // Generate realistic location
  const locationSearch =
    await api.functional.redditCommunity.userProfiles.index(connection, {
      body: {
        location: testLocation,
        limit: 20,
        page: 1,
      } satisfies IRedditCommunityUserProfiles.IRequest,
    });
  typia.assert(locationSearch);

  TestValidator.predicate(
    "location search respects pagination limits",
    locationSearch.data.length <= 20,
  );

  locationSearch.data.forEach((profile, index) => {
    TestValidator.predicate(
      `location search profile ${index} has location field`,
      profile.location !== undefined &&
        profile.location.toLowerCase().includes(testLocation.toLowerCase()),
    );
  });

  // Step 5: Test verification status filtering
  const verifiedSearch =
    await api.functional.redditCommunity.userProfiles.index(connection, {
      body: {
        is_verified: true,
        limit: 25,
        page: 1,
      } satisfies IRedditCommunityUserProfiles.IRequest,
    });
  typia.assert(verifiedSearch);

  verifiedSearch.data.forEach((profile, index) => {
    TestValidator.predicate(
      `verified search only returns verified profiles at index ${index}`,
      profile.is_verified === true,
    );
  });

  // Step 6: Test combined filters
  const combinedFilters =
    await api.functional.redditCommunity.userProfiles.index(connection, {
      body: {
        is_verified: true,
        search: RandomGenerator.alphabets(6),
        limit: 15,
        page: 1,
      } satisfies IRedditCommunityUserProfiles.IRequest,
    });
  typia.assert(combinedFilters);

  TestValidator.predicate(
    "combined filters return all verified results",
    combinedFilters.data.every((profile) => profile.is_verified === true),
  );

  // Step 7: Validate privacy boundaries - ensure no sensitive data exposure
  verifiedSearch.data.forEach((profile, index) => {
    // Validate only public fields are exposed
    TestValidator.predicate(
      `profile ${index} contains only public summary fields`,
      profile.id !== undefined &&
        typeof profile.id === "string" &&
        profile.member_id !== undefined &&
        typeof profile.member_id === "string" &&
        profile.is_verified !== undefined &&
        typeof profile.is_verified === "boolean" &&
        profile.created_at !== undefined &&
        profile.updated_at !== undefined,
    );

    // Ensure member details are properly encapsulated and no email exposed
    if (profile.member !== undefined) {
      TestValidator.predicate(
        `profile ${index} member data is properly structured`,
        profile.member.id !== undefined &&
          profile.member.nickname !== undefined &&
          profile.member.created_at !== undefined &&
          profile.member.updated_at !== undefined &&
          !("email" in profile.member), // Email should not be exposed in search results
      );
    }
  });

  // Step 8: Test pagination functionality
  for (let page = 1; page <= 3; page++) {
    const paginatedResults =
      await api.functional.redditCommunity.userProfiles.index(connection, {
        body: {
          limit: 5,
          page: page,
        } satisfies IRedditCommunityUserProfiles.IRequest,
      });
    typia.assert(paginatedResults);

    TestValidator.predicate(
      `page ${page} has correct pagination info`,
      paginatedResults.pagination.current === page &&
        paginatedResults.pagination.limit === 5,
    );
  }

  // Step 9: Test edge cases
  const emptySearch = await api.functional.redditCommunity.userProfiles.index(
    connection,
    {
      body: {},
    },
  );
  typia.assert(emptySearch);

  TestValidator.predicate(
    "empty search returns valid response",
    emptySearch.pagination.current === 1 && emptySearch.data.length >= 0,
  );

  const boundaryPagination =
    await api.functional.redditCommunity.userProfiles.index(connection, {
      body: {
        limit: 1,
        page: 1,
      } satisfies IRedditCommunityUserProfiles.IRequest,
    });
  typia.assert(boundaryPagination);

  TestValidator.predicate(
    "boundary pagination works correctly",
    boundaryPagination.data.length <= 1 &&
      boundaryPagination.pagination.limit === 1,
  );

  // Step 10: Validate data consistency across operations
  const lastPageResults =
    await api.functional.redditCommunity.userProfiles.index(connection, {
      body: {
        limit: 100,
        page: 999, // Request beyond available data
      } satisfies IRedditCommunityUserProfiles.IRequest,
    });
  typia.assert(lastPageResults);

  TestValidator.predicate(
    "requesting beyond available data handles gracefully",
    lastPageResults.data.length === 0 ||
      lastPageResults.pagination.current <= lastPageResults.pagination.pages,
  );

  // Step 11: Test privacy boundary validation with detailed field exposure check
  const allResultsToTest =
    allUsersResults.data.length > 0 ? allUsersResults : emptySearch;
  const testSample =
    allResultsToTest.data.length > 5
      ? allResultsToTest.data.slice(0, 5)
      : allResultsToTest.data;

  testSample.forEach((profile, index) => {
    TestValidator.predicate(
      `test sample profile ${index} exposes only authorized public fields`,
      // Public fields that should be exposed
      profile.id !== undefined &&
        typeof profile.id === "string" &&
        profile.member_id !== undefined &&
        typeof profile.member_id === "string" &&
        profile.is_verified !== undefined &&
        typeof profile.is_verified === "boolean" &&
        profile.created_at !== undefined &&
        typeof profile.created_at === "string" &&
        profile.updated_at !== undefined &&
        typeof profile.updated_at === "string" &&
        (profile.deleted_at === undefined ||
          profile.deleted_at === null ||
          typeof profile.deleted_at === "string") &&
        (profile.display_name === undefined ||
          typeof profile.display_name === "string") &&
        (profile.bio === undefined || typeof profile.bio === "string") &&
        (profile.location === undefined ||
          typeof profile.location === "string") &&
        (profile.website_url === undefined ||
          typeof profile.website_url === "string") &&
        (profile.avatar_url === undefined ||
          typeof profile.avatar_url === "string") &&
        (profile.profile_banner_url === undefined ||
          typeof profile.profile_banner_url === "string") &&
        (profile.member === undefined ||
          (profile.member.id !== undefined &&
            profile.member.nickname !== undefined &&
            profile.member.created_at !== undefined &&
            profile.member.updated_at !== undefined &&
            !("email" in profile.member))), // Critical: no email in search results
    );
  });
}
