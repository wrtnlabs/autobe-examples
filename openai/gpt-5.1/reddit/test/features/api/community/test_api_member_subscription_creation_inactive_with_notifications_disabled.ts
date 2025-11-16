import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

/**
 * Validate creation of an inactive, notifications-disabled community
 * subscription for a member user.
 *
 * Business workflow:
 *
 * 1. Register and authenticate a member user using POST /auth/memberUser/join.
 * 2. Create a community using POST /communityPlatform/memberUser/communities.
 * 3. Create a subscription for that member user to the created community via POST
 *    /communityPlatform/memberUser/members/{memberUserId}/subscriptions with
 *    is_active=false and receive_notifications=false.
 *
 * Validations:
 *
 * - The created subscription is structurally valid (typia.assert).
 * - The subscription is linked to the correct member user and community.
 * - The preference flags is_active and receive_notifications are both false.
 * - Created_at and updated_at are set (non-empty strings).
 * - Deleted_at is either null or undefined (i.e., subscription is not
 *   soft-deleted).
 */
export async function test_api_member_subscription_creation_inactive_with_notifications_disabled(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a member user
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/register",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const authorizedMember = await api.functional.auth.memberUser.join(
    connection,
    { body: joinBody },
  );
  typia.assert(authorizedMember);

  const memberUserId = authorizedMember.id;

  // 2. Create a community owned by this member user
  const communityCreateBody = {
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

  const community =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  const communityId = community.id;

  // 3. Create a subscription for the member user with inactive status and notifications disabled
  const subscriptionCreateBody = {
    community_platform_community_id: communityId,
    is_active: false,
    receive_notifications: false,
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const subscription =
    await api.functional.communityPlatform.memberUser.members.subscriptions.create(
      connection,
      {
        memberUserId,
        body: subscriptionCreateBody,
      },
    );
  typia.assert(subscription);

  // Business-level validations

  // Subscription should be linked to the correct member user
  TestValidator.equals(
    "subscription memberUser id should match joined member user id",
    subscription.memberUser.id,
    memberUserId,
  );

  // Subscription should be linked to the correct community
  TestValidator.equals(
    "subscription community id should match created community id",
    subscription.community.id,
    communityId,
  );

  // Flags should reflect inactive subscription and notifications disabled
  TestValidator.equals(
    "subscription is_active should be false",
    subscription.is_active,
    false,
  );
  TestValidator.equals(
    "subscription receive_notifications should be false",
    subscription.receive_notifications,
    false,
  );

  // Timestamps: created_at and updated_at should be non-empty strings
  TestValidator.predicate(
    "subscription created_at should be a non-empty string",
    subscription.created_at.length > 0,
  );
  TestValidator.predicate(
    "subscription updated_at should be a non-empty string",
    subscription.updated_at.length > 0,
  );

  // deleted_at should indicate a non-deleted record (null or undefined)
  TestValidator.predicate(
    "subscription deleted_at should be null or undefined (not soft-deleted)",
    subscription.deleted_at === null || subscription.deleted_at === undefined,
  );
}
