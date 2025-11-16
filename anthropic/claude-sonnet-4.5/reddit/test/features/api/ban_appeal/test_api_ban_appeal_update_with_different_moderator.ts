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
 * Test that any moderator with authority in the community can review and update
 * ban appeals.
 *
 * This test validates distributed moderation responsibility by ensuring that:
 *
 * 1. First moderator creates community and bans a member
 * 2. Banned member submits appeal
 * 3. Second moderator (different from banner) successfully reviews the appeal
 * 4. Appeal record correctly identifies the reviewing moderator (second moderator)
 * 5. System validates moderator authority based on community context, not original
 *    ban issuer
 *
 * This confirms that any community moderator can process appeals, not just the
 * moderator who issued the original ban, enabling proper distributed moderation
 * workflows.
 */
export async function test_api_ban_appeal_update_with_different_moderator(
  connection: api.IConnection,
) {
  // Step 1: First moderator joins and authenticates
  const moderator1Email = typia.random<string & tags.Format<"email">>();
  const moderator1 = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderator1Email,
      password: "moderator1pass",
      nickname: RandomGenerator.name(),
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderator1);

  // Step 2: First moderator creates a community
  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10).toLowerCase(),
          display_title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          rules: RandomGenerator.paragraph({ sentences: 2 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Member joins and authenticates
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: memberEmail,
      password: "memberpass",
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

  // Step 4: Switch back to moderator1 and ban the member
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderator1Email,
      password: "moderator1pass",
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ILogin,
  });

  const ban =
    await api.functional.redditCommunity.moderator.communities.bans.create(
      connection,
      {
        communityName: community.name,
        body: {
          banned_member_id: member.id,
          reason: "Violation of community guidelines",
          expires_at: null,
        } satisfies IRedditCommunityCommunityBan.ICreate,
      },
    );
  typia.assert(ban);

  // Step 5: Switch to member and submit ban appeal
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "memberpass",
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ILogin,
  });

  const appeal = await api.functional.redditCommunity.member.bans.appeal.create(
    connection,
    {
      banId: ban.id,
      body: {
        appeal_text: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 10,
          sentenceMax: 15,
        }),
        ip: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityBanAppeal.ICreate,
    },
  );
  typia.assert(appeal);

  // Validate initial appeal status is pending
  TestValidator.equals("appeal status is pending", appeal.status, "pending");

  // Step 6: Second moderator joins and authenticates
  const moderator2Email = typia.random<string & tags.Format<"email">>();
  const moderator2 = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderator2Email,
      password: "moderator2pass",
      nickname: RandomGenerator.name(),
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderator2);

  // Step 7: Second moderator reviews and updates the appeal
  const updatedAppeal =
    await api.functional.redditCommunity.moderator.banAppeals.update(
      connection,
      {
        appealId: appeal.id,
        body: {
          status: "approved",
          moderator_response:
            "After careful review, we have decided to lift your ban. Please follow community guidelines in the future.",
        } satisfies IRedditCommunityBanAppeal.IUpdate,
      },
    );
  typia.assert(updatedAppeal);

  // Step 8: Validate appeal was updated correctly
  TestValidator.equals(
    "appeal status is approved",
    updatedAppeal.status,
    "approved",
  );
  TestValidator.equals(
    "reviewing moderator is moderator2",
    updatedAppeal.reddit_community_moderator_id,
    moderator2.id,
  );
  TestValidator.predicate(
    "moderator response is recorded",
    updatedAppeal.moderator_response !== null &&
      updatedAppeal.moderator_response !== undefined,
  );

  // Validate that the reviewing moderator is different from the ban issuer
  TestValidator.notEquals(
    "reviewing moderator differs from ban issuer",
    moderator2.id,
    moderator1.id,
  );
}
