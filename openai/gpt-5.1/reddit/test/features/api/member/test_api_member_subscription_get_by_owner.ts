import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

/**
 * Validate that a member user can retrieve their own community subscription by
 * ID.
 *
 * Business flow:
 *
 * 1. Register a new member user and obtain an authenticated memberUser context.
 * 2. Create a community as that member user.
 * 3. Create a subscription for the member user to that community.
 * 4. Retrieve the subscription by its id via the owner-facing GET endpoint.
 * 5. Assert ownership, target community, flags, and lifecycle fields.
 */
export async function test_api_member_subscription_get_by_owner(
  connection: api.IConnection,
) {
  // 1. Register a new member user (auth.memberUser.join)
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const authorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2. Create a community owned by this member user
  const communityCreateBody = {
    slug: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 10 }),
    description: RandomGenerator.paragraph({
      sentences: 8,
      wordMin: 3,
      wordMax: 10,
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
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 3. Create a subscription for the member user to that community
  const subscriptionCreateBody = {
    community_platform_community_id: community.id,
    is_active: true,
    receive_notifications: true,
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const createdSubscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.members.subscriptions.create(
      connection,
      {
        memberUserId: authorized.id,
        body: subscriptionCreateBody,
      },
    );
  typia.assert(createdSubscription);

  // 4. Retrieve the subscription by its id as the same authenticated member user
  const fetched: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.subscriptions.at(
      connection,
      {
        subscriptionId: createdSubscription.id,
      },
    );
  typia.assert(fetched);

  // 5. Assertions: ownership, community target, flags, lifecycle fields
  TestValidator.equals(
    "subscription id should match between creation and fetch",
    fetched.id,
    createdSubscription.id,
  );

  TestValidator.equals(
    "subscription memberUser id should equal authenticated member user id",
    fetched.memberUser.id,
    authorized.id,
  );

  TestValidator.equals(
    "subscription community id should equal created community id",
    fetched.community.id,
    community.id,
  );

  TestValidator.equals(
    "is_active flag should reflect creation payload",
    fetched.is_active,
    subscriptionCreateBody.is_active,
  );

  TestValidator.equals(
    "receive_notifications flag should reflect creation payload",
    fetched.receive_notifications,
    subscriptionCreateBody.receive_notifications,
  );

  TestValidator.predicate(
    "created_at must be a non-empty ISO date-time string",
    fetched.created_at.length > 0,
  );

  TestValidator.predicate(
    "updated_at must be a non-empty ISO date-time string",
    fetched.updated_at.length > 0,
  );

  TestValidator.predicate(
    "deleted_at should be null or undefined for an active subscription",
    fetched.deleted_at === null || fetched.deleted_at === undefined,
  );
}
