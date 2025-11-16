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

export async function test_api_ban_appeal_search_by_ban_id(
  connection: api.IConnection,
) {
  // Step 1: Moderator authentication - create and login as moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "moderatorPass123";
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        nickname: RandomGenerator.name(),
        ip: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create a community
  const communityName = RandomGenerator.alphabets(10);
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: communityName,
          display_title: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<(string & tags.Format<"uri">) | null>(),
          banner_url: typia.random<(string & tags.Format<"uri">) | null>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create first member to be banned
  const member1Email = typia.random<string & tags.Format<"email">>();
  const member1: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphabets(10),
        email: member1Email,
        password: "member1Pass123",
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        avatar_url: typia.random<(string & tags.Format<"uri">) | null>(),
        show_online_status: true,
        show_subscribed_communities: false,
        show_activity_feed: true,
        ip: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityGuest.ICreate,
    });
  typia.assert(member1);

  // Step 4: Switch back to moderator to issue ban
  const moderatorRelogin1 = await api.functional.auth.moderator.login(
    connection,
    {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        ip: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ILogin,
    },
  );
  typia.assert(moderatorRelogin1);

  // Step 5: Issue ban to member1 - this is the target ban we'll filter by
  const targetBan: IRedditCommunityCommunityBan =
    await api.functional.redditCommunity.moderator.communities.bans.create(
      connection,
      {
        communityName: community.name,
        body: {
          banned_member_id: member1.id,
          reason: "Spamming the community with promotional content repeatedly",
          expires_at: null,
        } satisfies IRedditCommunityCommunityBan.ICreate,
      },
    );
  typia.assert(targetBan);

  // Step 6: Create second member and issue a different ban (to verify filtering works)
  const member2Email = typia.random<string & tags.Format<"email">>();
  const member2: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphabets(10),
        email: member2Email,
        password: "member2Pass123",
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        avatar_url: null,
        show_online_status: false,
        show_subscribed_communities: true,
        show_activity_feed: true,
        ip: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityGuest.ICreate,
    });
  typia.assert(member2);

  // Switch back to moderator
  const moderatorRelogin2 = await api.functional.auth.moderator.login(
    connection,
    {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        ip: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ILogin,
    },
  );
  typia.assert(moderatorRelogin2);

  // Issue second ban
  const otherBan: IRedditCommunityCommunityBan =
    await api.functional.redditCommunity.moderator.communities.bans.create(
      connection,
      {
        communityName: community.name,
        body: {
          banned_member_id: member2.id,
          reason: "Harassment and inappropriate language towards other members",
          expires_at: null,
        } satisfies IRedditCommunityCommunityBan.ICreate,
      },
    );
  typia.assert(otherBan);

  // Verify bans have different IDs
  TestValidator.notEquals(
    "target ban and other ban should have different IDs",
    targetBan.id,
    otherBan.id,
  );

  // Step 7: Switch to member1 and submit appeal for target ban
  const member1Login = await api.functional.auth.member.login(connection, {
    body: {
      email: member1Email,
      password: "member1Pass123",
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ILogin,
  });
  typia.assert(member1Login);

  const appeal1: IRedditCommunityBanAppeal =
    await api.functional.redditCommunity.member.bans.appeal.create(connection, {
      banId: targetBan.id,
      body: {
        appeal_text:
          "I apologize for my actions. I was not aware that promotional content was against the community rules. I have read the rules carefully now and promise to follow them strictly in the future. Please give me another chance to participate constructively.",
        ip: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityBanAppeal.ICreate,
    });
  typia.assert(appeal1);

  // Step 8: Switch to member2 and submit appeal for the other ban
  const member2Login = await api.functional.auth.member.login(connection, {
    body: {
      email: member2Email,
      password: "member2Pass123",
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ILogin,
  });
  typia.assert(member2Login);

  const appeal2: IRedditCommunityBanAppeal =
    await api.functional.redditCommunity.member.bans.appeal.create(connection, {
      banId: otherBan.id,
      body: {
        appeal_text:
          "I believe this ban was unfair. The interaction was taken out of context and I was defending myself from provocation. I request a review of the conversation logs to show that I was not the aggressor in this situation.",
        ip: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityBanAppeal.ICreate,
    });
  typia.assert(appeal2);

  // Step 9: Switch back to moderator to search appeals filtered by ban_id
  const moderatorRelogin3 = await api.functional.auth.moderator.login(
    connection,
    {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        ip: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ILogin,
    },
  );
  typia.assert(moderatorRelogin3);

  // Step 10: Search for appeals filtered by the target ban_id
  const filteredResults: IPageIRedditCommunityBanAppeal.ISummary =
    await api.functional.redditCommunity.moderator.communities.banAppeals.index(
      connection,
      {
        communityName: community.name,
        body: {
          ban_id: targetBan.id,
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityBanAppeal.IRequest,
      },
    );
  typia.assert(filteredResults);

  // Step 11: Validate filtering results
  TestValidator.predicate(
    "filtered results should contain exactly one appeal",
    filteredResults.data.length === 1,
  );

  TestValidator.equals(
    "filtered appeal should be the one for target ban",
    filteredResults.data[0].id,
    appeal1.id,
  );

  TestValidator.equals(
    "appeal ban reference should match target ban ID",
    filteredResults.data[0].ban.id,
    targetBan.id,
  );

  // Step 12: Verify the other ban's appeal is not included
  const otherAppealIncluded = filteredResults.data.some(
    (appeal) => appeal.id === appeal2.id,
  );
  TestValidator.predicate(
    "appeal for other ban should not be included in filtered results",
    !otherAppealIncluded,
  );

  // Step 13: Search without ban_id filter to verify both appeals exist
  const unfiltered: IPageIRedditCommunityBanAppeal.ISummary =
    await api.functional.redditCommunity.moderator.communities.banAppeals.index(
      connection,
      {
        communityName: community.name,
        body: {
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityBanAppeal.IRequest,
      },
    );
  typia.assert(unfiltered);

  TestValidator.predicate(
    "unfiltered results should contain both appeals",
    unfiltered.data.length === 2,
  );
}
