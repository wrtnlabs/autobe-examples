import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunitySubscription";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeUser";

/**
 * Test retrieving subscription list when a user is subscribed to multiple
 * communities.
 *
 * This test validates the complete workflow of a member subscribing to multiple
 * communities and retrieving their subscription list with proper ordering and
 * metadata.
 *
 * Workflow:
 *
 * 1. Create a member account for testing
 * 2. Create three different communities with varied characteristics (categories,
 *    settings)
 * 3. Subscribe the member to all three communities with time delays
 * 4. Retrieve the user's subscription list
 * 5. Verify all communities appear with correct ordering and metadata
 */
export async function test_api_user_subscriptions_multiple_communities(
  connection: api.IConnection,
) {
  // Step 1: Create member account for multi-community subscription testing
  const memberData = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeMember.ICreate;

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 2: Create three different communities with varied characteristics
  const categories = ["technology", "gaming", "science"] as const;
  const communities: IRedditLikeCommunity[] = [];

  for (let i = 0; i < 3; i++) {
    const communityData = {
      code: RandomGenerator.alphaNumeric(10),
      name: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 7 }),
      description: RandomGenerator.paragraph({
        sentences: 5,
        wordMin: 4,
        wordMax: 8,
      }),
      privacy_type: "public",
      primary_category: categories[i],
    } satisfies IRedditLikeCommunity.ICreate;

    const community: IRedditLikeCommunity =
      await api.functional.redditLike.member.communities.create(connection, {
        body: communityData,
      });
    typia.assert(community);
    communities.push(community);
  }

  // Step 3: Subscribe the member to all three communities with time delays
  const subscriptions: IRedditLikeCommunitySubscription[] = [];

  for (let i = 0; i < communities.length; i++) {
    const subscriptionData = {
      community_id: communities[i].id,
    } satisfies IRedditLikeUser.ISubscriptionCreate;

    const subscription: IRedditLikeCommunitySubscription =
      await api.functional.redditLike.users.subscriptions.create(connection, {
        userId: member.id,
        body: subscriptionData,
      });
    typia.assert(subscription);
    subscriptions.push(subscription);

    // Add small delay to ensure distinct timestamps
    if (i < communities.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  // Step 4: Retrieve the user's subscription list
  const subscriptionList: IPageIRedditLikeCommunitySubscription.ISummary =
    await api.functional.redditLike.users.subscriptions.getByUserid(
      connection,
      {
        userId: member.id,
      },
    );
  typia.assert(subscriptionList);

  // Step 5: Verify all three communities appear correctly
  TestValidator.equals(
    "subscription list should contain 3 communities",
    subscriptionList.data.length,
    3,
  );

  // Verify each subscription has correct structure (typia.assert already validated all types)
  for (let i = 0; i < 3; i++) {
    const subscriptionSummary = subscriptionList.data[i];
    typia.assert(subscriptionSummary);
    typia.assert(subscriptionSummary.community);
  }

  // Verify that all created communities are present in the subscription list
  const subscribedCommunityIds = subscriptionList.data.map(
    (s) => s.community.id,
  );
  const createdCommunityIds = communities.map((c) => c.id);

  for (const createdId of createdCommunityIds) {
    TestValidator.predicate(
      `community ${createdId} should be in subscription list`,
      subscribedCommunityIds.includes(createdId),
    );
  }
}
