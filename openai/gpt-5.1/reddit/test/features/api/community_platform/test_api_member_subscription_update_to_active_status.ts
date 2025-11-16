import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate that a member user can update their own community subscription
 * status to "active".
 *
 * Business flow covered by this test:
 *
 * 1. Platform admin joins and creates a community visibility level configuration.
 * 2. A member user joins (registers) and becomes authenticated.
 * 3. The member user creates a community referencing the created visibility level.
 * 4. The member user creates a generic subscription to the community.
 * 5. The member user creates a member-scoped subscription bound to their own
 *    memberUserId.
 * 6. The member user updates that member-scoped subscription's status to "active"
 *    using the PUT endpoint.
 * 7. The test validates that immutable fields are unchanged and that status and
 *    timestamps reflect the update.
 */
export async function test_api_member_subscription_update_to_active_status(
  connection: api.IConnection,
) {
  // 1. Platform admin joins
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    ip: undefined,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Platform admin creates a visibility level
  const visibilityCode = `vis_${RandomGenerator.alphaNumeric(8)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Test Visibility",
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  TestValidator.equals(
    "visibility level code should echo back",
    visibilityLevel.code,
    visibilityCode,
  );
  TestValidator.equals(
    "visibility level name should echo back",
    visibilityLevel.name,
    visibilityCreateBody.name,
  );

  // 3. Member user joins
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://app.example.com/join",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const memberUserId = memberAuthorized.id;

  // 4. Member user creates a community
  const communityCreateBody = {
    identifier: `community_${RandomGenerator.alphaNumeric(6)}`,
    title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: undefined,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  TestValidator.equals(
    "community visibility level code should match",
    community.visibilityLevel.code,
    visibilityCode,
  );

  // 5. Generic subscription (collection endpoint)
  const genericSubscriptionCreateBody = {
    community_id: community.id,
    status: "pending",
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const genericSubscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.subscriptions.create(
      connection,
      {
        body: genericSubscriptionCreateBody,
      },
    );
  typia.assert(genericSubscription);

  TestValidator.equals(
    "generic subscription community id should match",
    genericSubscription.community_id,
    community.id,
  );

  // 6. Member-scoped subscription creation
  const memberScopedSubscriptionCreateBody = {
    community_id: community.id,
    status: "pending",
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const subscriptionBefore: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.memberUsers.subscriptions.create(
      connection,
      {
        memberUserId,
        body: memberScopedSubscriptionCreateBody,
      },
    );
  typia.assert(subscriptionBefore);

  TestValidator.equals(
    "member-scoped subscription owner should be member user id",
    subscriptionBefore.member_user_id,
    memberUserId,
  );
  TestValidator.equals(
    "member-scoped subscription community id should match community",
    subscriptionBefore.community_id,
    community.id,
  );

  // 7. Update subscription status to active
  const updateBody = {
    status: "active",
  } satisfies ICommunityPlatformCommunitySubscription.IUpdate;

  const subscriptionAfter: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.memberUsers.subscriptions.update(
      connection,
      {
        memberUserId,
        subscriptionId: subscriptionBefore.id,
        body: updateBody,
      },
    );
  typia.assert(subscriptionAfter);

  // 7-1. Invariant checks
  TestValidator.equals(
    "subscription id should remain the same after update",
    subscriptionAfter.id,
    subscriptionBefore.id,
  );
  TestValidator.equals(
    "member_user_id should remain unchanged",
    subscriptionAfter.member_user_id,
    subscriptionBefore.member_user_id,
  );
  TestValidator.equals(
    "community_id should remain unchanged",
    subscriptionAfter.community_id,
    subscriptionBefore.community_id,
  );
  TestValidator.equals(
    "status should be updated to active",
    subscriptionAfter.status,
    "active",
  );
  TestValidator.equals(
    "created_at should remain unchanged",
    subscriptionAfter.created_at,
    subscriptionBefore.created_at,
  );

  const beforeUpdatedAt = new Date(subscriptionBefore.updated_at).getTime();
  const afterUpdatedAt = new Date(subscriptionAfter.updated_at).getTime();

  TestValidator.predicate(
    "updated_at after update should be greater than or equal to previous updated_at",
    afterUpdatedAt >= beforeUpdatedAt,
  );
}
