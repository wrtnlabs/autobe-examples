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
 * Ensure that a member user cannot update another member user’s subscription.
 *
 * Business goal
 *
 * - Validate that the memberUser-scoped subscription update endpoint enforces
 *   ownership: the authenticated member user must match the memberUserId path
 *   parameter.
 * - When a different member user attempts to update someone else’s subscription,
 *   the API must reject the request without succeeding.
 *
 * Scenario (adapted to available APIs):
 *
 * 1. Create and authenticate a platform admin via POST /auth/platformAdmin/join.
 * 2. As platform admin, create a community visibility level via POST
 *    /communityPlatform/platformAdmin/communityVisibilityLevels.
 * 3. Join Member A via POST /auth/memberUser/join (this logs in as Member A).
 * 4. As Member A, create a community via POST
 *    /communityPlatform/memberUser/communities, using the visibility level code
 *    created in step 2.
 * 5. As Member A, create a generic subscription to that community via POST
 *    /communityPlatform/memberUser/subscriptions (base subscription flow).
 * 6. As Member A, create a member-scoped subscription via POST
 *    /communityPlatform/memberUser/memberUsers/{memberUserId}/subscriptions
 *    with memberUserId = Member A’s id and community_id from the community.
 * 7. Join Member B via POST /auth/memberUser/join (this logs in as Member B and
 *    overwrites the Authorization header).
 * 8. As Member B, attempt to update Member A’s subscription via PUT
 *    /communityPlatform/memberUser/memberUsers/{memberUserId}/subscriptions/{subscriptionId}
 *    with memberUserId = Member A’s id and subscriptionId from step 6,
 *    providing an ICommunityPlatformCommunitySubscription.IUpdate payload that
 *    changes the status.
 * 9. Assert that this update attempt fails (throws an error) using
 *    TestValidator.error with an async callback.
 *
 * Notes and constraints
 *
 * - We must not test specific HTTP status codes; only that an error occurs.
 * - We must not create type-mismatch scenarios or omit required fields. All
 *   payloads must conform exactly to their DTOs.
 * - The SDK automatically manages the Authorization header for the connection; we
 *   do not touch connection.headers directly.
 */
export async function test_api_member_subscription_update_unauthorized_user(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform admin (platformAdmin.join)
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(8),
    email: `admin+${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: "Password123!",
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://platform.example.com/admin/join",
    referrer: "https://platform.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. As platform admin, create a community visibility level
  const visibilityCode = `vis_${RandomGenerator.alphaNumeric(6)}`;

  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Test Visibility Level",
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

  // 3. Join Member A (memberUser.join) – this authenticates as Member A
  const memberAJoinBody = {
    username: `memberA_${RandomGenerator.alphaNumeric(6)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password123!",
    ip: "127.0.0.1",
    href: "https://platform.example.com/member/join",
    referrer: "https://platform.example.com/home",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberA: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberAJoinBody,
    });
  typia.assert(memberA);

  // 4. As Member A, create a community using the created visibility level code
  const communityIdentifier = `community_${RandomGenerator.alphaNumeric(6)}`;

  const communityCreateBody = {
    identifier: communityIdentifier,
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

  // 5. As Member A, create a generic subscription to the community
  const genericSubscriptionBody = {
    community_id: community.id,
    status: "active",
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const genericSubscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.subscriptions.create(
      connection,
      {
        body: genericSubscriptionBody,
      },
    );
  typia.assert(genericSubscription);

  // 6. As Member A, create a member-scoped subscription
  const memberScopedSubscriptionBody = {
    community_id: community.id,
    status: "active",
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const memberScopedSubscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.memberUsers.subscriptions.create(
      connection,
      {
        memberUserId: memberA.id,
        body: memberScopedSubscriptionBody,
      },
    );
  typia.assert(memberScopedSubscription);

  // 7. Join Member B – this authenticates as Member B and overwrites Authorization
  const memberBJoinBody = {
    username: `memberB_${RandomGenerator.alphaNumeric(6)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password123!",
    ip: "127.0.0.1",
    href: "https://platform.example.com/member/join",
    referrer: "https://platform.example.com/home",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberB: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberBJoinBody,
    });
  typia.assert(memberB);

  // 8. As Member B, attempt to update Member A’s member-scoped subscription
  const unauthorizedUpdateBody = {
    status: "rejected",
  } satisfies ICommunityPlatformCommunitySubscription.IUpdate;

  await TestValidator.error(
    "member B cannot update member A subscription",
    async () => {
      await api.functional.communityPlatform.memberUser.memberUsers.subscriptions.update(
        connection,
        {
          memberUserId: memberA.id,
          subscriptionId: memberScopedSubscription.id,
          body: unauthorizedUpdateBody,
        },
      );
    },
  );
}
