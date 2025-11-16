import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunityBan";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityBan";
import type { IRedditCommunityCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityMember";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test the retrieval of community ban lists with basic pagination controls.
 *
 * This scenario validates that moderators can browse through ban records
 * efficiently using page and limit parameters. The test verifies:
 *
 * 1. A moderator can retrieve the first page of bans with a specified limit
 * 2. The response includes pagination metadata (current page, limit, total
 *    records, total pages)
 * 3. The data array contains the correct number of ban summary records up to the
 *    limit
 * 4. Subsequent pages can be retrieved by incrementing the page parameter
 * 5. The final page may contain fewer records than the limit
 *
 * This validates the fundamental pagination capability for managing potentially
 * large ban histories.
 */
export async function test_api_community_ban_search_basic_pagination(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      nickname: RandomGenerator.name(),
      ip: "127.0.0.1",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create a test community
  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          display_title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create multiple guest member accounts to ban (create 12 to test pagination)
  const totalBansToCreate = 12;
  const guestMembers = await ArrayUtil.asyncRepeat(
    totalBansToCreate,
    async () => {
      const guestEmail = typia.random<string & tags.Format<"email">>();
      const guest = await api.functional.auth.guest.join(connection, {
        body: {
          username: RandomGenerator.alphaNumeric(10),
          email: guestEmail,
          password: typia.random<string & tags.MinLength<8>>(),
          display_name: RandomGenerator.name(),
          bio: RandomGenerator.paragraph({ sentences: 2 }),
          avatar_url: typia.random<string & tags.Format<"uri">>(),
          show_online_status: false,
          show_subscribed_communities: false,
          show_activity_feed: true,
          ip: "127.0.0.1",
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityGuest.ICreate,
      });
      typia.assert(guest);
      return guest;
    },
  );

  // Step 4: Create ban records for all guest members
  const createdBans = await ArrayUtil.asyncRepeat(
    totalBansToCreate,
    async (index) => {
      const ban =
        await api.functional.redditCommunity.moderator.communities.bans.create(
          connection,
          {
            communityName: community.name,
            body: {
              banned_member_id: guestMembers[index].id,
              reason: `Ban reason ${index + 1}: ${RandomGenerator.paragraph({ sentences: 1 })}`,
              expires_at:
                index % 3 === 0
                  ? new Date(Date.now() + 86400000 * 30).toISOString()
                  : null,
            } satisfies IRedditCommunityCommunityBan.ICreate,
          },
        );
      typia.assert(ban);
      return ban;
    },
  );

  // Step 5: Test first page retrieval with limit of 5
  const pageLimit = 5;
  const firstPage =
    await api.functional.redditCommunity.moderator.communities.bans.index(
      connection,
      {
        communityName: community.name,
        body: {
          page: 1,
          limit: pageLimit,
        } satisfies IRedditCommunityCommunityBan.IRequest,
      },
    );
  typia.assert(firstPage);

  // Step 6: Validate pagination metadata for first page
  TestValidator.equals("first page current", firstPage.pagination.current, 0);
  TestValidator.equals(
    "first page limit",
    firstPage.pagination.limit,
    pageLimit,
  );
  TestValidator.equals(
    "first page total records",
    firstPage.pagination.records,
    totalBansToCreate,
  );
  TestValidator.equals(
    "first page total pages",
    firstPage.pagination.pages,
    Math.ceil(totalBansToCreate / pageLimit),
  );
  TestValidator.equals(
    "first page data count",
    firstPage.data.length,
    pageLimit,
  );

  // Step 7: Test second page retrieval
  const secondPage =
    await api.functional.redditCommunity.moderator.communities.bans.index(
      connection,
      {
        communityName: community.name,
        body: {
          page: 2,
          limit: pageLimit,
        } satisfies IRedditCommunityCommunityBan.IRequest,
      },
    );
  typia.assert(secondPage);

  // Validate pagination metadata for second page
  TestValidator.equals("second page current", secondPage.pagination.current, 1);
  TestValidator.equals(
    "second page limit",
    secondPage.pagination.limit,
    pageLimit,
  );
  TestValidator.equals(
    "second page total records",
    secondPage.pagination.records,
    totalBansToCreate,
  );
  TestValidator.equals(
    "second page data count",
    secondPage.data.length,
    pageLimit,
  );

  // Step 8: Test third (last) page retrieval - should have fewer records
  const thirdPage =
    await api.functional.redditCommunity.moderator.communities.bans.index(
      connection,
      {
        communityName: community.name,
        body: {
          page: 3,
          limit: pageLimit,
        } satisfies IRedditCommunityCommunityBan.IRequest,
      },
    );
  typia.assert(thirdPage);

  // Validate last page has remaining records (12 total, 5 per page = 2 on last page)
  const expectedLastPageCount = totalBansToCreate - pageLimit * 2;
  TestValidator.equals("third page current", thirdPage.pagination.current, 2);
  TestValidator.equals(
    "third page limit",
    thirdPage.pagination.limit,
    pageLimit,
  );
  TestValidator.equals(
    "third page data count",
    thirdPage.data.length,
    expectedLastPageCount,
  );
  TestValidator.predicate(
    "last page has fewer records than limit",
    thirdPage.data.length < pageLimit,
  );

  // Step 9: Verify ban summary structure contains expected fields
  if (firstPage.data.length > 0) {
    const sampleBan = firstPage.data[0];
    typia.assert(sampleBan);
    TestValidator.predicate("ban has id", typeof sampleBan.id === "string");
    TestValidator.predicate(
      "ban has reason",
      typeof sampleBan.reason === "string",
    );
    TestValidator.predicate(
      "ban has status",
      typeof sampleBan.status === "string",
    );
    TestValidator.predicate(
      "ban has created_at",
      typeof sampleBan.created_at === "string",
    );
  }
}
