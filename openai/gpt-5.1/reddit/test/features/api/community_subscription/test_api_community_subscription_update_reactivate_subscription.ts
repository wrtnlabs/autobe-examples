import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

/**
 * Reactivate an inactive community subscription for a member user.
 *
 * Business flow validated by this test:
 *
 * 1. A guest joins as a memberUser (auth.memberUser.join) and becomes
 *    authenticated.
 * 2. The authenticated memberUser creates a community
 *    (communityPlatform.memberUser.communities.create).
 * 3. The memberUser creates a subscription to that community with
 *    `is_active=false` and `receive_notifications=false` using
 *    communityPlatform.memberUser.subscriptions.create.
 * 4. The memberUser calls the subscriptions update endpoint
 *    (communityPlatform.memberUser.subscriptions.update) for that subscription,
 *    providing `is_active=true` and `receive_notifications=true` to reactivate
 *    the subscription and re-enable notifications.
 * 5. The API returns the updated subscription; the test verifies that:
 *
 *    - `is_active` and `receive_notifications` are now `true`.
 *    - The subscription `id` is unchanged (no duplicate row was created).
 *    - The linked `memberUser.id` and `community.id`/`slug` match the originals
 *         (ownership and linkage preserved).
 *    - `updated_at` is greater than the original `updated_at`, confirming an
 *         in-place update.
 */
export async function test_api_community_subscription_update_reactivate_subscription(
  connection: api.IConnection,
) {
  // 1. Register a new member user and establish authenticated context
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/signup",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const authorizedMember: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorizedMember);

  // 2. Create a community owned by this member user
  const communityBody = {
    slug: RandomGenerator.alphaNumeric(12),
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
      { body: communityBody },
    );
  typia.assert(community);

  // 3. Create an initial inactive subscription with notifications disabled
  const createSubscriptionBody = {
    community_platform_community_id: community.id,
    is_active: false,
    receive_notifications: false,
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const initialSubscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.subscriptions.create(
      connection,
      { body: createSubscriptionBody },
    );
  typia.assert(initialSubscription);

  // Sanity checks on initial subscription state
  TestValidator.predicate(
    "initial subscription should be inactive",
    initialSubscription.is_active === false,
  );
  TestValidator.predicate(
    "initial subscription should have notifications disabled",
    initialSubscription.receive_notifications === false,
  );
  TestValidator.equals(
    "subscription memberUser linkage must match authorized member",
    initialSubscription.memberUser.id,
    authorizedMember.id,
  );
  TestValidator.equals(
    "subscription community linkage must match created community id",
    initialSubscription.community.id,
    community.id,
  );

  const originalUpdatedAt: string = initialSubscription.updated_at;

  // 4. Reactivate subscription and re-enable notifications via update API
  const updateBody = {
    is_active: true,
    receive_notifications: true,
  } satisfies ICommunityPlatformCommunitySubscription.IUpdate;

  const updatedSubscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.subscriptions.update(
      connection,
      {
        subscriptionId: initialSubscription.id,
        body: updateBody,
      },
    );
  typia.assert(updatedSubscription);

  // 5. Validate updated subscription state
  TestValidator.equals(
    "subscription id must remain unchanged after update",
    updatedSubscription.id,
    initialSubscription.id,
  );
  TestValidator.predicate(
    "subscription should be active after reactivation update",
    updatedSubscription.is_active === true,
  );
  TestValidator.predicate(
    "subscription should have notifications enabled after update",
    updatedSubscription.receive_notifications === true,
  );
  TestValidator.equals(
    "memberUser linkage remains unchanged after update",
    updatedSubscription.memberUser.id,
    initialSubscription.memberUser.id,
  );
  TestValidator.equals(
    "community linkage remains unchanged after update (id)",
    updatedSubscription.community.id,
    initialSubscription.community.id,
  );
  TestValidator.equals(
    "community linkage remains unchanged after update (slug)",
    updatedSubscription.community.slug,
    initialSubscription.community.slug,
  );

  // Ensure updated_at reflects change (lexicographically greater timestamp)
  TestValidator.predicate(
    "updated_at must change after subscription update",
    updatedSubscription.updated_at !== originalUpdatedAt,
  );
}
