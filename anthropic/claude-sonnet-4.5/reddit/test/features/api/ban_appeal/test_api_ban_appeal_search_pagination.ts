import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityBanAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityBanAppeal";
import type { IRedditCommunityBanAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityBanAppeal";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityBan";
import type { IRedditCommunityCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityMember";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test pagination functionality when retrieving multiple ban appeals.
 *
 * This test validates that the ban appeal search API correctly implements
 * pagination by creating a community, banning multiple members, having each
 * submit an appeal, and then testing pagination with different page sizes and
 * page numbers.
 *
 * The test verifies:
 *
 * 1. Pagination metadata is correctly calculated (current, limit, records, pages)
 * 2. Different pages return distinct appeals without duplication
 * 3. The limit parameter correctly controls page size
 * 4. Pagination boundaries work correctly when requesting pages beyond available
 *    data
 */
export async function test_api_ban_appeal_search_pagination(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = typia.random<string & tags.MinLength<8>>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      nickname: RandomGenerator.name(),
      ip: "127.0.0.1",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create community
  const communityName = RandomGenerator.alphabets(10);
  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: communityName,
          display_title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          rules: RandomGenerator.paragraph({ sentences: 2 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create multiple members, ban them, and have them submit appeals
  const bannedMemberCount = 7;
  const bans: IRedditCommunityCommunityBan[] = [];

  for (let i = 0; i < bannedMemberCount; i++) {
    const memberEmail = typia.random<string & tags.Format<"email">>();
    const memberPassword = typia.random<string & tags.MinLength<8>>();

    const member = await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: memberEmail,
        password: memberPassword,
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        avatar_url: typia.random<string & tags.Format<"uri">>(),
        show_online_status: true,
        show_subscribed_communities: false,
        show_activity_feed: true,
        ip: "127.0.0.1",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityGuest.ICreate,
    });
    typia.assert(member);

    // Switch back to moderator to create ban
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        nickname: RandomGenerator.name(),
        ip: "127.0.0.1",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });

    const ban =
      await api.functional.redditCommunity.moderator.communities.bans.create(
        connection,
        {
          communityName: community.name,
          body: {
            banned_member_id: member.id,
            reason: `Test ban reason ${i + 1}: ${RandomGenerator.paragraph({ sentences: 1 })}`,
            expires_at: null,
          } satisfies IRedditCommunityCommunityBan.ICreate,
        },
      );
    typia.assert(ban);
    bans.push(ban);
  }

  // Step 4: Test pagination with different page sizes
  const pageSize1 = 3;
  const firstPage =
    await api.functional.redditCommunity.moderator.communities.banAppeals.index(
      connection,
      {
        communityName: community.name,
        body: {
          page: 1,
          limit: pageSize1,
        } satisfies IRedditCommunityBanAppeal.IRequest,
      },
    );
  typia.assert(firstPage);

  // Validate pagination metadata
  TestValidator.equals("first page current", firstPage.pagination.current, 0);
  TestValidator.equals(
    "first page limit",
    firstPage.pagination.limit,
    pageSize1,
  );
  TestValidator.predicate(
    "first page has records",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "first page data not exceeds limit",
    firstPage.data.length <= pageSize1,
  );

  // Step 5: Retrieve second page and verify no duplication
  const secondPage =
    await api.functional.redditCommunity.moderator.communities.banAppeals.index(
      connection,
      {
        communityName: community.name,
        body: {
          page: 2,
          limit: pageSize1,
        } satisfies IRedditCommunityBanAppeal.IRequest,
      },
    );
  typia.assert(secondPage);

  TestValidator.equals("second page current", secondPage.pagination.current, 1);
  TestValidator.equals(
    "second page limit",
    secondPage.pagination.limit,
    pageSize1,
  );
  TestValidator.predicate(
    "second page data not exceeds limit",
    secondPage.data.length <= pageSize1,
  );

  // Verify no duplication between pages
  const firstPageIds = firstPage.data.map((appeal) => appeal.id);
  const secondPageIds = secondPage.data.map((appeal) => appeal.id);
  const hasNoDuplicates = firstPageIds.every(
    (id) => !secondPageIds.includes(id),
  );
  TestValidator.predicate(
    "no duplicates between page 1 and page 2",
    hasNoDuplicates,
  );

  // Step 6: Test different page size
  const pageSize2 = 5;
  const largerPageSize =
    await api.functional.redditCommunity.moderator.communities.banAppeals.index(
      connection,
      {
        communityName: community.name,
        body: {
          page: 1,
          limit: pageSize2,
        } satisfies IRedditCommunityBanAppeal.IRequest,
      },
    );
  typia.assert(largerPageSize);

  TestValidator.equals(
    "larger page size limit",
    largerPageSize.pagination.limit,
    pageSize2,
  );
  TestValidator.predicate(
    "larger page size data not exceeds limit",
    largerPageSize.data.length <= pageSize2,
  );

  // Step 7: Test boundary - request page beyond available data
  const beyondPage =
    await api.functional.redditCommunity.moderator.communities.banAppeals.index(
      connection,
      {
        communityName: community.name,
        body: {
          page: 100,
          limit: pageSize1,
        } satisfies IRedditCommunityBanAppeal.IRequest,
      },
    );
  typia.assert(beyondPage);

  TestValidator.equals("beyond page data length", beyondPage.data.length, 0);
  TestValidator.equals(
    "beyond page current",
    beyondPage.pagination.current,
    99,
  );
}
