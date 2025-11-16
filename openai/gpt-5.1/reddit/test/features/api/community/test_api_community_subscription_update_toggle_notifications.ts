import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

/**
 * Verify that a member user can toggle subscription notifications off without
 * deactivating the subscription.
 *
 * Business flow covered by this test:
 *
 * 1. Register a new member user (join) and obtain an authenticated context.
 * 2. As that member user, create a community.
 * 3. Create an active subscription to that community with receive_notifications =
 *    true.
 * 4. Update the subscription via PUT
 *    /communityPlatform/memberUser/subscriptions/{subscriptionId} with a body
 *    that only changes receive_notifications to false.
 * 5. Assert that the subscription remains active (is_active stays true),
 *    ownership/community linkage are unchanged, and receive_notifications is
 *    now false.
 */
export async function test_api_community_subscription_update_toggle_notifications(
  connection: api.IConnection,
) {
  // 1. Register a new member user and get authorized context
  const joinBody = {
    ...typia.random<ICommunityPlatformMemberuser.IJoin>(),
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const member: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(member);

  // 2. Create a community as this member user
  const communityCreateBody =
    typia.random<ICommunityPlatformCommunity.ICreate>();

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 3. Create an active subscription with notifications enabled
  const subscriptionCreateBody = {
    community_platform_community_id: community.id,
    is_active: true,
    receive_notifications: true,
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const subscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.subscriptions.create(
      connection,
      {
        body: subscriptionCreateBody,
      },
    );
  typia.assert(subscription);

  // Sanity checks on initial subscription state
  TestValidator.equals(
    "initial subscription is active",
    subscription.is_active,
    true,
  );
  TestValidator.equals(
    "initial subscription has notifications enabled",
    subscription.receive_notifications,
    true,
  );
  TestValidator.equals(
    "subscription owner matches joined member user",
    subscription.memberUser.id,
    member.id,
  );
  TestValidator.equals(
    "subscription community matches created community",
    subscription.community.id,
    community.id,
  );

  // 4. Update subscription: toggle notifications off, leave is_active unchanged
  const updateBody = {
    receive_notifications: false,
  } satisfies ICommunityPlatformCommunitySubscription.IUpdate;

  const updated: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.subscriptions.update(
      connection,
      {
        subscriptionId: subscription.id,
        body: updateBody,
      },
    );
  typia.assert(updated);

  // 5. Assertions on updated state
  TestValidator.equals(
    "updated subscription id should match original",
    updated.id,
    subscription.id,
  );
  TestValidator.equals(
    "updated subscription remains active",
    updated.is_active,
    subscription.is_active,
  );
  TestValidator.equals(
    "updated subscription has notifications disabled",
    updated.receive_notifications,
    false,
  );
  TestValidator.equals(
    "updated subscription owner remains the same member user",
    updated.memberUser.id,
    subscription.memberUser.id,
  );
  TestValidator.equals(
    "updated subscription community remains the same",
    updated.community.id,
    subscription.community.id,
  );
}
