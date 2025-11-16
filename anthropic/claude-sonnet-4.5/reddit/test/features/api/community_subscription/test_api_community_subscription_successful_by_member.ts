import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunitySubscription";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test successful member subscription to a community.
 *
 * This test validates the complete workflow of a member subscribing to an
 * existing community, establishing the subscription relationship that enables
 * community content to appear in their personalized feed.
 *
 * Test workflow:
 *
 * 1. Create a moderator account and authenticate
 * 2. Create a community as the moderator
 * 3. Create a member account and authenticate
 * 4. Subscribe the member to the community
 * 5. Validate the subscription response contains all required fields
 * 6. Verify proper UUID formats and timestamp validity
 */
export async function test_api_community_subscription_successful_by_member(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator for community creation
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);

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

  // Step 2: Create a community as the authenticated moderator
  const communityName = RandomGenerator.alphabets(10);
  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: communityName,
          display_title: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 3,
            wordMax: 7,
          }),
          description: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 5,
            wordMax: 10,
          }),
          rules: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 5,
            wordMax: 8,
          }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create and authenticate member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);

  const member = await api.functional.auth.member.join(connection, {
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
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(member);

  // Step 4: Subscribe the member to the community
  const subscription =
    await api.functional.redditCommunity.member.communities.subscriptions.create(
      connection,
      {
        communityName: communityName,
      },
    );
  typia.assert(subscription);

  // Step 5: Validate subscription response structure and field completeness
  TestValidator.predicate(
    "subscription has valid UUID id",
    typia.is<string & tags.Format<"uuid">>(subscription.id),
  );

  TestValidator.predicate(
    "subscription has valid community name",
    subscription.name === communityName,
  );

  TestValidator.predicate(
    "subscription has valid created_at timestamp",
    typia.is<string & tags.Format<"date-time">>(subscription.created_at),
  );

  TestValidator.predicate(
    "subscription has non-negative subscriber_count",
    subscription.subscriber_count >= 0,
  );

  TestValidator.predicate(
    "subscription has non-negative post_count",
    subscription.post_count >= 0,
  );
}
