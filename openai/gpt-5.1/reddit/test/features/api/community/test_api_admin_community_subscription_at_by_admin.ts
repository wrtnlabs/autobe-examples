import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

/**
 * Validate that an authenticated adminUser can retrieve details of a specific
 * community subscription for a given community.
 *
 * End-to-end scenario:
 *
 * 1. Register an adminUser.
 * 2. Register a memberUser.
 * 3. As memberUser, create a community.
 * 4. As memberUser, subscribe to that community.
 * 5. As adminUser, fetch the subscription via admin inspection endpoint.
 * 6. Validate core business fields and relationships.
 */
export async function test_api_admin_community_subscription_at_by_admin(
  connection: api.IConnection,
) {
  // 1. Register an adminUser (also authenticates and sets Authorization header)
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Register a memberUser (join also authenticates and overwrites Authorization)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 3. As memberUser, create a community
  const communityCreateBody = {
    slug: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
    description: RandomGenerator.paragraph({
      sentences: 5,
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

  // 4. As memberUser, create a community subscription targeting the created community
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

  // Basic sanity checks on creation side
  TestValidator.equals(
    "created subscription community id matches request",
    subscription.community.id,
    community.id,
  );
  TestValidator.equals(
    "created subscription member id matches member user",
    subscription.memberUser.id,
    memberAuthorized.id,
  );

  // 5. Switch back to adminUser context using login to ensure proper admin auth
  const adminLoginBody = {
    identifier: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://example.com/admin/login",
    referrer: "https://example.com/admin",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminLoginAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuthorized);

  // 6. As adminUser, fetch the subscription via admin inspection endpoint
  const inspected: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.adminUser.communities.subscribers.at(
      connection,
      {
        communityId: community.id,
        subscriptionId: subscription.id,
      },
    );
  typia.assert(inspected);

  // 7. Business validations
  // Identity and linkage
  TestValidator.equals(
    "inspected subscription id matches created subscription",
    inspected.id,
    subscription.id,
  );
  TestValidator.equals(
    "inspected member id matches created member",
    inspected.memberUser.id,
    memberAuthorized.id,
  );
  TestValidator.equals(
    "inspected member username matches created member username",
    inspected.memberUser.username,
    memberAuthorized.username,
  );

  TestValidator.equals(
    "inspected community id matches created community",
    inspected.community.id,
    community.id,
  );
  TestValidator.equals(
    "inspected community slug matches created community",
    inspected.community.slug,
    community.slug,
  );
  TestValidator.equals(
    "inspected community name matches created community",
    inspected.community.name,
    community.name,
  );

  // Flags
  TestValidator.equals(
    "inspected is_active flag matches creation",
    inspected.is_active,
    subscriptionCreateBody.is_active,
  );
  TestValidator.equals(
    "inspected receive_notifications flag matches creation",
    inspected.receive_notifications,
    subscriptionCreateBody.receive_notifications,
  );

  // Timestamps - ensure lifecyle fields are populated / not populated as expected
  await TestValidator.predicate(
    "inspected created_at should be a non-empty string",
    async () => inspected.created_at.length > 0,
  );
  await TestValidator.predicate(
    "inspected updated_at should be a non-empty string",
    async () => inspected.updated_at.length > 0,
  );

  // Immediately after creation we expect deleted_at to be null or undefined
  TestValidator.predicate(
    "inspected deleted_at should be null or undefined right after creation",
    inspected.deleted_at === null || inspected.deleted_at === undefined,
  );
}
