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
 * Test comprehensive ban appeal submission with detailed explanation
 * approaching maximum character limit.
 *
 * This test validates the complete ban appeal workflow where a banned member
 * submits an appeal with extensive justification text. The scenario ensures
 * proper handling of maximum length appeal text, complete data preservation,
 * and accurate session metadata capture for security auditing.
 *
 * Workflow:
 *
 * 1. Create moderator account and authenticate
 * 2. Moderator creates a community
 * 3. Create member account and authenticate
 * 4. Moderator bans the member from the community
 * 5. Banned member submits detailed appeal with comprehensive explanation
 * 6. Validate appeal text preservation, status, and metadata capture
 */
export async function test_api_ban_appeal_with_detailed_explanation(
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
      ip: "192.168.1.1",
      href: "https://example.com/moderator/join" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com/home" satisfies string &
        tags.Format<"uri">,
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Moderator creates community
  const communityName = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<21> &
      tags.Pattern<"^[a-z0-9_]+$">
  >();
  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: communityName,
          display_title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 10 }),
          rules: RandomGenerator.paragraph({ sentences: 8 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create and authenticate member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.MinLength<8>>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: typia.random<string & tags.MinLength<3> & tags.MaxLength<50>>(),
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 5 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      show_online_status: false,
      show_subscribed_communities: false,
      show_activity_feed: true,
      ip: "192.168.1.100",
      href: "https://example.com/member/join" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com/landing" satisfies string &
        tags.Format<"uri">,
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(member);

  // Step 4: Switch to moderator and ban the member
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      ip: "192.168.1.1",
      href: "https://example.com/moderator/login" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com/home" satisfies string &
        tags.Format<"uri">,
    } satisfies IRedditCommunityCommunityModerator.ILogin,
  });

  const banReason =
    "Repeated violations of community rule #3: No spam or promotional content. Multiple warnings issued without improvement.";
  const ban =
    await api.functional.redditCommunity.moderator.communities.bans.create(
      connection,
      {
        communityName: community.name,
        body: {
          banned_member_id: member.id,
          reason: banReason,
          expires_at: null,
        } satisfies IRedditCommunityCommunityBan.ICreate,
      },
    );
  typia.assert(ban);

  // Step 5: Switch to member and submit detailed appeal
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      ip: "192.168.1.100",
      href: "https://example.com/member/login" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com/bans" satisfies string &
        tags.Format<"uri">,
    } satisfies IRedditCommunityGuest.ILogin,
  });

  // Generate comprehensive appeal text approaching 2000 character maximum
  // Ensure substantial content that meets minimum 50 characters
  const appealTextFull = RandomGenerator.content({
    paragraphs: 5,
    sentenceMin: 35,
    sentenceMax: 45,
    wordMin: 4,
    wordMax: 8,
  });

  // Trim to approach maximum limit while ensuring minimum is met
  const finalAppealText =
    appealTextFull.length > 1950
      ? appealTextFull.substring(0, 1950)
      : appealTextFull;

  const appealHref = "https://example.com/member/bans/appeal" satisfies string &
    tags.Format<"uri">;
  const appealReferrer =
    "https://example.com/member/bans/list" satisfies string &
      tags.Format<"uri">;

  const appeal = await api.functional.redditCommunity.member.bans.appeal.create(
    connection,
    {
      banId: ban.id,
      body: {
        appeal_text: finalAppealText,
        ip: "192.168.1.100",
        href: appealHref,
        referrer: appealReferrer,
      } satisfies IRedditCommunityBanAppeal.ICreate,
    },
  );
  typia.assert(appeal);

  // Step 6: Validate appeal properties
  TestValidator.equals(
    "appeal ban reference matches",
    appeal.reddit_community_community_ban_id,
    ban.id,
  );
  TestValidator.equals(
    "appeal text preserved completely",
    appeal.appeal_text,
    finalAppealText,
  );
  TestValidator.equals("appeal status is pending", appeal.status, "pending");
  TestValidator.predicate(
    "appeal text length is substantial",
    appeal.appeal_text.length >= 50,
  );
  TestValidator.predicate(
    "appeal text within maximum limit",
    appeal.appeal_text.length <= 2000,
  );

  // Check nullable fields explicitly
  if (
    appeal.moderator_response !== null &&
    appeal.moderator_response !== undefined
  ) {
    throw new Error(
      "Expected moderator_response to be null for pending appeal",
    );
  }
  if (
    appeal.reddit_community_moderator_id !== null &&
    appeal.reddit_community_moderator_id !== undefined
  ) {
    throw new Error(
      "Expected reddit_community_moderator_id to be null for pending appeal",
    );
  }
}
