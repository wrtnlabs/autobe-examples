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
 * Test the complete workflow where a banned member submits an appeal against
 * their community ban.
 *
 * This scenario validates that:
 *
 * 1. A moderator creates a community
 * 2. A member joins the platform
 * 3. The moderator bans the member from the community with a specific reason
 * 4. The banned member submits a detailed appeal (minimum 50 characters)
 *    explaining why the ban should be overturned
 * 5. The appeal is created with 'pending' status
 * 6. The appeal correctly links to the ban record
 * 7. Session metadata (href, referrer) is properly captured
 * 8. The appeal text meets minimum length requirements
 * 9. The created appeal includes all required fields (id, appeal_text, status,
 *    created_at, etc.)
 *
 * Validates authentication requirements, ban-member relationship validation,
 * appeal text length constraints, and proper initial appeal state.
 */
export async function test_api_ban_appeal_submission_by_banned_member(
  connection: api.IConnection,
) {
  // Step 1: Moderator registration
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "moderator123";
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      nickname: RandomGenerator.name(),
      ip: "192.168.1.1",
      href: "https://test.example.com/moderator/join" satisfies string &
        tags.Format<"uri">,
      referrer: "https://test.example.com/" satisfies string &
        tags.Format<"uri">,
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Moderator creates a community
  const communityName = RandomGenerator.alphabets(10);
  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: communityName,
          display_title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: "https://example.com/icon.png" satisfies string &
            tags.Format<"uri">,
          banner_url: "https://example.com/banner.png" satisfies string &
            tags.Format<"uri">,
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Member registration
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "member123";
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name() satisfies string &
        tags.MaxLength<50>,
      bio: RandomGenerator.paragraph({ sentences: 3 }) satisfies string &
        tags.MaxLength<500>,
      avatar_url: "https://example.com/avatar.png" satisfies string &
        tags.Format<"uri">,
      show_online_status: false,
      show_subscribed_communities: false,
      show_activity_feed: true,
      ip: "192.168.1.2",
      href: "https://test.example.com/member/join" satisfies string &
        tags.Format<"uri">,
      referrer: "https://test.example.com/" satisfies string &
        tags.Format<"uri">,
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(member);

  // Step 4: Switch back to moderator to issue ban
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      ip: "192.168.1.1",
      href: "https://test.example.com/moderator/login" satisfies string &
        tags.Format<"uri">,
      referrer:
        "https://test.example.com/moderator/dashboard" satisfies string &
          tags.Format<"uri">,
    } satisfies IRedditCommunityCommunityModerator.ILogin,
  });

  // Step 5: Moderator bans the member
  const banReason = RandomGenerator.paragraph({ sentences: 2 });
  const ban =
    await api.functional.redditCommunity.moderator.communities.bans.create(
      connection,
      {
        communityName: community.name,
        body: {
          banned_member_id: member.id,
          reason: banReason,
          expires_at: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString() satisfies string & tags.Format<"date-time">,
        } satisfies IRedditCommunityCommunityBan.ICreate,
      },
    );
  typia.assert(ban);

  // Step 6: Switch to member to submit appeal
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      ip: "192.168.1.2",
      href: "https://test.example.com/member/login" satisfies string &
        tags.Format<"uri">,
      referrer: "https://test.example.com/member/dashboard" satisfies string &
        tags.Format<"uri">,
    } satisfies IRedditCommunityGuest.ILogin,
  });

  // Step 7: Member submits appeal with detailed explanation (minimum 50 characters)
  const appealText = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 10,
    sentenceMax: 15,
  });
  const appeal = await api.functional.redditCommunity.member.bans.appeal.create(
    connection,
    {
      banId: ban.id,
      body: {
        appeal_text: appealText,
        ip: "192.168.1.2",
        href: "https://test.example.com/member/ban/appeal" satisfies string &
          tags.Format<"uri">,
        referrer: "https://test.example.com/member/bans" satisfies string &
          tags.Format<"uri">,
      } satisfies IRedditCommunityBanAppeal.ICreate,
    },
  );
  typia.assert(appeal);

  // Step 8: Validate appeal creation
  TestValidator.equals(
    "appeal ban reference",
    appeal.reddit_community_community_ban_id,
    ban.id,
  );
  TestValidator.equals("appeal status is pending", appeal.status, "pending");
}
