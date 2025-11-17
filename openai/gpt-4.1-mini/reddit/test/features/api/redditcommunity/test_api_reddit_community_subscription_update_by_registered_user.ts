import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunitySubscription";
import type { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";

export async function test_api_reddit_community_subscription_update_by_registered_user(
  connection: api.IConnection,
) {
  // 1. Register a new user to obtain authorized user context
  const user: IRedditCommunityRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        email: `user_${RandomGenerator.alphaNumeric(8)}@example.com`,
        password: "1234",
      } satisfies IRedditCommunityRegisteredUser.ICreate,
    });
  typia.assert(user);

  // 2. With this user authenticated, create a Reddit community
  const communityCreateBody: IRedditCommunityCommunity.ICreate = {
    communityName: `community_${RandomGenerator.alphaNumeric(8)}`,
    displayName: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    imageUrl: null,
    isPrivate: false,
  };
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.registeredUser.redditCommunity.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  // 3. Create a subscription to the new community
  const subscriptionCreateBody: IRedditCommunityCommunitySubscription.ICreate =
    {
      community_name: community.communityName,
    };
  const subscription: IRedditCommunityCommunitySubscription =
    await api.functional.redditCommunity.registeredUser.redditCommunity.communities.communitySubscriptions.create(
      connection,
      { communityName: community.communityName, body: subscriptionCreateBody },
    );
  typia.assert(subscription);

  // 4. Update the community subscription to set or clear deleted_at
  //     Simulate an update by toggling deleted_at
  const updateBody: IRedditCommunityCommunitySubscription.IUpdate = {
    deleted_at:
      subscription.deleted_at === null || subscription.deleted_at === undefined
        ? new Date().toISOString()
        : null,
  };

  const updatedSubscription: IRedditCommunityCommunitySubscription =
    await api.functional.redditCommunity.registeredUser.redditCommunity.communities.communitySubscriptions.update(
      connection,
      {
        communityName: community.communityName,
        communitySubscriptionId: subscription.id,
        body: updateBody,
      },
    );
  typia.assert(updatedSubscription);

  // 5. Validate that the updated subscription reflects the requested deleted_at
  TestValidator.equals(
    "subscription deleted_at updated correctly",
    updatedSubscription.deleted_at,
    updateBody.deleted_at,
  );

  // 6. Try to update the subscription as a different user - should fail
  // Create a different user
  const user2: IRedditCommunityRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        email: `user_${RandomGenerator.alphaNumeric(8)}@example.com`,
        password: "1234",
      } satisfies IRedditCommunityRegisteredUser.ICreate,
    });
  typia.assert(user2);

  // Try update with user2, expect error
  await TestValidator.error(
    "non-owner cannot update subscription",
    async () => {
      await api.functional.redditCommunity.registeredUser.redditCommunity.communities.communitySubscriptions.update(
        connection,
        {
          communityName: community.communityName,
          communitySubscriptionId: subscription.id,
          body: {
            deleted_at: null,
          } satisfies IRedditCommunityCommunitySubscription.IUpdate,
        },
      );
    },
  );
}
