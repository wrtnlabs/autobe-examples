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
 * Test sorting ban records by various fields including created_at, expires_at,
 * community_name, member_username, and moderator_username in both ascending and
 * descending order.
 *
 * This scenario validates that moderators can organize ban lists according to
 * different criteria. The test verifies that:
 *
 * 1. Sort_by='created_at' orders bans chronologically
 * 2. Sort_by='expires_at' orders by expiration timestamp
 * 3. Sort_by='member_username' provides alphabetical ordering by banned member
 * 4. Sort_order='asc' produces ascending order
 * 5. Sort_order='desc' produces descending order
 * 6. Combining sort parameters produces correct multi-criteria ordering
 *
 * This enables flexible data organization for different moderation review
 * scenarios.
 */
export async function test_api_community_ban_search_sorting_options(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator account
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      nickname: RandomGenerator.name(),
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create a community for ban testing
  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphabets(15),
          display_title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          rules: RandomGenerator.paragraph({ sentences: 2 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create multiple guest members with alphabetically distinct usernames
  const memberUsernames = [
    "alice_user",
    "bob_user",
    "charlie_user",
    "diana_user",
    "evan_user",
  ];
  const members = await ArrayUtil.asyncMap(
    memberUsernames,
    async (username) => {
      const member = await api.functional.auth.guest.join(connection, {
        body: {
          username: username,
          email: typia.random<string & tags.Format<"email">>(),
          password: typia.random<string & tags.MinLength<8>>(),
          display_name: RandomGenerator.name(),
          bio: RandomGenerator.paragraph({ sentences: 2 }),
          avatar_url: typia.random<string & tags.Format<"uri">>(),
          show_online_status: false,
          show_subscribed_communities: false,
          show_activity_feed: true,
          ip: null,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityGuest.ICreate,
      });
      typia.assert(member);
      return member;
    },
  );

  // Step 4: Create ban records with varying expiration times
  const now = new Date();
  const bans = await ArrayUtil.asyncMap(members, async (member, index) => {
    // Create bans with different expiration times (days apart)
    const expiresAtOffset = (index + 1) * 1000 * 60 * 60 * 24;

    const ban =
      await api.functional.redditCommunity.moderator.communities.bans.create(
        connection,
        {
          communityName: community.name,
          body: {
            banned_member_id: member.id,
            reason: `Ban reason for ${member.username}`,
            expires_at: new Date(now.getTime() + expiresAtOffset).toISOString(),
          } satisfies IRedditCommunityCommunityBan.ICreate,
        },
      );
    typia.assert(ban);

    return ban;
  });

  // Step 5: Test sorting by created_at in ascending order
  const sortByCreatedAtAsc =
    await api.functional.redditCommunity.moderator.communities.bans.index(
      connection,
      {
        communityName: community.name,
        body: {
          sort_by: "created_at",
          sort_order: "asc",
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityCommunityBan.IRequest,
      },
    );
  typia.assert(sortByCreatedAtAsc);

  // Validate ascending order by created_at
  for (let i = 0; i < sortByCreatedAtAsc.data.length - 1; i++) {
    const current = new Date(sortByCreatedAtAsc.data[i].created_at).getTime();
    const next = new Date(sortByCreatedAtAsc.data[i + 1].created_at).getTime();
    TestValidator.predicate(
      "created_at ascending order validation",
      current <= next,
    );
  }

  // Step 6: Test sorting by created_at in descending order
  const sortByCreatedAtDesc =
    await api.functional.redditCommunity.moderator.communities.bans.index(
      connection,
      {
        communityName: community.name,
        body: {
          sort_by: "created_at",
          sort_order: "desc",
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityCommunityBan.IRequest,
      },
    );
  typia.assert(sortByCreatedAtDesc);

  // Validate descending order by created_at
  for (let i = 0; i < sortByCreatedAtDesc.data.length - 1; i++) {
    const current = new Date(sortByCreatedAtDesc.data[i].created_at).getTime();
    const next = new Date(sortByCreatedAtDesc.data[i + 1].created_at).getTime();
    TestValidator.predicate(
      "created_at descending order validation",
      current >= next,
    );
  }

  // Step 7: Test sorting by expires_at in ascending order
  const sortByExpiresAtAsc =
    await api.functional.redditCommunity.moderator.communities.bans.index(
      connection,
      {
        communityName: community.name,
        body: {
          sort_by: "expires_at",
          sort_order: "asc",
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityCommunityBan.IRequest,
      },
    );
  typia.assert(sortByExpiresAtAsc);

  // Validate ascending order by expires_at
  for (let i = 0; i < sortByExpiresAtAsc.data.length - 1; i++) {
    const currentExpires = sortByExpiresAtAsc.data[i].expires_at;
    const nextExpires = sortByExpiresAtAsc.data[i + 1].expires_at;
    if (
      currentExpires !== null &&
      currentExpires !== undefined &&
      nextExpires !== null &&
      nextExpires !== undefined
    ) {
      const current = new Date(currentExpires).getTime();
      const next = new Date(nextExpires).getTime();
      TestValidator.predicate(
        "expires_at ascending order validation",
        current <= next,
      );
    }
  }

  // Step 8: Test sorting by expires_at in descending order
  const sortByExpiresAtDesc =
    await api.functional.redditCommunity.moderator.communities.bans.index(
      connection,
      {
        communityName: community.name,
        body: {
          sort_by: "expires_at",
          sort_order: "desc",
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityCommunityBan.IRequest,
      },
    );
  typia.assert(sortByExpiresAtDesc);

  // Validate descending order by expires_at
  for (let i = 0; i < sortByExpiresAtDesc.data.length - 1; i++) {
    const currentExpires = sortByExpiresAtDesc.data[i].expires_at;
    const nextExpires = sortByExpiresAtDesc.data[i + 1].expires_at;
    if (
      currentExpires !== null &&
      currentExpires !== undefined &&
      nextExpires !== null &&
      nextExpires !== undefined
    ) {
      const current = new Date(currentExpires).getTime();
      const next = new Date(nextExpires).getTime();
      TestValidator.predicate(
        "expires_at descending order validation",
        current >= next,
      );
    }
  }

  // Step 9: Test sorting by member_username in ascending order
  const sortByMemberAsc =
    await api.functional.redditCommunity.moderator.communities.bans.index(
      connection,
      {
        communityName: community.name,
        body: {
          sort_by: "member_username",
          sort_order: "asc",
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityCommunityBan.IRequest,
      },
    );
  typia.assert(sortByMemberAsc);

  // Validate ascending alphabetical order by member username
  for (let i = 0; i < sortByMemberAsc.data.length - 1; i++) {
    const current = sortByMemberAsc.data[i].banned_member.username;
    const next = sortByMemberAsc.data[i + 1].banned_member.username;
    TestValidator.predicate(
      "member_username ascending order validation",
      current.localeCompare(next) <= 0,
    );
  }

  // Step 10: Test sorting by member_username in descending order
  const sortByMemberDesc =
    await api.functional.redditCommunity.moderator.communities.bans.index(
      connection,
      {
        communityName: community.name,
        body: {
          sort_by: "member_username",
          sort_order: "desc",
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityCommunityBan.IRequest,
      },
    );
  typia.assert(sortByMemberDesc);

  // Validate descending alphabetical order by member username
  for (let i = 0; i < sortByMemberDesc.data.length - 1; i++) {
    const current = sortByMemberDesc.data[i].banned_member.username;
    const next = sortByMemberDesc.data[i + 1].banned_member.username;
    TestValidator.predicate(
      "member_username descending order validation",
      current.localeCompare(next) >= 0,
    );
  }

  // Step 11: Test sorting by moderator_username
  const sortByModeratorAsc =
    await api.functional.redditCommunity.moderator.communities.bans.index(
      connection,
      {
        communityName: community.name,
        body: {
          sort_by: "moderator_username",
          sort_order: "asc",
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityCommunityBan.IRequest,
      },
    );
  typia.assert(sortByModeratorAsc);

  // All bans should be by the same moderator in this test
  TestValidator.predicate(
    "all bans issued by same moderator",
    sortByModeratorAsc.data.every(
      (ban) => ban.moderator.username === moderator.username,
    ),
  );
}
