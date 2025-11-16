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
 * Test the complete moderator appeal review workflow from initial retrieval
 * through decision.
 *
 * This scenario validates that moderators can retrieve pending appeals, review
 * the appeal details including member's appeal text and ban context, and that
 * the appeal contains all necessary information for making informed moderation
 * decisions. The test ensures moderators have access to complete appeal context
 * including the original ban reason, appeal justification, and member history.
 *
 * Steps:
 *
 * 1. Create moderator and community
 * 2. Create member and ban them with specific reason
 * 3. Member submits detailed appeal
 * 4. Moderator retrieves appeal for review
 *
 * Validate that appeal includes all contextual information needed for review:
 * appeal_text, original ban details, member information, timestamps, and
 * current pending status.
 */
export async function test_api_ban_appeal_moderator_review_workflow(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = typia.random<string & tags.MinLength<8>>();
  const moderatorUsername = RandomGenerator.alphaNumeric(10);

  const moderator = await api.functional.auth.moderator.join(connection, {
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

  // Step 2: Create community under moderator authority
  const communityName = RandomGenerator.alphabets(10);
  const community =
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

  // Step 3: Create and authenticate member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.MinLength<8>>();
  const memberUsername = RandomGenerator.alphaNumeric(10);

  const member = await api.functional.auth.member.join(connection, {
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
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(member);

  // Step 4: Switch back to moderator and issue ban against the member
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ILogin,
  });

  const banReason =
    "Repeated violation of community guidelines regarding spam posting and promotional content without disclosure";
  const ban =
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

  // Step 5: Switch to member context and submit detailed appeal
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ILogin,
  });

  const appealText =
    "I believe this ban was issued in error. The posts in question were legitimate community contributions and not spam. I have carefully reviewed the community guidelines and understand the rules regarding promotional content. I respectfully request that the moderation team reconsider this decision as I was attempting to share relevant resources with the community, not engage in spam behavior. I am committed to following all community guidelines moving forward and will ensure proper disclosure for any content that could be considered promotional.";

  const appeal = await api.functional.redditCommunity.member.bans.appeal.create(
    connection,
    {
      banId: ban.id,
      body: {
        appeal_text: appealText,
        ip: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityBanAppeal.ICreate,
    },
  );
  typia.assert(appeal);

  // Step 6: Switch back to moderator and retrieve the appeal for review
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ILogin,
  });

  const retrievedAppeal =
    await api.functional.redditCommunity.moderator.banAppeals.at(connection, {
      appealId: appeal.id,
    });
  typia.assert(retrievedAppeal);

  // Step 7: Validate complete appeal data structure with all contextual information
  TestValidator.equals(
    "appeal ID matches created appeal",
    retrievedAppeal.id,
    appeal.id,
  );
  TestValidator.equals(
    "appeal text matches submitted text",
    retrievedAppeal.appeal_text,
    appealText,
  );
  TestValidator.equals(
    "ban reference ID matches",
    retrievedAppeal.reddit_community_community_ban_id,
    ban.id,
  );
  TestValidator.equals(
    "appeal status is pending review",
    retrievedAppeal.status,
    "pending",
  );
  TestValidator.equals(
    "no moderator response yet",
    retrievedAppeal.moderator_response,
    null,
  );
  TestValidator.equals(
    "no reviewing moderator assigned yet",
    retrievedAppeal.reddit_community_moderator_id,
    null,
  );

  // Validate timestamps are present and valid ISO date-time format
  TestValidator.predicate(
    "created_at timestamp exists",
    retrievedAppeal.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at timestamp exists",
    retrievedAppeal.updated_at.length > 0,
  );

  // Validate appeal is active (not soft-deleted)
  TestValidator.equals(
    "appeal is not deleted",
    retrievedAppeal.deleted_at,
    null,
  );

  // Validate moderator has access to ban context for informed decision-making
  TestValidator.equals(
    "ban reason accessible through ban ID",
    ban.reason,
    banReason,
  );
  TestValidator.equals(
    "banned member ID matches",
    ban.reddit_community_member_id,
    member.id,
  );
  TestValidator.equals(
    "community context available",
    ban.reddit_community_community_id,
    community.id,
  );
}
