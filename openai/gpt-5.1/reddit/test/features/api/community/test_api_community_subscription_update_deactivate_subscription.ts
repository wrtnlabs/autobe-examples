import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

/**
 * Deactivate an existing community subscription while preserving notification
 * preferences.
 *
 * Business workflow:
 *
 * 1. Register a new member user and establish an authenticated session.
 * 2. Create a community as that member user.
 * 3. Create a subscription to that community with is_active=true and
 *    receive_notifications=true.
 * 4. Update the subscription to set is_active=false while omitting
 *    receive_notifications.
 * 5. Verify that the subscription is now inactive, notifications preference is
 *    unchanged, identity/linkage fields remain stable, and updated_at has
 *    changed.
 */
export async function test_api_community_subscription_update_deactivate_subscription(
  connection: api.IConnection,
) {
  // 1. Register a new member user (join) and authenticate
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/register",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const member: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(member);

  // 2. Create a community owned by this member user
  const communityBody = {
    slug: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityBody,
      },
    );
  typia.assert(community);

  // 3. Create an active subscription with notifications enabled
  const subscriptionCreateBody = {
    community_platform_community_id: community.id,
    is_active: true,
    receive_notifications: true,
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const originalSubscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.subscriptions.create(
      connection,
      {
        body: subscriptionCreateBody,
      },
    );
  typia.assert(originalSubscription);

  // Snapshot key fields before update
  const originalId = originalSubscription.id;
  const originalMemberUserId = originalSubscription.memberUser.id;
  const originalCommunityId = originalSubscription.community.id;
  const originalCreatedAt = originalSubscription.created_at;
  const originalUpdatedAt = originalSubscription.updated_at;
  const originalReceiveNotifications =
    originalSubscription.receive_notifications;

  // Sanity check initial state
  TestValidator.predicate(
    "subscription initially active",
    originalSubscription.is_active === true,
  );
  TestValidator.predicate(
    "subscription initially has notifications enabled",
    originalReceiveNotifications === true,
  );

  // 4. Deactivate the subscription via update, omitting receive_notifications
  const updateBody = {
    is_active: false,
  } satisfies ICommunityPlatformCommunitySubscription.IUpdate;

  const updatedSubscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.subscriptions.update(
      connection,
      {
        subscriptionId: originalId,
        body: updateBody,
      },
    );
  typia.assert(updatedSubscription);

  // 5. Assertions on the updated subscription
  // Identity & linkage unchanged
  TestValidator.equals(
    "subscription id remains unchanged after deactivation",
    updatedSubscription.id,
    originalId,
  );
  TestValidator.equals(
    "member user linkage remains unchanged",
    updatedSubscription.memberUser.id,
    originalMemberUserId,
  );
  TestValidator.equals(
    "community linkage remains unchanged",
    updatedSubscription.community.id,
    originalCommunityId,
  );

  // Business flags
  TestValidator.predicate(
    "subscription is deactivated (is_active=false)",
    updatedSubscription.is_active === false,
  );
  TestValidator.predicate(
    "notification preference is preserved (still true)",
    updatedSubscription.receive_notifications ===
      originalReceiveNotifications && originalReceiveNotifications === true,
  );

  // Timestamps
  TestValidator.equals(
    "created_at remains unchanged after update",
    updatedSubscription.created_at,
    originalCreatedAt,
  );
  TestValidator.predicate(
    "updated_at has changed after deactivation update",
    updatedSubscription.updated_at !== originalUpdatedAt,
  );
}
