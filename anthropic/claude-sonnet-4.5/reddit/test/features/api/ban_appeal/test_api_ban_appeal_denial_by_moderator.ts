import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityBanAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityBanAppeal";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityBan";
import type { IRedditCommunityCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityMember";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test the workflow where a moderator denies a ban appeal, maintaining the ban
 * and providing explanation to the appealing member.
 *
 * This scenario validates that:
 *
 * 1. A moderator creates a community and bans a member
 * 2. The banned member submits an appeal requesting ban removal
 * 3. The moderator reviews and denies the appeal with detailed reasoning
 * 4. The appeal status updates to 'denied'
 * 5. The moderator's denial explanation is recorded and accessible
 * 6. The appeal record reflects the reviewing moderator's identity
 *
 * Validates business logic for maintaining bans when appeals are rejected,
 * proper status transitions, and transparency in moderation decisions.
 */
export async function test_api_ban_appeal_denial_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "moderator123";
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
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          display_title: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create and authenticate as member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "member123";
  const member: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphabets(8),
        email: memberEmail,
        password: memberPassword,
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

  // Step 4: Switch to moderator and ban the member
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ILogin,
  });

  const ban: IRedditCommunityCommunityBan =
    await api.functional.redditCommunity.moderator.communities.bans.create(
      connection,
      {
        communityName: community.name,
        body: {
          banned_member_id: member.id,
          reason: "Violation of community rules: spam posting and harassment",
          expires_at: null,
        } satisfies IRedditCommunityCommunityBan.ICreate,
      },
    );
  typia.assert(ban);
  TestValidator.equals("ban status is active", ban.status, "active");

  // Step 5: Switch to member and submit ban appeal
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ILogin,
  });

  const appeal: IRedditCommunityBanAppeal =
    await api.functional.redditCommunity.member.bans.appeal.create(connection, {
      banId: ban.id,
      body: {
        appeal_text:
          "I believe this ban was unfair. I was not spamming, I was sharing relevant information with the community. I have carefully reviewed the community rules and understand them now. I promise to follow all guidelines moving forward and contribute positively to the community.",
        ip: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityBanAppeal.ICreate,
    });
  typia.assert(appeal);
  TestValidator.equals("appeal status is pending", appeal.status, "pending");

  // Step 6: Switch back to moderator and deny the appeal
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ILogin,
  });

  const deniedAppeal: IRedditCommunityBanAppeal =
    await api.functional.redditCommunity.moderator.banAppeals.update(
      connection,
      {
        appealId: appeal.id,
        body: {
          status: "denied",
          moderator_response:
            "After careful review of your appeal and the evidence, the ban will remain in place. The pattern of spam posting was clear and documented. We encourage you to reflect on the community standards before any future participation.",
        } satisfies IRedditCommunityBanAppeal.IUpdate,
      },
    );
  typia.assert(deniedAppeal);

  // Step 7: Validate appeal status is denied
  TestValidator.equals(
    "appeal status is denied after moderator review",
    deniedAppeal.status,
    "denied",
  );

  // Step 8: Validate moderator's denial explanation is recorded
  typia.assertGuard(deniedAppeal.moderator_response!);
  TestValidator.predicate(
    "moderator response contains explanation",
    deniedAppeal.moderator_response.length > 0,
  );

  // Step 9: Validate the reviewing moderator's identity is recorded
  TestValidator.equals(
    "reviewing moderator ID is recorded",
    deniedAppeal.reddit_community_moderator_id,
    moderator.id,
  );
}
