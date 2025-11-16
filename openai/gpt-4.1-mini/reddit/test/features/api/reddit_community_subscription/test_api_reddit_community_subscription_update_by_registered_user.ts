import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";

/**
 * Test updating a Reddit Community Subscription by a registered user.
 *
 * This comprehensive test covers the full user journey involving
 * authentication, community creation, subscription creation, subscription
 * update, and verification. It ensures type-safe API interactions and business
 * logic correctness.
 */
export async function test_api_reddit_community_subscription_update_by_registered_user(
  connection: api.IConnection,
) {
  // 1. User join and authenticate
  const user = await api.functional.auth.registeredUser.join(connection, {
    body: {
      typeName: "IRedditCommunityRegisteredUser.IJoin",
      email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
      password: RandomGenerator.alphaNumeric(10),
      href: "https://example.com/page",
      referrer: "https://referrer.example.com/page",
    } satisfies IRedditCommunityRegisteredUser.IJoin,
  });
  typia.assert(user);

  // 2. Create initial community
  const community =
    await api.functional.redditCommunity.registeredUser.communities.create(
      connection,
      {
        body: {
          communityName: "community_" + RandomGenerator.alphaNumeric(6),
          description: RandomGenerator.paragraph({ sentences: 4 }),
          status: "active",
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3. Create subscription to initial community
  const subscription =
    await api.functional.redditCommunity.registeredUser.redditCommunitySubscriptions.create(
      connection,
      {
        body: {
          redditCommunity_community_id: community.id,
        } satisfies IRedditCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);

  // 4. Create new community
  const newCommunity =
    await api.functional.redditCommunity.registeredUser.communities.create(
      connection,
      {
        body: {
          communityName: "community_" + RandomGenerator.alphaNumeric(6),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          status: "active",
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(newCommunity);

  // 5. Update subscription to point to the new community
  const updatedSubscription =
    await api.functional.redditCommunity.registeredUser.redditCommunitySubscriptions.update(
      connection,
      {
        id: subscription.id,
        body: {
          redditCommunity_community_id: newCommunity.id,
        } satisfies IRedditCommunitySubscription.IUpdate,
      },
    );
  typia.assert(updatedSubscription);

  // 6. Validate update reflects the new community
  TestValidator.equals(
    "subscription id remains same",
    updatedSubscription.id,
    subscription.id,
  );
  TestValidator.equals(
    "updated subscription community id matches new community",
    updatedSubscription.community.id,
    newCommunity.id,
  );
  TestValidator.notEquals(
    "updated subscription community id differs from original",
    updatedSubscription.community.id,
    subscription.community.id,
  );
}
