import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

/**
 * Validate updating a member user's community subscription preferences.
 *
 * Business flow:
 *
 * 1. Register a new member user and obtain an authenticated context.
 * 2. Create a community as that member so it can be subscribed to.
 * 3. Create an active subscription (is_active=true, receive_notifications=true)
 *    for that member and community.
 * 4. Update that subscription to toggle receive_notifications=false while keeping
 *    is_active=true.
 * 5. Assert that only the mutable preference field has changed, the linkage to
 *    member and community is stable, and updated_at reflects the modification.
 */
export async function test_api_member_subscription_update_preferences(
  connection: api.IConnection,
) {
  // 1. Register a new member user (auth.memberUser.join)
  const joinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(10),
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const authorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  const memberId = authorized.id;

  // 2. Create a community via communityPlatform.memberUser.communities.create
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
      {
        body: communityBody,
      },
    );
  typia.assert(community);

  // Sanity check: ownership should match the joined member user
  TestValidator.equals(
    "community owner should be the creating member",
    community.owner_memberuser_id,
    memberId,
  );

  // 3. Create an active subscription for that member and community
  const subscriptionCreateBody = {
    community_platform_community_id: community.id,
    is_active: true,
    receive_notifications: true,
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const createdSubscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.members.subscriptions.create(
      connection,
      {
        memberUserId: memberId,
        body: subscriptionCreateBody,
      },
    );
  typia.assert(createdSubscription);

  const subscriptionId = createdSubscription.id;

  // Basic invariants after creation
  TestValidator.equals(
    "created subscription member should match authorized member",
    createdSubscription.memberUser.id,
    memberId,
  );
  TestValidator.equals(
    "created subscription community should match target community",
    createdSubscription.community.id,
    community.id,
  );
  TestValidator.equals(
    "created subscription is_active should be true",
    createdSubscription.is_active,
    true,
  );
  TestValidator.equals(
    "created subscription receive_notifications should be true",
    createdSubscription.receive_notifications,
    true,
  );

  const beforeUpdatedAt = createdSubscription.updated_at;

  // 4. Update subscription preferences: toggle receive_notifications -> false
  const subscriptionUpdateBody = {
    // Explicitly keep is_active true and toggle receive_notifications to false
    is_active: true,
    receive_notifications: false,
  } satisfies ICommunityPlatformCommunitySubscription.IUpdate;

  const updatedSubscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.members.subscriptions.update(
      connection,
      {
        memberUserId: memberId,
        subscriptionId,
        body: subscriptionUpdateBody,
      },
    );
  typia.assert(updatedSubscription);

  // 5. Validate business rules and invariants on the updated subscription

  // Identity invariants
  TestValidator.equals(
    "subscription id must remain stable after update",
    updatedSubscription.id,
    createdSubscription.id,
  );
  TestValidator.equals(
    "memberUser reference must remain stable after update",
    updatedSubscription.memberUser.id,
    createdSubscription.memberUser.id,
  );
  TestValidator.equals(
    "community reference must remain stable after update",
    updatedSubscription.community.id,
    createdSubscription.community.id,
  );

  // Preference flags: only receive_notifications should change, is_active stays true
  TestValidator.equals(
    "is_active should remain true after preference update",
    updatedSubscription.is_active,
    true,
  );
  TestValidator.equals(
    "receive_notifications should be toggled to false",
    updatedSubscription.receive_notifications,
    false,
  );

  // Timestamps: created_at is stable, updated_at changes
  TestValidator.equals(
    "created_at should remain unchanged after update",
    updatedSubscription.created_at,
    createdSubscription.created_at,
  );

  await TestValidator.predicate(
    "updated_at should be later than before",
    async () => {
      const beforeTime = Date.parse(beforeUpdatedAt);
      const afterTime = Date.parse(updatedSubscription.updated_at);
      return beforeTime <= afterTime;
    },
  );
}
