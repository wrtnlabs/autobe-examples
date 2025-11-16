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
 * Test the complete workflow of a moderator retrieving ban appeal details for
 * review.
 *
 * This scenario validates that moderators can access detailed appeal
 * information for bans issued in communities they moderate. The test ensures
 * proper moderator authentication and authorization, and verifies that all
 * appeal fields are correctly retrieved for moderation review.
 *
 * Steps:
 *
 * 1. Create moderator and community
 * 2. Create member account
 * 3. Ban member from community
 * 4. Member submits appeal
 * 5. Moderator retrieves appeal details by ID
 *
 * Validate that moderator can access the appeal, response includes complete
 * appeal information (appeal_text, status, timestamps, community_ban
 * relationship), and all data is accurate for moderation review interface.
 */
export async function test_api_ban_appeal_retrieval_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = typia.random<string & tags.MinLength<8>>();
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

  // Step 2: Moderator creates a community
  const communityName = RandomGenerator.alphabets(10);
  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: communityName,
          display_title: RandomGenerator.paragraph({ sentences: 2 }),
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
  const memberPassword = typia.random<string & tags.MinLength<8>>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: memberEmail,
      password: memberPassword,
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
  typia.assert(member);

  // Step 4: Switch back to moderator and ban the member
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ILogin,
  });

  const banReason = "Repeated spam posting in violation of community rule #3";
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

  // Step 5: Switch to member and submit ban appeal
  await api.functional.auth.member.login(connection, {
    body: {
      username: member.username,
      email: memberEmail,
      password: memberPassword,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ILogin,
  });

  const appealText =
    "I sincerely apologize for the spam posts. I was not aware of the community rules regarding promotional content. I have read and understood all the rules now and promise to contribute meaningful content going forward. Please consider lifting my ban as I wish to remain a productive member of this community.";
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

  // Step 6: Switch back to moderator and retrieve appeal details
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

  // Step 7: Validate retrieved appeal details
  TestValidator.equals("appeal ID matches", retrievedAppeal.id, appeal.id);
  TestValidator.equals(
    "appeal text matches submitted text",
    retrievedAppeal.appeal_text,
    appealText,
  );
  TestValidator.equals(
    "appeal status is pending",
    retrievedAppeal.status,
    "pending",
  );
  TestValidator.equals(
    "appeal ban ID matches",
    retrievedAppeal.reddit_community_community_ban_id,
    ban.id,
  );
  TestValidator.equals(
    "moderator response is null for pending appeal",
    retrievedAppeal.moderator_response,
    null,
  );
  TestValidator.equals(
    "reviewing moderator ID is null for pending appeal",
    retrievedAppeal.reddit_community_moderator_id,
    null,
  );

  // Validate timestamps are present
  TestValidator.predicate(
    "created_at timestamp exists",
    !!retrievedAppeal.created_at,
  );
  TestValidator.predicate(
    "updated_at timestamp exists",
    !!retrievedAppeal.updated_at,
  );
  TestValidator.equals(
    "deleted_at is null for active appeal",
    retrievedAppeal.deleted_at,
    null,
  );
}
