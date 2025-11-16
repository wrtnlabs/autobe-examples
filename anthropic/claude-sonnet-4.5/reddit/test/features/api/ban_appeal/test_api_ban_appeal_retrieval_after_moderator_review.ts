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
 * Test ban appeal submission and retrieval workflow.
 *
 * This test validates the ban appeal creation and retrieval process. Since no
 * moderator review API endpoint exists in the provided materials, this test
 * focuses on:
 *
 * 1. Creating the necessary context (moderator, community, member, ban)
 * 2. Member successfully submitting a ban appeal
 * 3. Member retrieving the submitted appeal
 * 4. Validating appeal data integrity and initial status
 *
 * Steps:
 *
 * 1. Create moderator account and authenticate
 * 2. Moderator creates a community
 * 3. Create member account and authenticate
 * 4. Moderator bans the member from the community
 * 5. Member submits a ban appeal with detailed reasoning
 * 6. Member retrieves the appeal
 * 7. Validate appeal properties (status, text, IDs, timestamps)
 */
export async function test_api_ban_appeal_retrieval_after_moderator_review(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "ModeratorPass123";

  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        nickname: RandomGenerator.name(),
        ip: "127.0.0.1",
        href: "https://example.com/moderator/join",
        referrer: "https://example.com",
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Moderator creates community
  const communityName = RandomGenerator.alphaNumeric(15).toLowerCase();
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: communityName,
          display_title: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  TestValidator.equals("community name matches", community.name, communityName);

  // Step 3: Create and authenticate member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "MemberPass123";
  const memberUsername = RandomGenerator.alphaNumeric(12).toLowerCase();

  const member: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: memberUsername,
        email: memberEmail,
        password: memberPassword,
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        avatar_url: typia.random<string & tags.Format<"uri">>(),
        show_online_status: false,
        show_subscribed_communities: false,
        show_activity_feed: true,
        ip: "127.0.0.1",
        href: "https://example.com/member/join",
        referrer: "https://example.com",
      } satisfies IRedditCommunityGuest.ICreate,
    });
  typia.assert(member);
  TestValidator.equals(
    "member username matches",
    member.username,
    memberUsername,
  );

  // Step 4: Switch to moderator and ban the member
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      ip: "127.0.0.1",
      href: "https://example.com/moderator/login",
      referrer: "https://example.com",
    } satisfies IRedditCommunityCommunityModerator.ILogin,
  });

  const banReason =
    "Violation of community guidelines: repeated spam posting and disruptive behavior";
  const ban: IRedditCommunityCommunityBan =
    await api.functional.redditCommunity.moderator.communities.bans.create(
      connection,
      {
        communityName: communityName,
        body: {
          banned_member_id: member.id,
          reason: banReason,
          expires_at: null,
        } satisfies IRedditCommunityCommunityBan.ICreate,
      },
    );
  typia.assert(ban);
  TestValidator.equals("ban status is active", ban.status, "active");
  TestValidator.equals("ban reason preserved", ban.reason, banReason);
  TestValidator.equals(
    "banned member ID matches",
    ban.reddit_community_member_id,
    member.id,
  );

  // Step 5: Switch to member and submit appeal
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      ip: "127.0.0.1",
      href: "https://example.com/member/login",
      referrer: "https://example.com",
    } satisfies IRedditCommunityGuest.ILogin,
  });

  const appealText =
    "I sincerely apologize for my previous actions that led to this ban. After reviewing the community guidelines thoroughly, I now understand that my posts were inappropriate and disruptive. I was not aware that sharing multiple similar links would be considered spam. I have learned from this experience and promise to follow all community rules moving forward. I respectfully request reconsideration of this ban and the opportunity to contribute positively to this community.";

  const appeal: IRedditCommunityBanAppeal =
    await api.functional.redditCommunity.member.bans.appeal.create(connection, {
      banId: ban.id,
      body: {
        appeal_text: appealText,
        ip: "127.0.0.1",
        href: "https://example.com/member/appeal",
        referrer: "https://example.com/member/bans",
      } satisfies IRedditCommunityBanAppeal.ICreate,
    });
  typia.assert(appeal);
  TestValidator.equals("appeal status is pending", appeal.status, "pending");
  TestValidator.equals(
    "appeal text matches submitted text",
    appeal.appeal_text,
    appealText,
  );
  TestValidator.equals(
    "appeal references correct ban",
    appeal.reddit_community_community_ban_id,
    ban.id,
  );

  // Step 6: Member retrieves the appeal to verify it was created correctly
  const retrievedAppeal: IRedditCommunityBanAppeal =
    await api.functional.redditCommunity.member.banAppeals.at(connection, {
      appealId: appeal.id,
    });
  typia.assert(retrievedAppeal);

  // Step 7: Validate retrieved appeal matches created appeal
  TestValidator.equals(
    "retrieved appeal ID matches",
    retrievedAppeal.id,
    appeal.id,
  );
  TestValidator.equals(
    "retrieved appeal status is pending",
    retrievedAppeal.status,
    "pending",
  );
  TestValidator.equals(
    "retrieved appeal text preserved",
    retrievedAppeal.appeal_text,
    appealText,
  );
  TestValidator.equals(
    "retrieved appeal ban reference preserved",
    retrievedAppeal.reddit_community_community_ban_id,
    ban.id,
  );

  // Validate timestamps are properly set
  const createdTime = new Date(retrievedAppeal.created_at).getTime();
  const updatedTime = new Date(retrievedAppeal.updated_at).getTime();
  TestValidator.predicate(
    "created_at is valid timestamp",
    !isNaN(createdTime) && createdTime > 0,
  );
  TestValidator.predicate(
    "updated_at is valid timestamp",
    !isNaN(updatedTime) && updatedTime > 0,
  );
  TestValidator.predicate(
    "updated_at equals or after created_at",
    updatedTime >= createdTime,
  );

  // Validate moderator response fields are null for pending appeals
  TestValidator.equals(
    "moderator response is null for pending appeal",
    retrievedAppeal.moderator_response,
    null,
  );
  TestValidator.equals(
    "moderator ID is null for pending appeal",
    retrievedAppeal.reddit_community_moderator_id,
    null,
  );
}
