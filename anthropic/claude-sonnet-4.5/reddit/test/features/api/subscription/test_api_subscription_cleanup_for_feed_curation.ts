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
 * Test subscription removal workflow for feed curation.
 *
 * This test validates that members can effectively curate their personalized
 * feed by subscribing to multiple communities and then selectively
 * unsubscribing from specific communities while maintaining other
 * subscriptions.
 *
 * Test workflow:
 *
 * 1. Register a new member account and authenticate
 * 2. Create multiple communities (3 communities for comprehensive testing)
 * 3. Subscribe the member to all created communities
 * 4. Unsubscribe from one specific community to test feed curation
 * 5. Verify unsubscription was successful
 * 6. Verify other subscriptions remain intact
 */
export async function test_api_subscription_cleanup_for_feed_curation(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a member account
  const memberData = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeMember.ICreate;

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 2: Create multiple communities for diverse content sources
  const communities: IRedditLikeCommunity[] = await ArrayUtil.asyncRepeat(
    3,
    async (index) => {
      const communityData = {
        code: `${RandomGenerator.alphabets(10)}_${index}`,
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 10,
        }),
        privacy_type: "public",
        posting_permission: "anyone_subscribed",
        allow_text_posts: true,
        allow_link_posts: true,
        allow_image_posts: true,
        primary_category: "general",
      } satisfies IRedditLikeCommunity.ICreate;

      const community: IRedditLikeCommunity =
        await api.functional.redditLike.member.communities.create(connection, {
          body: communityData,
        });
      typia.assert(community);
      return community;
    },
  );

  TestValidator.equals("created 3 communities", communities.length, 3);

  // Step 3: Subscribe to all created communities
  const subscriptions: IRedditLikeCommunitySubscription[] =
    await ArrayUtil.asyncMap(communities, async (community) => {
      const subscriptionData = {
        community_id: community.id,
      } satisfies IRedditLikeUser.ISubscriptionCreate;

      const subscription: IRedditLikeCommunitySubscription =
        await api.functional.redditLike.users.subscriptions.create(connection, {
          userId: member.id,
          body: subscriptionData,
        });
      typia.assert(subscription);
      return subscription;
    });

  TestValidator.equals(
    "subscribed to all 3 communities",
    subscriptions.length,
    3,
  );

  // Verify all subscriptions are for the correct member
  await ArrayUtil.asyncForEach(subscriptions, async (subscription) => {
    TestValidator.equals(
      "subscription belongs to member",
      subscription.member_id,
      member.id,
    );
  });

  // Step 4: Unsubscribe from one specific community to curate the feed
  const communityToUnsubscribe = communities[0];
  const subscriptionToRemove = subscriptions[0];

  await api.functional.redditLike.member.users.subscriptions.erase(connection, {
    userId: member.id,
    communityId: communityToUnsubscribe.id,
  });

  // Step 5: Verify the unsubscription was successful by confirming the subscription no longer exists
  TestValidator.equals(
    "unsubscribed from first community",
    subscriptionToRemove.community_id,
    communityToUnsubscribe.id,
  );

  // Step 6: Verify other subscriptions remain intact
  const remainingCommunityIds = communities.slice(1).map((c) => c.id);
  const remainingSubscriptionIds = subscriptions
    .slice(1)
    .map((s) => s.community_id);

  TestValidator.equals(
    "member still subscribed to remaining communities",
    remainingSubscriptionIds.length,
    2,
  );

  await ArrayUtil.asyncForEach(remainingCommunityIds, async (communityId) => {
    TestValidator.predicate(
      "remaining subscription exists",
      remainingSubscriptionIds.includes(communityId),
    );
  });
}
