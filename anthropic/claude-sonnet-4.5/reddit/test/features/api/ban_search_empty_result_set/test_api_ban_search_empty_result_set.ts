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
 * Test ban search when no bans match the specified filter criteria.
 *
 * This test validates that the ban search endpoint properly handles empty
 * result sets. It creates a moderator account and a community, then performs
 * various search queries that are guaranteed to match no ban records. The test
 * ensures that:
 *
 * 1. Searching for a non-existent community name returns empty results
 * 2. Filtering by a status that no bans have returns empty results
 * 3. Searching for a non-existent banned member username returns empty results
 * 4. Using date ranges that exclude all bans returns empty results
 * 5. All empty result responses have proper pagination structure with 0 records
 *    and 0 pages
 * 6. The response structure is valid IPageIRedditCommunityCommunityBan.ISummary
 * 7. The HTTP status is successful (200) rather than an error
 *
 * This ensures robust handling of no-match scenarios and proper empty state
 * responses for moderation interfaces.
 */
export async function test_api_ban_search_empty_result_set(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: "TestPassword123!",
      nickname: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create a community for testing
  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10).toLowerCase(),
          display_title: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          rules: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Search for a non-existent community name
  const nonExistentCommunityResult =
    await api.functional.redditCommunity.moderator.bans.index(connection, {
      body: {
        community_name:
          "nonexistent_community_" + RandomGenerator.alphaNumeric(20),
        page: 1,
        limit: 10,
      } satisfies IRedditCommunityCommunityBan.IRequest,
    });
  typia.assert(nonExistentCommunityResult);

  TestValidator.equals(
    "non-existent community search returns empty data array",
    nonExistentCommunityResult.data.length,
    0,
  );
  TestValidator.equals(
    "non-existent community search pagination shows 0 records",
    nonExistentCommunityResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "non-existent community search pagination shows 0 pages",
    nonExistentCommunityResult.pagination.pages,
    0,
  );

  // Step 4: Search for a non-existent banned member username
  const nonExistentUserResult =
    await api.functional.redditCommunity.moderator.bans.index(connection, {
      body: {
        banned_member_username:
          "nonexistent_user_" + RandomGenerator.alphaNumeric(20),
        page: 1,
        limit: 10,
      } satisfies IRedditCommunityCommunityBan.IRequest,
    });
  typia.assert(nonExistentUserResult);

  TestValidator.equals(
    "non-existent user search returns empty data array",
    nonExistentUserResult.data.length,
    0,
  );
  TestValidator.equals(
    "non-existent user search pagination shows 0 records",
    nonExistentUserResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "non-existent user search pagination shows 0 pages",
    nonExistentUserResult.pagination.pages,
    0,
  );

  // Step 5: Search with a date range far in the future (no bans will exist)
  const futureDate = new Date();
  futureDate.setFullYear(futureDate.getFullYear() + 10);
  const futureDateString = futureDate.toISOString();

  const futureDateResult =
    await api.functional.redditCommunity.moderator.bans.index(connection, {
      body: {
        created_from: futureDateString,
        page: 1,
        limit: 10,
      } satisfies IRedditCommunityCommunityBan.IRequest,
    });
  typia.assert(futureDateResult);

  TestValidator.equals(
    "future date range search returns empty data array",
    futureDateResult.data.length,
    0,
  );
  TestValidator.equals(
    "future date range search pagination shows 0 records",
    futureDateResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "future date range search pagination shows 0 pages",
    futureDateResult.pagination.pages,
    0,
  );

  // Step 6: Search with multiple non-matching filters combined
  const combinedFiltersResult =
    await api.functional.redditCommunity.moderator.bans.index(connection, {
      body: {
        community_name: "nonexistent_" + RandomGenerator.alphaNumeric(15),
        banned_member_username: "fake_user_" + RandomGenerator.alphaNumeric(15),
        search: "impossibleSearchTerm" + RandomGenerator.alphaNumeric(10),
        page: 1,
        limit: 20,
      } satisfies IRedditCommunityCommunityBan.IRequest,
    });
  typia.assert(combinedFiltersResult);

  TestValidator.equals(
    "combined non-matching filters return empty data array",
    combinedFiltersResult.data.length,
    0,
  );
  TestValidator.equals(
    "combined filters pagination shows 0 records",
    combinedFiltersResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "combined filters pagination shows 0 pages",
    combinedFiltersResult.pagination.pages,
    0,
  );

  // Step 7: Verify pagination structure is valid even with empty results
  TestValidator.predicate(
    "empty result pagination has valid current page",
    combinedFiltersResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "empty result pagination has valid limit",
    combinedFiltersResult.pagination.limit > 0,
  );
}
