import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunitySubscription";
import type { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";

/**
 * Test deleting a community subscription by a registered user.
 *
 * This test validates the full lifecycle of a subscription including user
 * registration, community creation, subscription creation, and deletion of the
 * subscription. It ensures that only the owner user can delete their
 * subscription and the subscription is properly erased.
 *
 * Steps:
 *
 * 1. Register a new user and authenticate.
 * 2. Create a new reddit community.
 * 3. Subscribe the user to the created community.
 * 4. Delete the subscription as the owner.
 * 5. Validate the subscription no longer exists.
 */
export async function test_api_reddit_community_subscription_deletion_by_registered_user(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new user
  const userBody = {
    email: `${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: "password123",
  } satisfies IRedditCommunityRegisteredUser.ICreate;

  const registeredUser = await api.functional.auth.registeredUser.join(
    connection,
    {
      body: userBody,
    },
  );
  typia.assert(registeredUser);

  // 2. Create a new reddit community
  const communityBody = {
    communityName: RandomGenerator.alphabets(10).toLowerCase(),
    displayName: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    imageUrl: null,
    isPrivate: false,
  } satisfies IRedditCommunityCommunity.ICreate;

  const createdCommunity =
    await api.functional.redditCommunity.registeredUser.redditCommunity.communities.create(
      connection,
      {
        body: communityBody,
      },
    );
  typia.assert(createdCommunity);

  // 3. Subscribe the registered user to the newly created community
  const subscriptionCreateBody = {
    community_name: communityBody.communityName,
  } satisfies IRedditCommunityCommunitySubscription.ICreate;

  const subscription =
    await api.functional.redditCommunity.registeredUser.redditCommunity.communities.communitySubscriptions.create(
      connection,
      {
        communityName: communityBody.communityName,
        body: subscriptionCreateBody,
      },
    );
  typia.assert(subscription);

  // 4. Delete the subscription
  await api.functional.redditCommunity.registeredUser.redditCommunity.communities.communitySubscriptions.erase(
    connection,
    {
      communityName: communityBody.communityName,
      communitySubscriptionId: subscription.id,
    },
  );

  // 5. Confirm the subscription deletion by attempting to delete again and expecting failure
  await TestValidator.error(
    "Deleting non-existing subscription should fail",
    async () => {
      await api.functional.redditCommunity.registeredUser.redditCommunity.communities.communitySubscriptions.erase(
        connection,
        {
          communityName: communityBody.communityName,
          communitySubscriptionId: subscription.id,
        },
      );
    },
  );
}
