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
 * Verify non-existent member subscription deletion does not affect existing
 * data.
 *
 * Business goal:
 *
 * - Ensure that when a member user attempts to delete a subscription by a
 *   well-formed but non-existent subscriptionId, the platform returns a
 *   controlled error and does not delete or modify any existing subscriptions.
 *
 * Scenario outline:
 *
 * 1. Prepare actors and configuration:
 *
 *    - Create a member user using /auth/memberUser/join.
 *    - Create a platform admin using /auth/platformAdmin/join and log in as that
 *         admin.
 *    - As platform admin, create a visibility level that communities can use.
 * 2. Create community and a real subscription for the member:
 *
 *    - Switch to (or remain as) the member user authentication context.
 *    - Create a community using /communityPlatform/memberUser/communities with the
 *         visibility level code created by platform admin.
 *    - Create a subscription for the member user to that community using
 *         /communityPlatform/memberUser/memberUsers/{memberUserId}/subscriptions.
 * 3. Attempt to delete a non-existent subscription:
 *
 *    - Generate a random UUID to serve as a fake subscriptionId.
 *    - Call DELETE
 *         /communityPlatform/memberUser/memberUsers/{memberUserId}/subscriptions/{subscriptionId}
 *         using the fake subscriptionId and the member user's auth context.
 *    - Assert via TestValidator.error that the call fails (throws), without checking
 *         specific HTTP status codes.
 * 4. Verify that the real subscription is still intact until explicitly deleted:
 *
 *    - Immediately after the failed delete, call DELETE again, but this time with
 *         the real subscription id created earlier.
 *    - The fact that this second delete succeeds without throwing demonstrates that
 *         the real subscription remained present and was not affected by the
 *         failed attempt to delete a non-existent id.
 *
 * Validation strategy:
 *
 * - Use typia.assert() on all non-void responses to enforce DTO correctness.
 * - Use TestValidator.error() with an async callback to assert that the fake-id
 *   delete attempt throws an error.
 * - Use TestValidator.equals() to double-check basic invariants where helpful
 *   (e.g., ensuring the subscription’s member_user_id and community_id match
 *   the created member and community).
 */
export async function test_api_member_subscription_delete_nonexistent_subscription(
  connection: api.IConnection,
) {
  // 1. Member user registration (join) to obtain authenticated member context
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    ip: null,
    href: "https://member.example.com/join",
    referrer: "https://member.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Platform admin registration and login, to create a visibility level
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(16),
    displayName: RandomGenerator.name(2),
    ip: RandomGenerator.mobile(),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // Explicit login as platform admin to demonstrate actor switching capability
  const adminLoginBody = {
    identifier: platformAdminAuthorized.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/dashboard",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLoggedIn: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(platformAdminLoggedIn);

  // 3. Create a visibility level as platform admin
  const visibilityCode = `public-${RandomGenerator.alphabets(6)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: `Public ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
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
    "visibility level code should match creation payload",
    visibilityLevel.code,
    visibilityCreateBody.code,
  );

  // 4. Switch back to member user context by logging in as that member
  const memberLoginBody = {
    identifier: memberAuthorized.email,
    password: memberJoinBody.password,
    ip: null,
    href: "https://member.example.com/login",
    referrer: "https://member.example.com/home",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoggedIn: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoggedIn);

  // 5. As member user, create a community using the new visibility level
  const communityCreateBody = {
    identifier: `community-${RandomGenerator.alphabets(8)}`,
    title: `Community ${RandomGenerator.name(2)}`,
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    primaryTagIds: [],
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
    "community identifier should match creation payload",
    community.identifier,
    communityCreateBody.identifier,
  );

  // 6. Create a real subscription for member -> community
  const subscriptionCreateBody = {
    community_id: community.id,
    status: "active",
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const subscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.memberUsers.subscriptions.create(
      connection,
      {
        memberUserId: memberLoggedIn.id,
        body: subscriptionCreateBody,
      },
    );
  typia.assert(subscription);

  TestValidator.equals(
    "subscription member_user_id should match memberLoggedIn.id",
    subscription.member_user_id,
    memberLoggedIn.id,
  );
  TestValidator.equals(
    "subscription community_id should match created community",
    subscription.community_id,
    community.id,
  );

  // 7. Generate a fake subscriptionId (well-formed UUID that does not belong to this user)
  const fakeSubscriptionId = typia.random<string & tags.Format<"uuid">>();

  // Ensure fake id is distinct from the real one to avoid accidental collision
  TestValidator.notEquals(
    "fake subscription id should differ from real subscription id",
    fakeSubscriptionId,
    subscription.id,
  );

  // 8. Attempt to delete using fake subscription id and expect an error
  await TestValidator.error(
    "deleting non-existent subscription must fail",
    async () => {
      await api.functional.communityPlatform.memberUser.memberUsers.subscriptions.erase(
        connection,
        {
          memberUserId: memberLoggedIn.id,
          subscriptionId: fakeSubscriptionId,
        },
      );
    },
  );

  // 9. Verify that the real subscription still existed until we explicitly delete it
  // by successfully deleting it now.
  await api.functional.communityPlatform.memberUser.memberUsers.subscriptions.erase(
    connection,
    {
      memberUserId: memberLoggedIn.id,
      subscriptionId: subscription.id,
    },
  );
}
