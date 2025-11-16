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
 * Verify access control on updating community subscriptions owned by another
 * member user.
 *
 * Business goal: Ensure that a community subscription can only be updated by
 * its owning member user (or higher-privileged actors), and that another
 * authenticated member user cannot modify someone else’s subscription even if
 * they know the subscriptionId.
 *
 * End-to-end scenario:
 *
 * 1. Register two distinct member users via POST /auth/memberUser/join:
 *
 *    - Owner: the member who will create the community and own the subscription
 *    - Attacker: another authenticated member user who will try to update Owner’s
 *         subscription
 * 2. Register a platform admin via POST /auth/platformAdmin/join to own
 *    visibility-level configuration.
 * 3. As the platform admin, create a visibility level via POST
 *    /communityPlatform/platformAdmin/communityVisibilityLevels using
 *    ICommunityPlatformCommunityVisibilityLevel.ICreate.
 * 4. As Owner (memberUser), create a community via POST
 *    /communityPlatform/memberUser/communities using
 *    ICommunityPlatformCommunity.ICreate, referencing the visibilityLevel.code
 *    created in step 3.
 * 5. As Owner, create a subscription for that community via POST
 *    /communityPlatform/memberUser/communities/{communityId}/subscriptions
 *    using ICommunityPlatformCommunitySubscription.ICreate. Capture the
 *    returned subscription object including id and status.
 * 6. Switch authentication to the Attacker member user.
 * 7. As Attacker, attempt to update Owner’s subscription via PUT
 *    /communityPlatform/memberUser/subscriptions/{subscriptionId}, passing an
 *    ICommunityPlatformCommunitySubscription.IUpdate body that changes status
 *    (e.g., from the initial status to "active"). This call must be wrapped
 *    with TestValidator.error to assert that the backend rejects the attempt
 *    (authorization failure).
 * 8. (Optional scenario rewrite) Because we do not have a dedicated GET-by-id
 *    subscription endpoint exposed in the provided SDK, we cannot directly
 *    refetch the subscription. Instead, we will trust that a failed update
 *    leaves the record unchanged and focus on validating that the unauthorized
 *    update fails.
 *
 * Important constraints and adjustments:
 *
 * - We must not rely on any non-provided SDK function (such as GET
 *   /subscriptions/{id}); only the given SDK methods can be used.
 * - We must not perform type-error testing (no wrong-type payloads). The
 *   unauthorized update must be attempted with a valid IUpdate payload and a
 *   real subscriptionId.
 * - Authentication context switching is performed only through the provided
 *   auth.memberUser and auth.platformAdmin join/login functions; we must not
 *   manually touch connection.headers.
 * - We do not assert concrete HTTP status codes; we only assert that an error is
 *   thrown for the unauthorized update attempt.
 *
 * Validation points:
 *
 * - The initial happy-path creation operations (admin join, visibility level
 *   create, owner join, community create, subscription create) all succeed and
 *   return correctly typed responses validated by typia.assert().
 * - The unauthorized update attempt by Attacker, using a valid subscriptionId and
 *   a valid IUpdate payload, results in an error captured by
 *   TestValidator.error().
 * - The test does not use any non-existent DTO properties or SDK functions and
 *   maintains strict type safety.
 */
export async function test_api_member_subscription_update_access_control_on_foreign_subscription(
  connection: api.IConnection,
) {
  // 1. Register Owner member user
  const ownerJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://owner.example.com/join",
    referrer: "https://owner.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const owner: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: ownerJoinBody,
    });
  typia.assert(owner);

  // 2. Register Attacker member user
  const attackerJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://attacker.example.com/join",
    referrer: "https://attacker.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const attacker: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: attackerJoinBody,
    });
  typia.assert(attacker);

  // 3. Register platform admin
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(2),
    ip: undefined,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(admin);

  // 4. Create visibility level as platform admin
  const visibilityCode = `public-${RandomGenerator.alphaNumeric(8)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Visibility",
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

  // 5. Switch to Owner context: login as Owner to ensure tokens are for Owner
  const ownerLoginBody = {
    identifier: owner.email,
    password: ownerJoinBody.password,
    ip: null,
    href: "https://owner.example.com/login",
    referrer: "https://owner.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const ownerLoggedIn: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: ownerLoginBody,
    });
  typia.assert(ownerLoggedIn);

  // 6. Create a community as Owner
  const communityIdentifier = `community_${RandomGenerator.alphaNumeric(8)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.name(3),
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

  // 7. Create a subscription for the Owner to that community
  const subscriptionCreateBody = {
    community_id: community.id,
    status: "pending",
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const ownerSubscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.communities.subscriptions.create(
      connection,
      {
        communityId: community.id,
        body: subscriptionCreateBody,
      },
    );
  typia.assert(ownerSubscription);

  // 8. Switch authentication to Attacker member user
  const attackerLoginBody = {
    identifier: attacker.email,
    password: attackerJoinBody.password,
    ip: null,
    href: "https://attacker.example.com/login",
    referrer: "https://attacker.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const attackerLoggedIn: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: attackerLoginBody,
    });
  typia.assert(attackerLoggedIn);

  // 9. Attacker attempts to update Owner's subscription
  const attackerUpdateBody = {
    status: "active",
  } satisfies ICommunityPlatformCommunitySubscription.IUpdate;

  await TestValidator.error(
    "attacker cannot update another member's subscription",
    async () => {
      await api.functional.communityPlatform.memberUser.subscriptions.update(
        connection,
        {
          subscriptionId: ownerSubscription.id,
          body: attackerUpdateBody,
        },
      );
    },
  );

  // We cannot refetch the subscription by id with provided SDK, so we only
  // assert that the unauthorized update attempt failed.
}
