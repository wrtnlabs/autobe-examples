import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformCommunitySubscriptionNotifications } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscriptionNotifications";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * End-to-end test: A new user subscribes to a newly created community,
 * validating user registration, community creation, subscription, duplicate
 * prevention, and forbidden actions.
 *
 * 1. Register a new user with unique email, password, display name, url and
 *    referrer
 * 2. Authenticate as that user (token is automatically included by SDK)
 * 3. Create a new community as the user
 * 4. Subscribe to the community as this user
 * 5. Validate the subscription contains matching user_id, community_id; community
 *    summary data, notification settings, no deleted_at, and timestamps
 * 6. Attempt duplicate subscription (must error)
 * 7. Attempt unauthenticated subscription (must error)
 */
export async function test_api_community_subscription_creation_by_new_user(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    href: "https://test.example.com/register",
    referrer: "https://test.example.com/landing",
  } satisfies ICommunityPlatformUser.IJoin;
  const user: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: joinBody });
  typia.assert(user);

  // 2. (Token is set) Create a new community
  const communityBody = {
    name: RandomGenerator.alphaNumeric(8),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 10,
    }),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: communityBody,
    });
  typia.assert(community);

  // 3. Subscribe to the community
  const subscriptionBody = {
    community_id: community.id,
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;
  const subscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.user.subscriptions.create(
      connection,
      { body: subscriptionBody },
    );
  typia.assert(subscription);

  // 4. Validate subscription info
  TestValidator.equals(
    "user_id in subscription matches joined user",
    subscription.user_id,
    user.id,
  );
  TestValidator.equals(
    "community_id in subscription matches created community",
    subscription.community_id,
    community.id,
  );
  typia.assert<ICommunityPlatformCommunitySubscriptionNotifications>(
    subscription.notification_settings,
  );
  TestValidator.equals(
    "deleted_at is null (active)",
    subscription.deleted_at,
    null,
  );
  TestValidator.equals("community summary matches", subscription.community, {
    id: community.id,
    name: community.name,
    description: community.description,
  });
  TestValidator.predicate(
    "created_at is ISO 8601",
    typeof subscription.created_at === "string" &&
      subscription.created_at.length >= 20,
  );
  TestValidator.predicate(
    "updated_at is ISO 8601",
    typeof subscription.updated_at === "string" &&
      subscription.updated_at.length >= 20,
  );

  // 5. Prevent duplicate subscription
  await TestValidator.error("duplicate subscriptions must fail", async () => {
    await api.functional.communityPlatform.user.subscriptions.create(
      connection,
      { body: subscriptionBody },
    );
  });

  // 6. Prevent subscription by unauthenticated user
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot subscribe",
    async () => {
      await api.functional.communityPlatform.user.subscriptions.create(
        unauthConn,
        { body: subscriptionBody },
      );
    },
  );
}
