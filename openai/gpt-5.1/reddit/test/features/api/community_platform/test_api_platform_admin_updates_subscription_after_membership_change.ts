import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate that a platform administrator can update a community subscription
 * after membership-related changes, ensuring linkage consistency.
 *
 * Business flow:
 *
 * 1. Register and authenticate a platformAdmin.
 * 2. Register and authenticate a memberUser.
 * 3. As platformAdmin, create a community visibility level.
 * 4. As memberUser, create a community using that visibility level.
 * 5. As platformAdmin, create a community membership for the member user in that
 *    community.
 * 6. As memberUser, create a subscription for that community.
 * 7. As platformAdmin, update the subscription status via the admin endpoint.
 * 8. Assert that the subscription id and linkage fields (community_id,
 *    member_user_id) remain the same and that the status and updated_at fields
 *    reflect the update.
 */
export async function test_api_platform_admin_updates_subscription_after_membership_change(
  connection: api.IConnection,
) {
  // 1. Register and authenticate platformAdmin
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    ip: RandomGenerator.mobile(),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  const platformAdminId = platformAdminAuthorized.id;

  // 2. Register and authenticate memberUser
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://app.example.com/join",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorizedOnJoin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorizedOnJoin);

  const memberUserId = memberAuthorizedOnJoin.id;

  // Ensure memberUser is logged in explicitly (even though join already authenticated)
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: null,
    href: "https://app.example.com/login",
    referrer: "https://app.example.com/home",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberAuthorizedOnLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberAuthorizedOnLogin);

  // 3. Switch to platformAdmin and create visibility level
  const platformAdminLoginBody = {
    identifier: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/home",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminAuthorizedOnLogin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminAuthorizedOnLogin);
  TestValidator.equals(
    "platform admin id remains stable after login",
    platformAdminAuthorizedOnLogin.id,
    platformAdminId,
  );

  const visibilityCode = `code-${RandomGenerator.alphaNumeric(8)}`;

  const visibilityCreateBody = {
    code: visibilityCode,
    name: `Visibility ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityCreateBody },
    );
  typia.assert(visibilityLevel);
  TestValidator.equals(
    "visibility level code matches creation payload",
    visibilityLevel.code,
    visibilityCreateBody.code,
  );

  // 4. Switch back to memberUser and create community
  const memberAuthorizedAfterReLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberAuthorizedAfterReLogin);
  TestValidator.equals(
    "member user id remains stable after login",
    memberAuthorizedAfterReLogin.id,
    memberUserId,
  );

  const communityIdentifier = `community-${RandomGenerator.alphaNumeric(8)}`;

  const communityCreateBody = {
    identifier: communityIdentifier,
    title: `Community ${RandomGenerator.name(2)}`,
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  TestValidator.equals(
    "community identifier matches creation payload",
    community.identifier,
    communityCreateBody.identifier,
  );

  const communityId = community.id;

  // 5. Switch to platformAdmin and create membership for member user
  const platformAdminAuthorizedAfterReLogin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminAuthorizedAfterReLogin);

  const membershipCreateBody = {
    memberuser_id: memberUserId,
    is_active: true,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.platformAdmin.communities.memberships.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: membershipCreateBody,
      },
    );
  typia.assert(membership);

  TestValidator.equals(
    "membership community id matches community",
    membership.community.id,
    communityId,
  );
  TestValidator.equals(
    "membership member user id matches memberUser",
    membership.memberuser.id,
    memberUserId,
  );
  TestValidator.predicate(
    "membership is active",
    membership.is_active === true,
  );

  // 6. Switch back to memberUser and create subscription for that community
  const memberAuthorizedBeforeSubscription: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberAuthorizedBeforeSubscription);

  const subscriptionCreateBody = {
    community_id: communityId,
    status: "active",
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const subscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.communities.subscriptions.create(
      connection,
      {
        communityId: communityId,
        body: subscriptionCreateBody,
      },
    );
  typia.assert(subscription);

  TestValidator.equals(
    "subscription community_id matches community id",
    subscription.community_id,
    communityId,
  );
  TestValidator.equals(
    "subscription member_user_id matches member user id",
    subscription.member_user_id,
    memberUserId,
  );

  const originalSubscriptionId = subscription.id;
  const originalStatus = subscription.status;
  const originalCreatedAt = subscription.created_at;
  const originalUpdatedAt = subscription.updated_at;

  // 7. Switch to platformAdmin and update the subscription status
  const platformAdminAuthorizedBeforeUpdate: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminAuthorizedBeforeUpdate);

  const updatedStatus = originalStatus === "active" ? "rejected" : "active";

  const updateBody = {
    status: updatedStatus,
  } satisfies ICommunityPlatformCommunitySubscription.IUpdate;

  const updatedSubscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.platformAdmin.communities.subscriptions.update(
      connection,
      {
        communityId: communityId,
        subscriptionId: originalSubscriptionId as string & tags.Format<"uuid">,
        body: updateBody,
      },
    );
  typia.assert(updatedSubscription);

  // 8. Validate that linkage fields and identifiers remain stable
  TestValidator.equals(
    "subscription id remains unchanged after update",
    updatedSubscription.id,
    originalSubscriptionId,
  );
  TestValidator.equals(
    "subscription community_id remains unchanged after update",
    updatedSubscription.community_id,
    subscription.community_id,
  );
  TestValidator.equals(
    "subscription member_user_id remains unchanged after update",
    updatedSubscription.member_user_id,
    subscription.member_user_id,
  );

  // 9. Validate status change and timestamps
  TestValidator.equals(
    "subscription status reflects updated value",
    updatedSubscription.status,
    updatedStatus,
  );

  TestValidator.equals(
    "subscription created_at remains unchanged after update",
    updatedSubscription.created_at,
    originalCreatedAt,
  );

  TestValidator.predicate(
    "subscription updated_at should be same or later than original",
    updatedSubscription.updated_at >= originalUpdatedAt,
  );
}
