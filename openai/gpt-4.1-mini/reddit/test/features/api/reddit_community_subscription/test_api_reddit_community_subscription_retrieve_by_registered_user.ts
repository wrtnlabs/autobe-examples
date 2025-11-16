import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";

/**
 * Test retrieval of a specific Reddit community subscription by ID for an
 * authenticated registered user. This test covers the complete user journey
 * from join (registration), community creation, subscription to retrieval,
 * ensuring correct data and authorization.
 *
 * The test scenario includes:
 *
 * - Authentication by joining the platform
 * - Creating a unique Reddit community
 * - Creating a subscription to the community
 * - Retrieving the subscription by its ID
 * - Validation of returned data for consistency and correctness
 *
 * All API calls are awaited, and typia.assert is used for runtime type
 * validation. TestValidator confirms business properties, such as matching IDs
 * and non-null fields.
 */
export async function test_api_reddit_community_subscription_retrieve_by_registered_user(
  connection: api.IConnection,
) {
  // 1. User joins and authenticates
  const user: IRedditCommunityRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        typeName: "IRedditCommunityRegisteredUser.IJoin",
        email: `user_${RandomGenerator.alphaNumeric(10)}@example.com`,
        password: "validPassword123",
        href: "https://example.com/signup",
        referrer: "https://example.com/home",
        ip: null,
      } satisfies IRedditCommunityRegisteredUser.IJoin,
    });
  typia.assert(user);

  // 2. Create community
  const createCommunityBody = {
    communityName: `community_${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 5,
      wordMax: 10,
    }),
    status: "active",
  } satisfies IRedditCommunityCommunity.ICreate;

  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.registeredUser.communities.create(
      connection,
      {
        body: createCommunityBody,
      },
    );
  typia.assert(community);

  // 3. Create subscription to the community
  const subscriptionCreateBody = {
    redditCommunity_community_id: community.id,
  } satisfies IRedditCommunitySubscription.ICreate;

  const subscription: IRedditCommunitySubscription =
    await api.functional.redditCommunity.registeredUser.redditCommunitySubscriptions.create(
      connection,
      {
        body: subscriptionCreateBody,
      },
    );
  typia.assert(subscription);

  // 4. Retrieve subscription by subscription ID
  const retrievedSubscription: IRedditCommunitySubscription =
    await api.functional.redditCommunity.registeredUser.redditCommunitySubscriptions.at(
      connection,
      {
        id: subscription.id,
      },
    );
  typia.assert(retrievedSubscription);

  // 5. Validate the subscription details
  TestValidator.equals(
    "subscription ID matches",
    retrievedSubscription.id,
    subscription.id,
  );
  TestValidator.equals(
    "subscription user ID matches",
    retrievedSubscription.registeredUser.id,
    user.id,
  );
  TestValidator.equals(
    "subscription community ID matches",
    retrievedSubscription.community.id,
    community.id,
  );

  TestValidator.equals(
    "community status is active",
    retrievedSubscription.community.status,
    "active",
  );

  TestValidator.predicate(
    "subscription timestamp created_at is valid ISO date",
    !isNaN(Date.parse(retrievedSubscription.created_at)),
  );
  if (retrievedSubscription.updated_at !== undefined) {
    TestValidator.predicate(
      "subscription timestamp updated_at is valid ISO date",
      !isNaN(Date.parse(retrievedSubscription.updated_at)),
    );
  }
}
