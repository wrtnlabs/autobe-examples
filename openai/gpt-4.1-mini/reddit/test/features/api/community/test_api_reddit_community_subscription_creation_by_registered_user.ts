import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunitySubscription";
import type { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";

export async function test_api_reddit_community_subscription_creation_by_registered_user(
  connection: api.IConnection,
) {
  // 1. Create a new registered user account
  const email: string & tags.Format<"email"> =
    `${RandomGenerator.alphaNumeric(8)}@example.com`;
  const password = "Password123!";
  const registeredUser: IRedditCommunityRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        email,
        password,
      } satisfies IRedditCommunityRegisteredUser.ICreate,
    });
  typia.assert(registeredUser);

  // 2. Create a new community
  const communityName = RandomGenerator.alphaNumeric(10).toLowerCase();
  const displayName = RandomGenerator.name(3);
  const description = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 3,
    sentenceMax: 5,
    wordMin: 5,
    wordMax: 10,
  });
  const isPrivate = false;

  const communityCreateBody = {
    communityName,
    displayName,
    description,
    imageUrl: null,
    isPrivate,
  } satisfies IRedditCommunityCommunity.ICreate;

  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.registeredUser.redditCommunity.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 3. Create a subscription for the registered user to the new community
  const subscriptionCreateBody = {
    community_name: communityName,
  } satisfies IRedditCommunityCommunitySubscription.ICreate;

  const subscription: IRedditCommunityCommunitySubscription =
    await api.functional.redditCommunity.registeredUser.redditCommunity.communities.communitySubscriptions.create(
      connection,
      {
        communityName: communityName,
        body: subscriptionCreateBody,
      },
    );
  typia.assert(subscription);

  // 4. Validate subscription fields
  TestValidator.equals(
    "subscription community name matches",
    subscription.community.name,
    communityName,
  );
  TestValidator.equals(
    "subscription user email matches",
    subscription.registereduser.email,
    email,
  );
  TestValidator.predicate(
    "subscription has created_at timestamp",
    subscription.created_at !== null && subscription.created_at !== undefined,
  );

  // 5. Attempt duplicate subscription creation and expect an error
  await TestValidator.error("duplicate subscription should fail", async () => {
    await api.functional.redditCommunity.registeredUser.redditCommunity.communities.communitySubscriptions.create(
      connection,
      {
        communityName: communityName,
        body: subscriptionCreateBody,
      },
    );
  });
}
