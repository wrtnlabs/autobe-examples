import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";

export async function test_api_reddit_community_registered_user_subscribe_community(
  connection: api.IConnection,
) {
  // Step 1: Register a new user to establish authentication context.
  const userJoinRequest = {
    typeName: "IRedditCommunityRegisteredUser.IJoin",
    email: `user${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: "StrongPass123!",
    ip: null,
    href: "https://example.com/signup",
    referrer: "https://example.com/",
  } satisfies IRedditCommunityRegisteredUser.IJoin;

  const registeredUser = await api.functional.auth.registeredUser.join(
    connection,
    {
      body: userJoinRequest,
    },
  );
  typia.assert(registeredUser);

  // Step 2: Create a new Reddit Community
  const communityCreationRequest = {
    communityName: `community_${RandomGenerator.alphaNumeric(6)}`,
    description: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 4,
      wordMax: 8,
    }),
    status: "active",
  } satisfies IRedditCommunityCommunity.ICreate;

  const community =
    await api.functional.redditCommunity.registeredUser.communities.create(
      connection,
      {
        body: communityCreationRequest,
      },
    );
  typia.assert(community);

  // Step 3: Subscribe the registered user to the newly created community
  const subscriptionRequest = {
    redditCommunity_community_id: community.id,
  } satisfies IRedditCommunitySubscription.ICreate;

  const subscription =
    await api.functional.redditCommunity.registeredUser.redditCommunitySubscriptions.create(
      connection,
      {
        body: subscriptionRequest,
      },
    );
  typia.assert(subscription);

  // Validate
  TestValidator.predicate("subscription ID exists", subscription.id.length > 0);
  TestValidator.equals(
    "subscription community ID",
    subscription.community.id,
    community.id,
  );
  TestValidator.equals(
    "subscription registeredUser ID",
    subscription.registeredUser.id,
    registeredUser.id,
  );
}
