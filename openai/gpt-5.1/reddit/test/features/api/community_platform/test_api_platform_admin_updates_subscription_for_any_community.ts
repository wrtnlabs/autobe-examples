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
 * Validate that a platform admin can update any member user's community
 * subscription.
 *
 * Business goal:
 *
 * - Prove that a globally privileged platform admin can change the status of a
 *   subscription record that was created under a member user and community
 *   context, and that immutable linkage fields remain unchanged.
 *
 * End-to-end flow:
 *
 * 1. Register a platform admin via POST /auth/platformAdmin/join.
 * 2. As that admin, create a community visibility level via POST
 *    /communityPlatform/platformAdmin/communityVisibilityLevels.
 * 3. Register a member user via POST /auth/memberUser/join.
 * 4. Authenticate as the member user via POST /auth/memberUser/login to simulate a
 *    distinct member session.
 * 5. As the member user, create a community via POST
 *    /communityPlatform/memberUser/communities using the created visibility
 *    level code.
 * 6. As the same member user, create a subscription via POST
 *    /communityPlatform/memberUser/subscriptions pointing to the community.
 * 7. Switch back to the platform admin context via POST /auth/platformAdmin/login
 *    (SDK handles token injection on the shared connection).
 * 8. Call PUT /communityPlatform/platformAdmin/subscriptions/{subscriptionId}
 *    using api.functional.communityPlatform.platformAdmin.subscriptions.update
 *    with body typed as ICommunityPlatformCommunitySubscription.IUpdate,
 *    changing only the status field to a new value.
 * 9. Assert that:
 *
 *    - The response is a valid ICommunityPlatformCommunitySubscription.
 *    - The id field matches the original subscription.id.
 *    - Member_user_id and community_id match the original subscription.
 *    - The status field equals the new status value and differs from the original
 *         status.
 *
 * Notes:
 *
 * - There is no GET-by-id read endpoint in the SDK, so persistence verification
 *   relies on the update response object itself, not a separate read.
 * - Status values are treated as free-form strings; we simply change from
 *   "pending" to another literal value to simulate a valid transition.
 */
export async function test_api_platform_admin_updates_subscription_for_any_community(
  connection: api.IConnection,
) {
  // 1. Register a platform admin (join) and get initial token
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: `admin_${RandomGenerator.alphabets(8)}@example.com`,
    password: "StrongP@ssw0rd",
    displayName: RandomGenerator.name(2),
    ip: "127.0.0.1",
    href: "https://admin-console.example.com/register",
    referrer: "https://admin-console.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorizedFromJoin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorizedFromJoin);

  // 2. As platform admin, create a visibility level
  const visibilityLevelBody = {
    code: `vl_${RandomGenerator.alphabets(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityLevelBody,
      },
    );
  typia.assert(visibilityLevel);

  // 3. Register a member user
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: `member_${RandomGenerator.alphabets(8)}@example.com`,
    password: "MemberP@ss1",
    ip: "203.0.113.10",
    href: "https://app.example.com/join",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorizedFromJoin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorizedFromJoin);

  // 4. Explicit member login to simulate a separate session context
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: "203.0.113.10",
    href: "https://app.example.com/login",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberAuthorizedFromLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberAuthorizedFromLogin);

  // 5. As member user, create a community referencing the visibility level code
  const communityCreateBody = {
    identifier: `community_${RandomGenerator.alphabets(6)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
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

  // 6. As member user, create a subscription for that community
  const initialStatus = "pending";
  const subscriptionCreateBody = {
    community_id: community.id,
    status: initialStatus,
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const subscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.subscriptions.create(
      connection,
      {
        body: subscriptionCreateBody,
      },
    );
  typia.assert(subscription);

  // Basic sanity checks on the created subscription
  TestValidator.equals(
    "created subscription uses requested community_id",
    subscription.community_id,
    community.id,
  );
  TestValidator.equals(
    "created subscription uses requested status",
    subscription.status,
    initialStatus,
  );

  // 7. Switch back to platform admin via explicit login to simulate context swap
  const platformAdminLoginBody = {
    identifier: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin-console.example.com/login",
    referrer: "https://admin-console.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminAuthorizedFromLogin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminAuthorizedFromLogin);

  // 8. Platform admin updates the subscription status
  const updatedStatus = initialStatus === "pending" ? "active" : "pending";
  const subscriptionUpdateBody = {
    status: updatedStatus,
  } satisfies ICommunityPlatformCommunitySubscription.IUpdate;

  const updatedSubscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.platformAdmin.subscriptions.update(
      connection,
      {
        subscriptionId: subscription.id,
        body: subscriptionUpdateBody,
      },
    );
  typia.assert(updatedSubscription);

  // 9. Assertions on immutable linkage fields and updated status
  TestValidator.equals(
    "subscription id remains unchanged after admin update",
    updatedSubscription.id,
    subscription.id,
  );
  TestValidator.equals(
    "member_user_id remains unchanged after admin update",
    updatedSubscription.member_user_id,
    subscription.member_user_id,
  );
  TestValidator.equals(
    "community_id remains unchanged after admin update",
    updatedSubscription.community_id,
    subscription.community_id,
  );
  TestValidator.equals(
    "status is updated to new value by platform admin",
    updatedSubscription.status,
    updatedStatus,
  );
  TestValidator.notEquals(
    "status changed compared to original subscription",
    updatedSubscription.status,
    subscription.status,
  );
}
