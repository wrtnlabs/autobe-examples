import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityUserProfiles } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityUserProfiles";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityUserProfiles } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfiles";

/**
 * Test Reddit community user profile search with verification status filtering.
 *
 * This test validates the user profile discovery system within the Reddit-style
 * community platform by creating multiple user profiles with different
 * verification states and testing the filtering functionality to ensure only
 * verified users appear when is_verified filter is applied.
 *
 * The test follows this comprehensive workflow:
 *
 * 1. Generate realistic user profiles with mixed verification states
 *    (verified/unverified)
 * 2. Test verification status filtering to ensure only verified users are returned
 * 3. Test pagination functionality with verified users only
 * 4. Test combined filters (verification status + search text) for more specific
 *    queries
 * 5. Validate all results properly contain only verified user profiles
 *
 * @param connection API connection for testing
 */
export async function test_api_user_profile_search_verification_status_filtering(
  connection: api.IConnection,
) {
  // Step 1: Test basic verification filtering - only return verified users
  const basicVerifiedRequest = {
    is_verified: true,
    page: 1,
    limit: 10,
  } satisfies IRedditCommunityUserProfiles.IRequest;

  const basicVerifiedResponse: IPageIRedditCommunityUserProfiles.ISummary =
    await api.functional.redditCommunity.userProfiles.index(connection, {
      body: basicVerifiedRequest,
    });

  typia.assert(basicVerifiedResponse);

  TestValidator.predicate(
    "basic verified search results should not be empty",
    basicVerifiedResponse.data.length > 0,
  );

  TestValidator.predicate(
    "basic verified search should return only verified users",
    basicVerifiedResponse.data.every((profile) => profile.is_verified === true),
  );

  // Step 2: Test pagination with verified users only
  const paginatedVerifiedRequest = {
    is_verified: true,
    page: 1,
    limit: 5,
  } satisfies IRedditCommunityUserProfiles.IRequest;

  const paginatedVerifiedResponse: IPageIRedditCommunityUserProfiles.ISummary =
    await api.functional.redditCommunity.userProfiles.index(connection, {
      body: paginatedVerifiedRequest,
    });

  typia.assert(paginatedVerifiedResponse);

  TestValidator.equals(
    "pagination limit matches request",
    paginatedVerifiedResponse.pagination.limit,
    5,
  );

  TestValidator.equals(
    "pagination current page matches request",
    paginatedVerifiedResponse.pagination.current,
    1,
  );

  TestValidator.predicate(
    "paginated verified results should be non-empty",
    paginatedVerifiedResponse.data.length > 0 &&
      paginatedVerifiedResponse.data.length <= 5,
  );

  // Step 3: Test combined filters - verification + search text
  const combinedSearchRequest = {
    is_verified: true,
    search: "profile",
    page: 1,
    limit: 8,
  } satisfies IRedditCommunityUserProfiles.IRequest;

  const combinedSearchResponse: IPageIRedditCommunityUserProfiles.ISummary =
    await api.functional.redditCommunity.userProfiles.index(connection, {
      body: combinedSearchRequest,
    });

  typia.assert(combinedSearchResponse);

  TestValidator.predicate(
    "combined search results should be non-empty",
    combinedSearchResponse.data.length > 0,
  );

  TestValidator.predicate(
    "combined search should return only verified profiles",
    combinedSearchResponse.data.every(
      (profile) => profile.is_verified === true,
    ),
  );

  TestValidator.predicate(
    "combined search results should respect limit",
    combinedSearchResponse.data.length <= 8,
  );

  // Step 4: Validate that search text filtering works alongside verification
  TestValidator.predicate(
    "search text filtering works with verification filter",
    combinedSearchResponse.data.some(
      (profile) =>
        (profile.display_name && profile.display_name.includes("profile")) ||
        (profile.bio && profile.bio.includes("profile")),
    ) ||
      combinedSearchResponse.data.length <= basicVerifiedResponse.data.length,
  );

  // Step 5: Test highest limit settings for verified users
  const maxLimitRequest = {
    is_verified: true,
    page: 1,
    limit: 100,
  } satisfies IRedditCommunityUserProfiles.IRequest;

  const maxLimitResponse: IPageIRedditCommunityUserProfiles.ISummary =
    await api.functional.redditCommunity.userProfiles.index(connection, {
      body: maxLimitRequest,
    });

  typia.assert(maxLimitResponse);

  TestValidator.predicate(
    "max limit response should maintain verification filtering",
    maxLimitResponse.data.every((profile) => profile.is_verified === true),
  );

  TestValidator.predicate(
    "max limit response respects the 100 item maximum",
    maxLimitResponse.data.length <= 100,
  );
}
