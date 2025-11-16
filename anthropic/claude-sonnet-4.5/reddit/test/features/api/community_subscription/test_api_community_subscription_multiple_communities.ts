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
 * Test that a single member can successfully subscribe to multiple different
 * communities.
 *
 * This test validates the many-to-many relationship between members and
 * communities by creating multiple communities and having a single member
 * subscribe to all of them. It ensures that concurrent subscriptions are
 * properly maintained and that each subscription is created independently
 * without conflicts.
 *
 * Test Flow:
 *
 * 1. Create moderator account for community management
 * 2. Create multiple communities (3) with distinct properties
 * 3. Create member account for subscription testing
 * 4. Subscribe the member to all created communities sequentially
 * 5. Validate each subscription is created correctly with proper data
 */
export async function test_api_community_subscription_multiple_communities(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account to create communities
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      nickname: RandomGenerator.name(),
      ip: "127.0.0.1",
      href: "https://example.com/moderator/join" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com" satisfies string & tags.Format<"uri">,
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create multiple communities (3 communities for diverse interests)
  const communityCount = 3;
  const communities: IRedditCommunityCommunity[] = [];

  const communityTopics = ["technology", "gaming", "cooking"] as const;

  for (let i = 0; i < communityCount; i++) {
    const topic = communityTopics[i];
    const communityName =
      `${topic}_${RandomGenerator.alphaNumeric(6)}`.toLowerCase();

    const community =
      await api.functional.redditCommunity.moderator.communities.create(
        connection,
        {
          body: {
            name: communityName satisfies string &
              tags.MinLength<3> &
              tags.MaxLength<21> &
              tags.Pattern<"^[a-z0-9_]+$">,
            display_title:
              `${topic.charAt(0).toUpperCase() + topic.slice(1)} Community` satisfies string &
                tags.MaxLength<100>,
            description:
              `A community for ${topic} enthusiasts to share and discuss` satisfies string &
                tags.MaxLength<500>,
            rules:
              `Be respectful and stay on topic about ${topic}` satisfies string &
                tags.MaxLength<500>,
            icon_url: `https://example.com/icons/${topic}.png` satisfies
              | (string & tags.Format<"uri">)
              | null
              | undefined,
            banner_url: `https://example.com/banners/${topic}.jpg` satisfies
              | (string & tags.Format<"uri">)
              | null
              | undefined,
          } satisfies IRedditCommunityCommunity.ICreate,
        },
      );
    typia.assert(community);
    communities.push(community);
  }

  TestValidator.equals(
    "all communities created",
    communities.length,
    communityCount,
  );

  // Step 3: Create member account for subscription testing
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: `user_${RandomGenerator.alphaNumeric(8)}` satisfies string &
        tags.MinLength<3> &
        tags.MaxLength<50>,
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name() satisfies
        | (string & tags.MaxLength<50>)
        | null
        | undefined,
      bio: RandomGenerator.paragraph({ sentences: 2 }) satisfies
        | (string & tags.MaxLength<500>)
        | null
        | undefined,
      avatar_url: "https://example.com/avatar.png" satisfies
        | (string & tags.Format<"uri">)
        | null
        | undefined,
      show_online_status: false,
      show_subscribed_communities: true,
      show_activity_feed: true,
      ip: "127.0.0.1",
      href: "https://example.com/member/join" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com" satisfies string & tags.Format<"uri">,
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(member);

  // Step 4: Subscribe member to all created communities
  const subscriptions: IRedditCommunityCommunitySubscription[] = [];

  for (const community of communities) {
    const subscription =
      await api.functional.redditCommunity.member.communities.subscriptions.create(
        connection,
        {
          communityName: community.name,
        },
      );
    typia.assert(subscription);

    // Validate subscription contains correct community information
    TestValidator.equals(
      "subscription community ID matches",
      subscription.id,
      community.id,
    );

    TestValidator.equals(
      "subscription community name matches",
      subscription.name,
      community.name,
    );

    subscriptions.push(subscription);
  }

  // Step 5: Validate all subscriptions were created successfully
  TestValidator.equals(
    "all subscriptions created",
    subscriptions.length,
    communityCount,
  );

  // Verify each subscription is unique and contains valid data
  const subscriptionIds = subscriptions.map((s) => s.id);
  const uniqueIds = new Set(subscriptionIds);

  TestValidator.equals(
    "all subscriptions are unique",
    uniqueIds.size,
    communityCount,
  );

  // Verify subscriber counts
  for (const subscription of subscriptions) {
    TestValidator.predicate(
      "community has at least one subscriber",
      subscription.subscriber_count >= 1,
    );
  }
}
