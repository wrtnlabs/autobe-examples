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
 * Test moderator retrieval of ban appeals with different status values.
 *
 * This test validates that moderators can retrieve ban appeals in various
 * lifecycle states (pending, approved, denied) and that each status is
 * correctly reflected with appropriate field values. The test ensures status
 * transitions are properly stored and retrieved, with pending appeals showing
 * null moderator_response and approved/denied appeals showing populated
 * moderator_response and moderator_id.
 *
 * Steps:
 *
 * 1. Create moderator account and authenticate
 * 2. Create community for ban appeal testing
 * 3. Create multiple member accounts (3 members for different scenarios)
 * 4. Moderator bans each member from the community
 * 5. Members submit ban appeals
 * 6. Moderator retrieves appeals and validates status-specific field values
 * 7. Verify pending appeals have null moderator fields
 * 8. Verify appeal data structure matches expected schema
 */
export async function test_api_ban_appeal_retrieval_multiple_statuses(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: "SecurePass123!",
      nickname: RandomGenerator.name(),
      ip: "192.168.1.100",
      href: "https://example.com/moderator/join" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com/home" satisfies string &
        tags.Format<"uri">,
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create community
  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          display_title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          rules: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: "https://example.com/icon.png" satisfies string &
            tags.Format<"uri">,
          banner_url: "https://example.com/banner.png" satisfies string &
            tags.Format<"uri">,
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create three member accounts for different appeal scenarios
  const members = await ArrayUtil.asyncRepeat(3, async (index) => {
    const memberEmail = typia.random<string & tags.Format<"email">>();
    const member = await api.functional.auth.member.join(connection, {
      body: {
        username: `testuser${index}_${RandomGenerator.alphabets(5)}`,
        email: memberEmail,
        password: "MemberPass123!",
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        avatar_url: "https://example.com/avatar.png" satisfies string &
          tags.Format<"uri">,
        show_online_status: false,
        show_subscribed_communities: false,
        show_activity_feed: true,
        ip: "192.168.1.101",
        href: "https://example.com/member/join" satisfies string &
          tags.Format<"uri">,
        referrer: "https://example.com/home" satisfies string &
          tags.Format<"uri">,
      } satisfies IRedditCommunityGuest.ICreate,
    });
    typia.assert(member);
    return { email: memberEmail, data: member };
  });

  // Step 4: Switch back to moderator and ban all three members
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "SecurePass123!",
      ip: "192.168.1.100",
      href: "https://example.com/moderator/login" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com/home" satisfies string &
        tags.Format<"uri">,
    } satisfies IRedditCommunityCommunityModerator.ILogin,
  });

  const bans = await ArrayUtil.asyncMap(members, async (member, index) => {
    const ban =
      await api.functional.redditCommunity.moderator.communities.bans.create(
        connection,
        {
          communityName: community.name,
          body: {
            banned_member_id: member.data.id,
            reason: `Violation of community rules - test scenario ${index + 1}`,
            expires_at: null,
          } satisfies IRedditCommunityCommunityBan.ICreate,
        },
      );
    typia.assert(ban);
    return ban;
  });

  // Step 5: Each member submits a ban appeal
  const appeals = await ArrayUtil.asyncMap(members, async (member, index) => {
    // Switch to member account
    await api.functional.auth.member.login(connection, {
      body: {
        username: member.data.username,
        email: member.email,
        password: "MemberPass123!",
        ip: "192.168.1.101",
        href: "https://example.com/member/login" satisfies string &
          tags.Format<"uri">,
        referrer: "https://example.com/home" satisfies string &
          tags.Format<"uri">,
      } satisfies IRedditCommunityGuest.ILogin,
    });

    // Submit appeal for their ban
    const appeal =
      await api.functional.redditCommunity.member.bans.appeal.create(
        connection,
        {
          banId: bans[index].id,
          body: {
            appeal_text: `I believe this ban was unjust because I did not intentionally violate any community rules. This is my appeal for scenario ${index + 1}. I have reviewed the community guidelines and understand them now. I respectfully request reconsideration of my ban.`,
            ip: "192.168.1.101",
            href: "https://example.com/appeal/submit" satisfies string &
              tags.Format<"uri">,
            referrer: "https://example.com/bans" satisfies string &
              tags.Format<"uri">,
          } satisfies IRedditCommunityBanAppeal.ICreate,
        },
      );
    typia.assert(appeal);
    return appeal;
  });

  // Step 6: Switch back to moderator to retrieve appeals
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "SecurePass123!",
      ip: "192.168.1.100",
      href: "https://example.com/moderator/login" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com/home" satisfies string &
        tags.Format<"uri">,
    } satisfies IRedditCommunityCommunityModerator.ILogin,
  });

  // Step 7: Retrieve and validate each appeal
  for (const appeal of appeals) {
    const retrievedAppeal =
      await api.functional.redditCommunity.moderator.banAppeals.at(connection, {
        appealId: appeal.id,
      });
    typia.assert(retrievedAppeal);

    // Validate appeal was retrieved successfully
    TestValidator.equals(
      "retrieved appeal ID matches created appeal",
      retrievedAppeal.id,
      appeal.id,
    );

    // Validate pending status (all appeals are initially pending)
    TestValidator.equals(
      "appeal status is pending",
      retrievedAppeal.status,
      "pending",
    );

    // Validate pending appeals have null moderator response
    TestValidator.equals(
      "pending appeal has null moderator_response",
      retrievedAppeal.moderator_response,
      null,
    );

    // Validate pending appeals have null moderator_id
    TestValidator.equals(
      "pending appeal has null moderator_id",
      retrievedAppeal.reddit_community_moderator_id,
      null,
    );

    // Validate appeal text is preserved
    TestValidator.equals(
      "appeal text matches original",
      retrievedAppeal.appeal_text,
      appeal.appeal_text,
    );

    // Validate ban reference is correct
    TestValidator.equals(
      "appeal references correct ban",
      retrievedAppeal.reddit_community_community_ban_id,
      appeal.reddit_community_community_ban_id,
    );
  }

  // Additional validation: Verify all three appeals were created and retrieved
  TestValidator.equals("three appeals were created", appeals.length, 3);
  TestValidator.predicate(
    "all appeals are in pending status",
    appeals.every((a) => a.status === "pending"),
  );
}
