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
 * Test ban appeal submission with session metadata capture.
 *
 * This test validates that when a banned member submits an appeal, the system
 * properly captures and stores session metadata including IP address, href
 * (current page URL), and referrer (previous page URL). This metadata is
 * essential for security auditing, detecting appeal spam patterns, and
 * identifying potential ban evasion attempts.
 *
 * Test workflow:
 *
 * 1. Create moderator account and authenticate
 * 2. Create a test community
 * 3. Create member account who will be banned
 * 4. Moderator issues a ban against the member
 * 5. Member submits ban appeal with complete session metadata
 * 6. Verify appeal is created with all session data properly captured
 */
export async function test_api_ban_appeal_with_session_metadata(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = typia.random<string & tags.MinLength<8>>();
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        nickname: RandomGenerator.name(),
        ip: "192.168.1.100",
        href: "https://example.com/moderator/signup" satisfies string &
          tags.Format<"uri">,
        referrer: "https://example.com/home" satisfies string &
          tags.Format<"uri">,
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create a community as moderator
  const communityName = RandomGenerator.alphabets(10);
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: communityName,
          display_title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          rules: RandomGenerator.paragraph({ sentences: 2 }),
          icon_url: "https://example.com/icon.png" satisfies string &
            tags.Format<"uri">,
          banner_url: "https://example.com/banner.png" satisfies string &
            tags.Format<"uri">,
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create and authenticate as member who will be banned
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.MinLength<8>>();
  const member: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphabets(8),
        email: memberEmail,
        password: memberPassword,
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        avatar_url: "https://example.com/avatar.png" satisfies string &
          tags.Format<"uri">,
        show_online_status: true,
        show_subscribed_communities: false,
        show_activity_feed: true,
        ip: "192.168.1.101",
        href: "https://example.com/member/signup" satisfies string &
          tags.Format<"uri">,
        referrer: "https://example.com/home" satisfies string &
          tags.Format<"uri">,
      } satisfies IRedditCommunityGuest.ICreate,
    });
  typia.assert(member);

  // Step 4: Switch back to moderator and ban the member
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      ip: "192.168.1.100",
      href: "https://example.com/moderator/login" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com/home" satisfies string &
        tags.Format<"uri">,
    } satisfies IRedditCommunityCommunityModerator.ILogin,
  });

  const ban: IRedditCommunityCommunityBan =
    await api.functional.redditCommunity.moderator.communities.bans.create(
      connection,
      {
        communityName: community.name,
        body: {
          banned_member_id: member.id,
          reason: "Violation of community rules - spam posting",
          expires_at: null,
        } satisfies IRedditCommunityCommunityBan.ICreate,
      },
    );
  typia.assert(ban);

  // Step 5: Switch to member account and submit appeal with session metadata
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      ip: "203.0.113.45",
      href: "https://example.com/member/login" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com/ban-notice" satisfies string &
        tags.Format<"uri">,
    } satisfies IRedditCommunityGuest.ILogin,
  });

  // Submit ban appeal with complete session metadata for security tracking
  const appeal: IRedditCommunityBanAppeal =
    await api.functional.redditCommunity.member.bans.appeal.create(connection, {
      banId: ban.id,
      body: {
        appeal_text: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 15,
          sentenceMax: 20,
        }),
        ip: "203.0.113.45",
        href: "https://example.com/community/appeal-form" satisfies string &
          tags.Format<"uri">,
        referrer: "https://example.com/community/ban-details" satisfies string &
          tags.Format<"uri">,
      } satisfies IRedditCommunityBanAppeal.ICreate,
    });
  typia.assert(appeal);

  // Step 6: Verify appeal was created successfully
  TestValidator.equals(
    "appeal has correct ban ID",
    appeal.reddit_community_community_ban_id,
    ban.id,
  );
  TestValidator.equals("appeal status is pending", appeal.status, "pending");
  TestValidator.predicate("appeal has valid ID", appeal.id.length > 0);
}
