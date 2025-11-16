import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";

export async function test_api_reddit_community_registered_user_delete_subscription(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new registered user
  const joinBody = {
    typeName: "IRedditCommunityRegisteredUser.IJoin",
    email: `user_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "StrongPass123!",
    ip: null,
    href: "https://www.example.com/home",
    referrer: "https://www.google.com/",
  } satisfies IRedditCommunityRegisteredUser.IJoin;

  const user: IRedditCommunityRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: joinBody,
    });
  typia.assert(user);

  // 2. Create a new Reddit community with the authenticated user
  const communityBody = {
    communityName: `community_${RandomGenerator.alphaNumeric(6)}`,
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 8,
    }),
    status: "active",
  } satisfies IRedditCommunityCommunity.ICreate;

  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.registeredUser.communities.create(
      connection,
      { body: communityBody },
    );
  typia.assert(community);
  TestValidator.equals(
    "communityName matches",
    community.communityName,
    communityBody.communityName,
  );

  // 3. Create a community subscription for the authenticated user
  const subscriptionCreateBody = {
    redditCommunity_community_id: community.id,
  } satisfies IRedditCommunitySubscription.ICreate;

  const subscription: IRedditCommunitySubscription =
    await api.functional.redditCommunity.registeredUser.redditCommunitySubscriptions.create(
      connection,
      { body: subscriptionCreateBody },
    );
  typia.assert(subscription);
  TestValidator.equals(
    "subscription community id matches",
    subscription.community.id,
    community.id,
  );
  TestValidator.equals(
    "subscription user id matches",
    subscription.registeredUser.id,
    user.id,
  );

  // 4. Delete the subscription
  await api.functional.redditCommunity.registeredUser.redditCommunitySubscriptions.erase(
    connection,
    { id: subscription.id },
  );

  // 5. Verify that deletion is successful and irrevocable by attempting to re-delete (expect error)
  await TestValidator.error(
    "deleting the same subscription again should fail",
    async () => {
      await api.functional.redditCommunity.registeredUser.redditCommunitySubscriptions.erase(
        connection,
        { id: subscription.id },
      );
    },
  );
}
