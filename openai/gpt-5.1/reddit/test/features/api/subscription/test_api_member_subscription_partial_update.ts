import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

export async function test_api_member_subscription_partial_update(
  connection: api.IConnection,
) {
  // 1) Register a new member user and establish authenticated context
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    // omit ip so that backend derives it from transport layer
    href: "https://community.example.com/signup",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const authorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2) Create a community as this member user
  const communityCreateBody = {
    slug: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
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

  // Basic sanity check: owner of community should be the authenticated member
  TestValidator.equals(
    "community owner should equal joined member user id",
    community.owner_memberuser_id,
    authorized.id,
  );

  // 3) Create a subscription for that member/community
  const createSubscriptionBody = {
    community_platform_community_id: community.id,
    is_active: true,
    receive_notifications: false,
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const initialSubscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.members.subscriptions.create(
      connection,
      {
        memberUserId: authorized.id,
        body: createSubscriptionBody,
      },
    );
  typia.assert(initialSubscription);

  // Validate initial flags
  TestValidator.equals(
    "initial subscription is_active should be true",
    initialSubscription.is_active,
    true,
  );
  TestValidator.equals(
    "initial subscription receive_notifications should be false",
    initialSubscription.receive_notifications,
    false,
  );

  // Capture initial updated_at and created_at timestamps for later comparison
  const initialCreatedAt = initialSubscription.created_at;
  const initialUpdatedAt = initialSubscription.updated_at;

  // 4) Perform partial update: only change receive_notifications, omit is_active
  const updateBody = {
    receive_notifications: true,
  } satisfies ICommunityPlatformCommunitySubscription.IUpdate;

  const updatedSubscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.members.subscriptions.update(
      connection,
      {
        memberUserId: authorized.id,
        subscriptionId: initialSubscription.id,
        body: updateBody,
      },
    );
  typia.assert(updatedSubscription);

  // 5) Validate partial update semantics
  // Identity and linkage should remain unchanged
  TestValidator.equals(
    "subscription id should remain the same after update",
    updatedSubscription.id,
    initialSubscription.id,
  );
  TestValidator.equals(
    "memberUser linkage should remain the same",
    updatedSubscription.memberUser.id,
    initialSubscription.memberUser.id,
  );
  TestValidator.equals(
    "community linkage should remain the same",
    updatedSubscription.community.id,
    initialSubscription.community.id,
  );

  // is_active should remain true because it was omitted from update body
  TestValidator.equals(
    "is_active should remain true when omitted from partial update body",
    updatedSubscription.is_active,
    true,
  );

  // receive_notifications should change from false to true
  TestValidator.equals(
    "receive_notifications should be updated to true",
    updatedSubscription.receive_notifications,
    true,
  );

  // created_at must remain stable, updated_at should advance
  TestValidator.equals(
    "created_at should remain unchanged after update",
    updatedSubscription.created_at,
    initialCreatedAt,
  );

  // Compare updated_at values using Date parsing for temporal ordering
  const initialUpdatedAtDate = new Date(initialUpdatedAt).getTime();
  const updatedUpdatedAtDate = new Date(
    updatedSubscription.updated_at,
  ).getTime();

  TestValidator.predicate(
    "updated_at should advance after subscription update",
    updatedUpdatedAtDate >= initialUpdatedAtDate,
  );
}
