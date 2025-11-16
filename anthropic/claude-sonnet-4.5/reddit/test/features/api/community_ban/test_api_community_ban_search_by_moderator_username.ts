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

export async function test_api_community_ban_search_by_moderator_username(
  connection: api.IConnection,
) {
  // Step 1: Register three moderators
  const moderator1Email = typia.random<string & tags.Format<"email">>();
  const moderator1Password = typia.random<string & tags.MinLength<8>>();
  const moderator1 = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderator1Email,
      password: moderator1Password,
      nickname: RandomGenerator.name(),
      ip: "127.0.0.1",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderator1);

  const moderator2Email = typia.random<string & tags.Format<"email">>();
  const moderator2Password = typia.random<string & tags.MinLength<8>>();
  const moderator2 = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderator2Email,
      password: moderator2Password,
      nickname: RandomGenerator.name(),
      ip: "127.0.0.1",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderator2);

  const moderator3Email = typia.random<string & tags.Format<"email">>();
  const moderator3Password = typia.random<string & tags.MinLength<8>>();
  const moderator3 = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderator3Email,
      password: moderator3Password,
      nickname: RandomGenerator.name(),
      ip: "127.0.0.1",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderator3);

  // Step 2: Moderator1 creates a community (already authenticated from join)
  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          display_title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          rules: RandomGenerator.paragraph({ sentences: 2 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Register four guest accounts to be banned
  const guest1 = await api.functional.auth.guest.join(connection, {
    body: {
      username: RandomGenerator.alphabets(8),
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      ip: "127.0.0.1",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(guest1);

  const guest2 = await api.functional.auth.guest.join(connection, {
    body: {
      username: RandomGenerator.alphabets(8),
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      ip: "127.0.0.1",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(guest2);

  const guest3 = await api.functional.auth.guest.join(connection, {
    body: {
      username: RandomGenerator.alphabets(8),
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      ip: "127.0.0.1",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(guest3);

  const guest4 = await api.functional.auth.guest.join(connection, {
    body: {
      username: RandomGenerator.alphabets(8),
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      ip: "127.0.0.1",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(guest4);

  // Switch back to moderator1 for ban operations
  await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderator1Email,
      password: moderator1Password,
      nickname: RandomGenerator.name(),
      ip: "127.0.0.1",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });

  // Step 4: Moderator1 issues bans to guest1 and guest2
  const ban1 =
    await api.functional.redditCommunity.moderator.communities.bans.create(
      connection,
      {
        communityName: community.name,
        body: {
          banned_member_id: guest1.id,
          reason: "Spam posting by moderator1",
          expires_at: null,
        } satisfies IRedditCommunityCommunityBan.ICreate,
      },
    );
  typia.assert(ban1);

  const ban2 =
    await api.functional.redditCommunity.moderator.communities.bans.create(
      connection,
      {
        communityName: community.name,
        body: {
          banned_member_id: guest2.id,
          reason: "Harassment detected by moderator1",
          expires_at: null,
        } satisfies IRedditCommunityCommunityBan.ICreate,
      },
    );
  typia.assert(ban2);

  // Step 5: Switch to moderator2 authentication
  await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderator2Email,
      password: moderator2Password,
      nickname: RandomGenerator.name(),
      ip: "127.0.0.1",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });

  // Moderator2 issues bans to guest3 and guest4
  const ban3 =
    await api.functional.redditCommunity.moderator.communities.bans.create(
      connection,
      {
        communityName: community.name,
        body: {
          banned_member_id: guest3.id,
          reason: "Rule violation by moderator2",
          expires_at: null,
        } satisfies IRedditCommunityCommunityBan.ICreate,
      },
    );
  typia.assert(ban3);

  const ban4 =
    await api.functional.redditCommunity.moderator.communities.bans.create(
      connection,
      {
        communityName: community.name,
        body: {
          banned_member_id: guest4.id,
          reason: "Offensive content by moderator2",
          expires_at: null,
        } satisfies IRedditCommunityCommunityBan.ICreate,
      },
    );
  typia.assert(ban4);

  // Step 6: Search bans by moderator1's username
  const moderator1BansResult =
    await api.functional.redditCommunity.moderator.communities.bans.index(
      connection,
      {
        communityName: community.name,
        body: {
          moderator_username: moderator1.username,
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityCommunityBan.IRequest,
      },
    );
  typia.assert(moderator1BansResult);

  // Verify only bans issued by moderator1 are returned
  TestValidator.equals(
    "moderator1 issued exactly 2 bans",
    moderator1BansResult.data.length,
    2,
  );

  TestValidator.predicate(
    "all bans in result were issued by moderator1",
    moderator1BansResult.data.every(
      (ban) => ban.moderator.username === moderator1.username,
    ),
  );

  const moderator1BannedMemberIds = moderator1BansResult.data.map(
    (ban) => ban.reddit_community_member_id,
  );
  TestValidator.predicate(
    "moderator1 bans include guest1",
    moderator1BannedMemberIds.includes(guest1.id),
  );
  TestValidator.predicate(
    "moderator1 bans include guest2",
    moderator1BannedMemberIds.includes(guest2.id),
  );

  // Step 7: Search bans by moderator2's username
  const moderator2BansResult =
    await api.functional.redditCommunity.moderator.communities.bans.index(
      connection,
      {
        communityName: community.name,
        body: {
          moderator_username: moderator2.username,
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityCommunityBan.IRequest,
      },
    );
  typia.assert(moderator2BansResult);

  // Verify only bans issued by moderator2 are returned
  TestValidator.equals(
    "moderator2 issued exactly 2 bans",
    moderator2BansResult.data.length,
    2,
  );

  TestValidator.predicate(
    "all bans in result were issued by moderator2",
    moderator2BansResult.data.every(
      (ban) => ban.moderator.username === moderator2.username,
    ),
  );

  const moderator2BannedMemberIds = moderator2BansResult.data.map(
    (ban) => ban.reddit_community_member_id,
  );
  TestValidator.predicate(
    "moderator2 bans include guest3",
    moderator2BannedMemberIds.includes(guest3.id),
  );
  TestValidator.predicate(
    "moderator2 bans include guest4",
    moderator2BannedMemberIds.includes(guest4.id),
  );

  // Step 8: Search bans by moderator3's username (who issued no bans)
  const moderator3BansResult =
    await api.functional.redditCommunity.moderator.communities.bans.index(
      connection,
      {
        communityName: community.name,
        body: {
          moderator_username: moderator3.username,
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityCommunityBan.IRequest,
      },
    );
  typia.assert(moderator3BansResult);

  // Verify empty results for moderator who issued no bans
  TestValidator.equals(
    "moderator3 issued no bans",
    moderator3BansResult.data.length,
    0,
  );
}
