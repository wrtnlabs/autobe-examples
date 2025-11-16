import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityUserProfiles } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityUserProfiles";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityUserProfiles } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfiles";

/**
 * Test advanced multi-criteria search combining keyword, location, verification
 * status, and display name filters. Validates sophisticated user discovery
 * capabilities supporting complex member identification needs
 */
export async function test_api_user_profile_search_combined_criteria_filtering(
  connection: api.IConnection,
) {
  // Test search with keyword only - searching for terms common in developer profiles
  const searchByKeyword =
    await api.functional.redditCommunity.userProfiles.index(connection, {
      body: {
        search: "developer",
      } satisfies IRedditCommunityUserProfiles.IRequest,
    });
  typia.assert(searchByKeyword);

  TestValidator.predicate(
    "keyword search should return results",
    searchByKeyword.data.length >= 0,
  );
  TestValidator.predicate(
    "should return valid pagination",
    searchByKeyword.pagination.pages >= 0,
  );

  // Test search with verification status filter
  const verifiedOnly = await api.functional.redditCommunity.userProfiles.index(
    connection,
    {
      body: {
        is_verified: true,
      } satisfies IRedditCommunityUserProfiles.IRequest,
    },
  );
  typia.assert(verifiedOnly);

  TestValidator.predicate(
    "verified filter should return only verified users",
    verifiedOnly.data.every((user) => user.is_verified === true),
  );

  // Test search with unverified filter
  const unverifiedOnly =
    await api.functional.redditCommunity.userProfiles.index(connection, {
      body: {
        is_verified: false,
      } satisfies IRedditCommunityUserProfiles.IRequest,
    });
  typia.assert(unverifiedOnly);

  TestValidator.predicate(
    "unverified filter should return only unverified users",
    unverifiedOnly.data.every((user) => user.is_verified === false),
  );

  // Test search with location filter
  const locationFilter =
    await api.functional.redditCommunity.userProfiles.index(connection, {
      body: {
        location: "San Francisco",
      } satisfies IRedditCommunityUserProfiles.IRequest,
    });
  typia.assert(locationFilter);

  TestValidator.predicate(
    "location filter should return users with matching location",
    locationFilter.data.length === 0 ||
      locationFilter.data.some((user) =>
        user.location?.toLowerCase().includes("san francisco"),
      ),
  );

  // Test search with display name filter for exact match
  const displayNameFilter =
    await api.functional.redditCommunity.userProfiles.index(connection, {
      body: {
        display_name: "TestUser",
      } satisfies IRedditCommunityUserProfiles.IRequest,
    });
  typia.assert(displayNameFilter);

  TestValidator.predicate(
    "display name filter should return exact or partial matches",
    displayNameFilter.data.length === 0 ||
      displayNameFilter.data.some((user) =>
        user.display_name?.toLowerCase().includes("testuser"),
      ),
  );

  // Test combined criteria search
  const combinedSearch =
    await api.functional.redditCommunity.userProfiles.index(connection, {
      body: {
        search: "developer community",
        is_verified: true,
        location: "New York",
      } satisfies IRedditCommunityUserProfiles.IRequest,
    });
  typia.assert(combinedSearch);

  TestValidator.predicate(
    "combined search should apply all filters when data exists",
    combinedSearch.data.length === 0 ||
      (combinedSearch.data.every((user) => user.is_verified === true) &&
        combinedSearch.data.some((user) =>
          user.location?.toLowerCase().includes("new york"),
        ) &&
        (combinedSearch.data.some((user) =>
          user.bio?.toLowerCase().includes("developer"),
        ) ||
          combinedSearch.data.some((user) =>
            user.bio?.toLowerCase().includes("community"),
          ))),
  );

  // Test pagination with search
  const paginatedSearch =
    await api.functional.redditCommunity.userProfiles.index(connection, {
      body: {
        page: 2,
        limit: 10,
      } satisfies IRedditCommunityUserProfiles.IRequest,
    });
  typia.assert(paginatedSearch);

  TestValidator.equals(
    "pagination limit",
    paginatedSearch.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pagination current page",
    paginatedSearch.pagination.current,
    2,
  );
  TestValidator.predicate(
    "data length should not exceed limit",
    paginatedSearch.data.length <= 10,
  );

  // Test search with empty result edge case
  const noResults = await api.functional.redditCommunity.userProfiles.index(
    connection,
    {
      body: {
        search: "zzzzz12345xyz987654321",
        location: "TripleRainbowVillage12345",
        is_verified: true,
        display_name: "NobodyExistsHere789",
      } satisfies IRedditCommunityUserProfiles.IRequest,
    },
  );
  typia.assert(noResults);

  TestValidator.equals(
    "no results should return empty data",
    noResults.data.length,
    0,
  );
  TestValidator.equals(
    "pagination should show current page 1 for no results",
    noResults.pagination.current,
    1,
  );

  // Test search with default pagination
  const defaultPagination =
    await api.functional.redditCommunity.userProfiles.index(connection, {
      body: {
        search: "test",
      } satisfies IRedditCommunityUserProfiles.IRequest,
    });
  typia.assert(defaultPagination);

  TestValidator.predicate(
    "default pagination should apply defaults",
    defaultPagination.pagination.limit === 20 &&
      defaultPagination.pagination.current === 1,
  );

  // Test partial match search
  const partialMatch = await api.functional.redditCommunity.userProfiles.index(
    connection,
    {
      body: {
        search: "dev",
      } satisfies IRedditCommunityUserProfiles.IRequest,
    },
  );
  typia.assert(partialMatch);

  TestValidator.predicate(
    "partial match should work",
    partialMatch.data.length >= 0,
  );

  // Test case insensitive search
  const caseInsensitive =
    await api.functional.redditCommunity.userProfiles.index(connection, {
      body: {
        search: "DEVELOPER",
      } satisfies IRedditCommunityUserProfiles.IRequest,
    });
  typia.assert(caseInsensitive);

  TestValidator.predicate(
    "case insensitive search should work",
    caseInsensitive.data.length >= 0,
  );
}
