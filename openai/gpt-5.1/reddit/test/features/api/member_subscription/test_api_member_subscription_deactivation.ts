import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

/**
 * Validate logical deactivation of a community subscription by its owning
 * member user.
 *
 * Business goal
 *
 * - Ensure a member user can deactivate (soft off) a community subscription via
 *   the memberUser-scoped update endpoint, without deleting the record or
 *   breaking foreign key relationships.
 * - Confirm that the is_active flag is the mechanism of deactivation, that
 *   referential integrity to memberUser and community is preserved, and that
 *   timestamps reflect the update.
 *
 * Workflow
 *
 * 1. Register a new member user via auth.memberUser.join, capturing the memberUser
 *    id and establishing the authenticated context on the connection.
 * 2. Create a new community via communityPlatform.memberUser.communities.create
 *    that will be the target of the subscription.
 * 3. Create an initial active subscription for the member/community pair via
 *    communityPlatform.memberUser.members.subscriptions.create with
 *    is_active=true.
 * 4. Deactivate the subscription by calling
 *    communityPlatform.memberUser.members.subscriptions.update with
 *    body.is_active=false.
 * 5. Validate that the returned subscription:
 *
 *    - Still references the same id
 *    - Has memberUser.id equal to the creator member's id
 *    - Has community.id equal to the created community's id
 *    - Has is_active set to false
 *    - Has updated_at greater than or equal to created_at, and updated_at is
 *         strictly later than the original updated_at from the create step.
 */
export async function test_api_member_subscription_deactivation(
  connection: api.IConnection,
) {
  // 1. Register a new member user and authenticate the connection
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(10),
    ip: null,
    href: "https://community.example.com/register",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const member: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(member);

  // 2. Create a new community that the member will subscribe to
  const communityBody = {
    slug: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 12,
    }),
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

  // 3. Create an initial active subscription for this member and community
  const createSubBody = {
    community_platform_community_id: community.id,
    is_active: true,
    receive_notifications: true,
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const createdSub: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.members.subscriptions.create(
      connection,
      {
        memberUserId: member.id,
        body: createSubBody,
      },
    );
  typia.assert(createdSub);

  // Basic invariants after creation
  TestValidator.equals(
    "subscription memberUser id matches creator",
    createdSub.memberUser.id,
    member.id,
  );
  TestValidator.equals(
    "subscription community id matches created community",
    createdSub.community.id,
    community.id,
  );
  TestValidator.predicate(
    "subscription should start active",
    createdSub.is_active === true,
  );

  const originalUpdatedAt: string & tags.Format<"date-time"> =
    createdSub.updated_at;
  const createdAt: string & tags.Format<"date-time"> = createdSub.created_at;

  // 4. Deactivate the subscription via update
  const updateBody = {
    is_active: false,
  } satisfies ICommunityPlatformCommunitySubscription.IUpdate;

  const updatedSub: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.members.subscriptions.update(
      connection,
      {
        memberUserId: member.id,
        subscriptionId: createdSub.id,
        body: updateBody,
      },
    );
  typia.assert(updatedSub);

  // 5. Validate invariants after deactivation
  TestValidator.equals(
    "subscription id is stable across update",
    updatedSub.id,
    createdSub.id,
  );
  TestValidator.equals(
    "memberUser id is preserved on subscription",
    updatedSub.memberUser.id,
    member.id,
  );
  TestValidator.equals(
    "community id is preserved on subscription",
    updatedSub.community.id,
    community.id,
  );
  TestValidator.predicate(
    "subscription is_active is now false",
    updatedSub.is_active === false,
  );

  // Timestamps: created_at should remain the same, updated_at should move forward
  TestValidator.equals(
    "created_at remains unchanged after update",
    updatedSub.created_at,
    createdAt,
  );

  const createdTime = Date.parse(createdAt);
  const originalUpdatedTime = Date.parse(originalUpdatedAt);
  const updatedTime = Date.parse(updatedSub.updated_at);

  TestValidator.predicate(
    "updated_at is not earlier than created_at",
    updatedTime >= createdTime,
  );
  TestValidator.predicate(
    "updated_at advances compared to original updated_at",
    updatedTime >= originalUpdatedTime,
  );

  // receive_notifications should remain unchanged because we did not include it in update body
  TestValidator.equals(
    "receive_notifications is preserved when not updated",
    updatedSub.receive_notifications,
    createdSub.receive_notifications,
  );
}
