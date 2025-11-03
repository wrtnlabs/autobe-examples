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
 * Validate the user-initiated unsubscribe (soft delete) process for a community
 * subscription.
 *
 * 1. Register a new user
 * 2. Create a new community as that user
 * 3. Subscribe the user to the community
 * 4. Unsubscribe (DELETE /communityPlatform/user/subscriptions/{subscriptionId})
 * 5. Validate soft-deletion: deleted_at is set (if fetchable)
 * 6. Attempt to unsubscribe again (expect error)
 * 7. Attempt to unsubscribe using another user's session (expect error)
 * 8. Attempt to unsubscribe with a non-existent subscriptionId (expect error)
 */
export async function test_api_community_subscription_unsubscribe_by_member(
  connection: api.IConnection,
) {
  // 1. Register primary user
  const userEmail1 = typia.random<string & tags.Format<"email">>();
  const user1: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail1,
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
        href: "https://example.com/register",
        referrer: "https://example.com/landing",
      } satisfies ICommunityPlatformUser.IJoin,
    });
  typia.assert(user1);

  // 2. Create a community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: {
        name: RandomGenerator.alphabets(10).toLowerCase(),
        description: RandomGenerator.paragraph({ sentences: 4 }) as string,
      } satisfies ICommunityPlatformCommunity.ICreate,
    });
  typia.assert(community);

  // 3. Subscribe the user to community
  const subscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.user.subscriptions.create(
      connection,
      {
        body: {
          community_id: community.id,
          notification_enabled: true,
        } satisfies ICommunityPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  TestValidator.equals(
    "subscription user_id matches user",
    subscription.user_id,
    user1.id,
  );
  TestValidator.equals(
    "subscription not yet deleted",
    subscription.deleted_at,
    null,
  );

  // 4. Unsubscribe (delete subscription) - success
  await api.functional.communityPlatform.user.subscriptions.erase(connection, {
    subscriptionId: subscription.id,
  });
  // There is no direct get-single-subscription-by-ID endpoint; validation of the deleted status is skipped (would be covered by index/list scenario)

  // 5. Attempt to unsubscribe again (expect error)
  await TestValidator.error(
    "cannot unsubscribe already-deleted subscription",
    async () => {
      await api.functional.communityPlatform.user.subscriptions.erase(
        connection,
        {
          subscriptionId: subscription.id,
        },
      );
    },
  );

  // 6. Register another user
  const userEmail2 = typia.random<string & tags.Format<"email">>();
  const user2: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail2,
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
        href: "https://example.com/register",
        referrer: "https://example.com/landing",
      } satisfies ICommunityPlatformUser.IJoin,
    });
  typia.assert(user2);
  // Switch session to user2
  await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail2,
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
    } satisfies ICommunityPlatformUser.IJoin,
  });
  // 7. Attempt to unsubscribe user1's subscription as user2 (expect error)
  await TestValidator.error(
    "cannot unsubscribe another user's subscription",
    async () => {
      await api.functional.communityPlatform.user.subscriptions.erase(
        connection,
        {
          subscriptionId: subscription.id,
        },
      );
    },
  );
  // 8. Attempt to unsubscribe with a non-existent subscriptionId
  await TestValidator.error(
    "cannot unsubscribe non-existent subscriptionId",
    async () => {
      await api.functional.communityPlatform.user.subscriptions.erase(
        connection,
        {
          subscriptionId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
