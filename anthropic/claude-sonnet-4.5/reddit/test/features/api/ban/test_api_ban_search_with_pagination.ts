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
 * Test ban search with pagination controls including page number, limit, and
 * navigation through multiple pages.
 *
 * This test validates the pagination functionality of the ban search API by
 * retrieving bans with different pagination parameters. The test requests the
 * first page with a specific limit, verifies the pagination metadata shows
 * correct total records count and pages count, and tests that changing the
 * limit parameter properly affects the page count calculation. The test
 * validates that the IPage.IPagination object correctly reports current page
 * number, limit, total records, and total pages.
 */
export async function test_api_ban_search_with_pagination(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: "SecurePassword123!",
      nickname: RandomGenerator.name(),
      href: "https://example.com/moderator/join",
      referrer: "https://example.com/home",
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create a community for context
  const communityName = RandomGenerator.alphabets(10);
  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: communityName,
          display_title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Request first page with limit=10
  const firstPageLimit = 10;
  const firstPageRequest = {
    page: 1,
    limit: firstPageLimit,
  } satisfies IRedditCommunityCommunityBan.IRequest;

  const firstPage = await api.functional.redditCommunity.moderator.bans.index(
    connection,
    {
      body: firstPageRequest,
    },
  );
  typia.assert(firstPage);

  // Step 4: Validate pagination metadata for first page
  TestValidator.equals(
    "first page current should be 0",
    firstPage.pagination.current,
    0,
  );
  TestValidator.equals(
    "first page limit should match request",
    firstPage.pagination.limit,
    firstPageLimit,
  );
  TestValidator.predicate(
    "total records should be non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.equals(
    "total pages calculation should be correct",
    firstPage.pagination.pages,
    Math.ceil(firstPage.pagination.records / firstPageLimit),
  );
  TestValidator.predicate(
    "first page data length should not exceed limit",
    firstPage.data.length <= firstPageLimit,
  );

  // Step 5: If there are multiple pages, retrieve second page
  if (firstPage.pagination.pages > 1) {
    const secondPageRequest = {
      page: 2,
      limit: firstPageLimit,
    } satisfies IRedditCommunityCommunityBan.IRequest;

    const secondPage =
      await api.functional.redditCommunity.moderator.bans.index(connection, {
        body: secondPageRequest,
      });
    typia.assert(secondPage);

    TestValidator.equals(
      "second page current should be 1",
      secondPage.pagination.current,
      1,
    );
    TestValidator.equals(
      "second page limit should match request",
      secondPage.pagination.limit,
      firstPageLimit,
    );
    TestValidator.equals(
      "second page total records should be consistent",
      secondPage.pagination.records,
      firstPage.pagination.records,
    );
    TestValidator.equals(
      "second page total pages should be consistent",
      secondPage.pagination.pages,
      firstPage.pagination.pages,
    );

    // Verify no duplication between pages
    const firstPageIds = new Set(firstPage.data.map((ban) => ban.id));
    const secondPageIds = new Set(secondPage.data.map((ban) => ban.id));
    const intersection = new Set(
      [...firstPageIds].filter((id) => secondPageIds.has(id)),
    );
    TestValidator.equals(
      "no duplicate bans between first and second page",
      intersection.size,
      0,
    );
  }

  // Step 6: Test with different limit parameter
  const newLimit = 5;
  const differentLimitRequest = {
    page: 1,
    limit: newLimit,
  } satisfies IRedditCommunityCommunityBan.IRequest;

  const differentLimitPage =
    await api.functional.redditCommunity.moderator.bans.index(connection, {
      body: differentLimitRequest,
    });
  typia.assert(differentLimitPage);

  TestValidator.equals(
    "different limit page current should be 0",
    differentLimitPage.pagination.current,
    0,
  );
  TestValidator.equals(
    "different limit should match request",
    differentLimitPage.pagination.limit,
    newLimit,
  );
  TestValidator.equals(
    "total records should be same regardless of limit",
    differentLimitPage.pagination.records,
    firstPage.pagination.records,
  );
  TestValidator.equals(
    "page count should change with different limit",
    differentLimitPage.pagination.pages,
    Math.ceil(firstPage.pagination.records / newLimit),
  );
  TestValidator.predicate(
    "data length should not exceed new limit",
    differentLimitPage.data.length <= newLimit,
  );

  // Step 7: Test pagination with page=1 and different limit to verify calculations
  const anotherLimit = 20;
  const anotherLimitRequest = {
    page: 1,
    limit: anotherLimit,
  } satisfies IRedditCommunityCommunityBan.IRequest;

  const anotherLimitPage =
    await api.functional.redditCommunity.moderator.bans.index(connection, {
      body: anotherLimitRequest,
    });
  typia.assert(anotherLimitPage);

  TestValidator.equals(
    "another limit page current should be 0",
    anotherLimitPage.pagination.current,
    0,
  );
  TestValidator.equals(
    "another limit should match request",
    anotherLimitPage.pagination.limit,
    anotherLimit,
  );
  TestValidator.equals(
    "total records consistent across different limits",
    anotherLimitPage.pagination.records,
    firstPage.pagination.records,
  );
  TestValidator.equals(
    "page count calculated correctly for different limit",
    anotherLimitPage.pagination.pages,
    Math.ceil(firstPage.pagination.records / anotherLimit),
  );
}
