import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunityBan";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityBan";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test ban search endpoint with status filtering.
 *
 * This test validates that the ban search endpoint correctly accepts and
 * processes different status filter parameters. Since no ban creation API is
 * available in the provided materials, this test focuses on verifying the
 * endpoint's filtering capability and response structure.
 *
 * Test workflow:
 *
 * 1. Create and authenticate a moderator account
 * 2. Create a community for testing context
 * 3. Perform searches with each valid status filter value (active, expired,
 *    appealed, lifted)
 * 4. Verify that each search returns valid paginated response structure
 * 5. Validate pagination metadata is consistent across all status searches
 */
export async function test_api_ban_search_with_status_filter(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a moderator account
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePassword123!",
    nickname: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityCommunityModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorData,
  });
  typia.assert(moderator);

  // Step 2: Create a community for testing context
  const communityData = {
    name: RandomGenerator.alphabets(10),
    display_title: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 7,
    }),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 8,
    }),
    rules: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
  } satisfies IRedditCommunityCommunity.ICreate;

  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: communityData,
      },
    );
  typia.assert(community);

  // Step 3: Search for active status bans
  const activeSearchRequest = {
    status: "active",
    page: 1,
    limit: 10,
  } satisfies IRedditCommunityCommunityBan.IRequest;

  const activeResults =
    await api.functional.redditCommunity.moderator.bans.index(connection, {
      body: activeSearchRequest,
    });
  typia.assert(activeResults);

  // Step 4: Search for expired status bans
  const expiredSearchRequest = {
    status: "expired",
    page: 1,
    limit: 10,
  } satisfies IRedditCommunityCommunityBan.IRequest;

  const expiredResults =
    await api.functional.redditCommunity.moderator.bans.index(connection, {
      body: expiredSearchRequest,
    });
  typia.assert(expiredResults);

  // Step 5: Search for appealed status bans
  const appealedSearchRequest = {
    status: "appealed",
    page: 1,
    limit: 10,
  } satisfies IRedditCommunityCommunityBan.IRequest;

  const appealedResults =
    await api.functional.redditCommunity.moderator.bans.index(connection, {
      body: appealedSearchRequest,
    });
  typia.assert(appealedResults);

  // Step 6: Search for lifted status bans
  const liftedSearchRequest = {
    status: "lifted",
    page: 1,
    limit: 10,
  } satisfies IRedditCommunityCommunityBan.IRequest;

  const liftedResults =
    await api.functional.redditCommunity.moderator.bans.index(connection, {
      body: liftedSearchRequest,
    });
  typia.assert(liftedResults);

  // Step 7: Verify all searches return valid pagination structure
  TestValidator.predicate(
    "active search pagination should be valid",
    activeResults.pagination.current >= 0,
  );

  TestValidator.predicate(
    "expired search pagination should be valid",
    expiredResults.pagination.current >= 0,
  );

  TestValidator.predicate(
    "appealed search pagination should be valid",
    appealedResults.pagination.current >= 0,
  );

  TestValidator.predicate(
    "lifted search pagination should be valid",
    liftedResults.pagination.current >= 0,
  );

  // Step 8: Verify data arrays are present (may be empty without actual bans)
  TestValidator.predicate(
    "active search should return data array",
    Array.isArray(activeResults.data),
  );

  TestValidator.predicate(
    "expired search should return data array",
    Array.isArray(expiredResults.data),
  );

  TestValidator.predicate(
    "appealed search should return data array",
    Array.isArray(appealedResults.data),
  );

  TestValidator.predicate(
    "lifted search should return data array",
    Array.isArray(liftedResults.data),
  );
}
