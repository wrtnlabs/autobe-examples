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
 * Test the complete workflow of a banned member retrieving their own ban appeal
 * details.
 *
 * This test validates that a member who has been banned from a community can
 * successfully submit an appeal and then retrieve the full appeal information
 * including appeal text, status, timestamps, and moderator response if
 * available.
 *
 * Steps:
 *
 * 1. Create moderator account and community
 * 2. Create member account
 * 3. Ban the member from the community
 * 4. Member submits a ban appeal
 * 5. Member retrieves their appeal by ID
 * 6. Validate response includes all fields with correct values
 * 7. Verify status is 'pending' initially
 * 8. Verify moderator_response is null before review
 */
export async function test_api_ban_appeal_retrieval_by_banned_member(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "SecureMod123!";

  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        nickname: RandomGenerator.name(),
        ip: "192.168.1.1",
        href: "https://reddit-community.example.com/moderator/join" satisfies string &
          tags.Format<"uri">,
        referrer: "https://reddit-community.example.com/home" satisfies string &
          tags.Format<"uri">,
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create a test community
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
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "MemberPass456!";

  const member: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphabets(12),
        email: memberEmail,
        password: memberPassword,
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        avatar_url: typia.random<string & tags.Format<"uri">>(),
        show_online_status: false,
        show_subscribed_communities: false,
        show_activity_feed: true,
        ip: "192.168.1.2",
        href: "https://reddit-community.example.com/member/join" satisfies string &
          tags.Format<"uri">,
        referrer: "https://reddit-community.example.com/" satisfies string &
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
      href: "https://reddit-community.example.com/moderator/login" satisfies string &
        tags.Format<"uri">,
      referrer: "https://reddit-community.example.com/" satisfies string &
        tags.Format<"uri">,
    } satisfies IRedditCommunityCommunityModerator.ILogin,
  });

  // Step 5: Ban the member
  const banReason = "Violation of community rules - spam posting";
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

  // Step 6: Switch to member account to submit appeal
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      ip: "192.168.1.2",
      href: "https://reddit-community.example.com/member/login" satisfies string &
        tags.Format<"uri">,
      referrer: "https://reddit-community.example.com/" satisfies string &
        tags.Format<"uri">,
    } satisfies IRedditCommunityGuest.ILogin,
  });

  // Step 7: Submit ban appeal
  const appealText = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 15,
    sentenceMax: 20,
    wordMin: 4,
    wordMax: 8,
  });
  const appeal: IRedditCommunityBanAppeal =
    await api.functional.redditCommunity.member.bans.appeal.create(connection, {
      banId: ban.id,
      body: {
        appeal_text: appealText,
        ip: "192.168.1.2",
        href: "https://reddit-community.example.com/bans/appeal" satisfies string &
          tags.Format<"uri">,
        referrer:
          "https://reddit-community.example.com/my-bans" satisfies string &
            tags.Format<"uri">,
      } satisfies IRedditCommunityBanAppeal.ICreate,
    });
  typia.assert(appeal);

  // Step 8: Retrieve the appeal by ID
  const retrievedAppeal: IRedditCommunityBanAppeal =
    await api.functional.redditCommunity.member.banAppeals.at(connection, {
      appealId: appeal.id,
    });
  typia.assert(retrievedAppeal);

  // Step 9: Validate all appeal fields
  TestValidator.equals("appeal ID matches", retrievedAppeal.id, appeal.id);
  TestValidator.equals(
    "ban ID matches",
    retrievedAppeal.reddit_community_community_ban_id,
    ban.id,
  );
  TestValidator.equals(
    "appeal text matches",
    retrievedAppeal.appeal_text,
    appealText,
  );
  TestValidator.equals("status is pending", retrievedAppeal.status, "pending");
  TestValidator.equals(
    "moderator response is null",
    retrievedAppeal.moderator_response,
    null,
  );
  TestValidator.equals(
    "moderator ID is null before review",
    retrievedAppeal.reddit_community_moderator_id,
    null,
  );

  // Validate timestamps exist and are valid
  TestValidator.predicate(
    "created_at is valid",
    retrievedAppeal.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is valid",
    retrievedAppeal.updated_at.length > 0,
  );
  TestValidator.equals("deleted_at is null", retrievedAppeal.deleted_at, null);
}
