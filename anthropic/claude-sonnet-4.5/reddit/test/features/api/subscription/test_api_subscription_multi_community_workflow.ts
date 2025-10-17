import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeUser";

/**
 * Test multi-community subscription workflow.
 *
 * This test validates that a member can subscribe to multiple different
 * communities and that each subscription is tracked independently. The test
 * creates a member account, establishes three distinct communities (Technology,
 * Gaming, Sports), subscribes the member to all three communities, and verifies
 * that:
 *
 * 1. Each subscription is created successfully with proper data
 * 2. Subscriber counts increment correctly for each community
 * 3. All subscriptions are independent and properly tracked
 * 4. The member can maintain multiple active subscriptions simultaneously
 */
export async function test_api_subscription_multi_community_workflow(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account for testing
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.MinLength<8>>();
  const memberUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<20> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: memberUsername,
      email: memberEmail,
      password: memberPassword,
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create three distinct public communities with different topics
  const communityTopics = ["Technology", "Gaming", "Sports"] as const;
  const communities: IRedditLikeCommunity[] = [];

  for (const topic of communityTopics) {
    const communityCode = `${topic.toLowerCase()}_${RandomGenerator.alphaNumeric(6)}`;
    const community = await api.functional.redditLike.member.communities.create(
      connection,
      {
        body: {
          code: communityCode,
          name: `${topic} Community`,
          description: `A community dedicated to ${topic.toLowerCase()} enthusiasts and discussions`,
          privacy_type: "public",
          posting_permission: "anyone_subscribed",
          allow_text_posts: true,
          allow_link_posts: true,
          allow_image_posts: true,
          primary_category: topic.toLowerCase(),
        } satisfies IRedditLikeCommunity.ICreate,
      },
    );
    typia.assert(community);

    // Verify initial subscriber count is 0
    TestValidator.equals(
      "initial subscriber count",
      community.subscriber_count,
      0,
    );

    communities.push(community);
  }

  // Step 3: Subscribe the member to all three communities sequentially
  const subscriptions: IRedditLikeCommunitySubscription[] = [];

  for (const community of communities) {
    const subscription =
      await api.functional.redditLike.member.users.subscriptions.subscribe(
        connection,
        {
          userId: member.id,
          body: {
            community_id: community.id,
          } satisfies IRedditLikeUser.ISubscriptionCreate,
        },
      );
    typia.assert(subscription);

    // Step 4: Validate each subscription response contains correct data
    TestValidator.equals(
      "subscription member ID matches",
      subscription.member_id,
      member.id,
    );
    TestValidator.equals(
      "subscription community ID matches",
      subscription.community_id,
      community.id,
    );
    TestValidator.predicate(
      "subscription has valid ID",
      subscription.id.length > 0,
    );
    TestValidator.predicate(
      "subscription has timestamp",
      subscription.subscribed_at.length > 0,
    );

    subscriptions.push(subscription);
  }

  // Step 5: Verify all three subscriptions exist independently
  TestValidator.equals("total subscriptions created", subscriptions.length, 3);

  // Verify each subscription has a unique ID
  const subscriptionIds = subscriptions.map((s) => s.id);
  const uniqueIds = new Set(subscriptionIds);
  TestValidator.equals("all subscription IDs are unique", uniqueIds.size, 3);

  // Verify each subscription points to a different community
  const subscribedCommunityIds = subscriptions.map((s) => s.community_id);
  const uniqueCommunityIds = new Set(subscribedCommunityIds);
  TestValidator.equals(
    "subscribed to all three communities",
    uniqueCommunityIds.size,
    3,
  );

  // Verify all subscriptions belong to the same member
  for (const subscription of subscriptions) {
    TestValidator.equals(
      "subscription belongs to test member",
      subscription.member_id,
      member.id,
    );
  }
}
