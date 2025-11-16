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
 * Test that moderators can only retrieve ban appeals for communities they have
 * moderation authority over.
 *
 * This test validates proper authorization enforcement by creating two
 * moderators, each with their own community containing ban appeals, and
 * verifying that each moderator can only access appeals from their own
 * communities.
 *
 * Steps:
 *
 * 1. Create first moderator account and authenticate
 * 2. First moderator creates their community
 * 3. Create member to be banned in first community
 * 4. First moderator bans the member
 * 5. Banned member submits appeal in first community
 * 6. Create second moderator account and authenticate
 * 7. Second moderator creates their community
 * 8. Create member to be banned in second community
 * 9. Second moderator bans the member
 * 10. Banned member submits appeal in second community
 * 11. First moderator retrieves appeals for their community
 * 12. Second moderator retrieves appeals for their community
 * 13. Validate each moderator only sees appeals from their own community
 */
export async function test_api_ban_appeal_search_moderator_authorization(
  connection: api.IConnection,
) {
  // Store credentials for re-authentication
  const moderatorAEmail = typia.random<string & tags.Format<"email">>();
  const moderatorAPassword = RandomGenerator.alphaNumeric(12);
  const moderatorBEmail = typia.random<string & tags.Format<"email">>();
  const moderatorBPassword = RandomGenerator.alphaNumeric(12);
  const memberAEmail = typia.random<string & tags.Format<"email">>();
  const memberAPassword = RandomGenerator.alphaNumeric(12);
  const memberBEmail = typia.random<string & tags.Format<"email">>();
  const memberBPassword = RandomGenerator.alphaNumeric(12);

  // Step 1: Create first moderator account
  const moderatorA = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorAEmail,
      password: moderatorAPassword,
      nickname: RandomGenerator.name(),
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderatorA);

  // Step 2: First moderator creates their community
  const communityAName = RandomGenerator.alphaNumeric(10).toLowerCase();
  const communityA =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: communityAName,
          display_title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(communityA);

  // Step 3: Create member to be banned in first community
  const memberA = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: memberAEmail,
      password: memberAPassword,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      show_online_status: false,
      show_subscribed_communities: false,
      show_activity_feed: true,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(memberA);

  // Switch to moderator A
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorAEmail,
      password: moderatorAPassword,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ILogin,
  });

  // Step 4: First moderator bans the member
  const banA =
    await api.functional.redditCommunity.moderator.communities.bans.create(
      connection,
      {
        communityName: communityA.name,
        body: {
          banned_member_id: memberA.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
          expires_at: null,
        } satisfies IRedditCommunityCommunityBan.ICreate,
      },
    );
  typia.assert(banA);

  // Switch to member A
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberAEmail,
      password: memberAPassword,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ILogin,
  });

  // Step 5: Banned member submits appeal in first community
  const appealA =
    await api.functional.redditCommunity.member.bans.appeal.create(connection, {
      banId: banA.id,
      body: {
        appeal_text: RandomGenerator.paragraph({ sentences: 10 }),
        ip: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityBanAppeal.ICreate,
    });
  typia.assert(appealA);

  // Step 6: Create second moderator account
  const moderatorB = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorBEmail,
      password: moderatorBPassword,
      nickname: RandomGenerator.name(),
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderatorB);

  // Step 7: Second moderator creates their community
  const communityBName = RandomGenerator.alphaNumeric(10).toLowerCase();
  const communityB =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: communityBName,
          display_title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(communityB);

  // Step 8: Create member to be banned in second community
  const memberB = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: memberBEmail,
      password: memberBPassword,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      show_online_status: false,
      show_subscribed_communities: false,
      show_activity_feed: true,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(memberB);

  // Switch to moderator B
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorBEmail,
      password: moderatorBPassword,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ILogin,
  });

  // Step 9: Second moderator bans the member
  const banB =
    await api.functional.redditCommunity.moderator.communities.bans.create(
      connection,
      {
        communityName: communityB.name,
        body: {
          banned_member_id: memberB.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
          expires_at: null,
        } satisfies IRedditCommunityCommunityBan.ICreate,
      },
    );
  typia.assert(banB);

  // Switch to member B
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberBEmail,
      password: memberBPassword,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ILogin,
  });

  // Step 10: Banned member submits appeal in second community
  const appealB =
    await api.functional.redditCommunity.member.bans.appeal.create(connection, {
      banId: banB.id,
      body: {
        appeal_text: RandomGenerator.paragraph({ sentences: 10 }),
        ip: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityBanAppeal.ICreate,
    });
  typia.assert(appealB);

  // Step 11: Switch to moderator A and retrieve appeals for their community
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorAEmail,
      password: moderatorAPassword,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ILogin,
  });

  const appealsForCommunityA =
    await api.functional.redditCommunity.moderator.communities.banAppeals.index(
      connection,
      {
        communityName: communityA.name,
        body: {
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityBanAppeal.IRequest,
      },
    );
  typia.assert(appealsForCommunityA);

  // Step 12: Switch to moderator B and retrieve appeals for their community
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorBEmail,
      password: moderatorBPassword,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ILogin,
  });

  const appealsForCommunityB =
    await api.functional.redditCommunity.moderator.communities.banAppeals.index(
      connection,
      {
        communityName: communityB.name,
        body: {
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityBanAppeal.IRequest,
      },
    );
  typia.assert(appealsForCommunityB);

  // Step 13: Validate each moderator only sees appeals from their own community
  TestValidator.equals(
    "moderator A should see exactly 1 appeal from community A",
    appealsForCommunityA.pagination.records,
    1,
  );

  TestValidator.equals(
    "moderator B should see exactly 1 appeal from community B",
    appealsForCommunityB.pagination.records,
    1,
  );

  TestValidator.equals(
    "appeal in community A should match the created appeal",
    appealsForCommunityA.data[0].id,
    appealA.id,
  );

  TestValidator.equals(
    "appeal in community B should match the created appeal",
    appealsForCommunityB.data[0].id,
    appealB.id,
  );

  TestValidator.equals(
    "community A appeal should be associated with community A",
    appealsForCommunityA.data[0].community.id,
    communityA.id,
  );

  TestValidator.equals(
    "community B appeal should be associated with community B",
    appealsForCommunityB.data[0].community.id,
    communityB.id,
  );
}
