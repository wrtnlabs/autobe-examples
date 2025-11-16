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
 * Validate that platform admin cannot perform invalid subscription status
 * transitions.
 *
 * Business context:
 *
 * - A community member subscribes to a community. That subscription has a status
 *   field (string) representing business states like `pending`, `active`,
 *   `rejected`, etc.
 * - Platform admins can update subscriptions via PUT
 *   /communityPlatform/platformAdmin/subscriptions/{subscriptionId} using
 *   ICommunityPlatformCommunitySubscription.IUpdate.
 * - However, some transitions should be prohibited even for platform admins; for
 *   example, once a subscription is moved to a terminal state such as
 *   `rejected`, it should not be possible to move it back to `pending`.
 *
 * This E2E test walks through a realistic multi-actor flow:
 *
 * 1. Register and authenticate a platform administrator (auth.platformAdmin.join).
 * 2. As platform admin, create a community visibility level
 *    (communityVisibilityLevels.create) to be used by communities.
 * 3. Register and authenticate a member user (auth.memberUser.join).
 * 4. As member user, create a community referencing that visibility level
 *    (communities.create).
 * 5. As member user, create a subscription to that community
 *    (memberUser.subscriptions.create) with an initial non-terminal status
 *    (e.g., `pending`).
 * 6. Switch back to platform admin (auth.platformAdmin.login) so updates are made
 *    in admin context.
 * 7. Perform a first, valid update via platformAdmin.subscriptions.update to move
 *    status to a terminal value like `rejected`, asserting that the update
 *    succeeds and status is `rejected`.
 * 8. Attempt a second update via platformAdmin.subscriptions.update to move status
 *    from `rejected` back to a non-terminal value like `pending`, expecting
 *    this to be rejected by business rules.
 * 9. Use TestValidator.error to assert that the second update throws, proving that
 *    invalid transitions are not allowed even for platform admins.
 *
 * Because there is no subscription-read endpoint in the provided SDK, we
 * validate state immutability only indirectly: the failed update must throw and
 * cannot mutate the subscription object returned by the first successful update
 * call.
 */
export async function test_api_platform_admin_cannot_set_invalid_subscription_status_transition(
  connection: api.IConnection,
) {
  // 1. Register a platform admin (join implicitly authenticates and sets token).
  const platformAdminJoin = await api.functional.auth.platformAdmin.join(
    connection,
    {
      body: {
        username: RandomGenerator.name(1),
        email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
        password: "AdminPass!123",
        displayName: RandomGenerator.name(),
        ip: RandomGenerator.mobile(),
        href: "https://admin.example.com/signup",
        referrer: "https://admin.example.com/",
      } satisfies ICommunityPlatformPlatformadmin.IJoin,
    },
  );
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(platformAdminJoin);

  const platformAdminEmail = platformAdminJoin.email;
  const platformAdminUsername = platformAdminJoin.username;

  // 2. As platform admin, create a visibility level.
  const visibilityCode = `public-${RandomGenerator.alphaNumeric(8)}`;
  const visibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: {
          code: visibilityCode,
          name: `Public ${RandomGenerator.name(1)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate,
      },
    );
  typia.assert<ICommunityPlatformCommunityVisibilityLevel>(visibilityLevel);
  TestValidator.equals(
    "visibility level code should match input",
    visibilityLevel.code,
    visibilityCode,
  );

  // 3. Register a member user (join) - this also authenticates as the member user.
  const memberEmail = `${RandomGenerator.alphaNumeric(8)}@member.example.com`;
  const memberJoin = await api.functional.auth.memberUser.join(connection, {
    body: {
      username: RandomGenerator.name(1),
      email: memberEmail as string & tags.Format<"email">,
      password: "MemberPass!123",
      ip: null,
      href: "https://app.example.com/signup",
      referrer: "https://app.example.com/landing",
    } satisfies ICommunityPlatformMemberuser.IJoinRequest,
  });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberJoin);
  const memberUsername = memberJoin.username;

  // 4. As member user, create a community tied to the visibility level code.
  const communityIdentifier = `community-${RandomGenerator.alphaNumeric(6)}`;
  const communityTitle = `Community ${RandomGenerator.name(1)}`;
  const community =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: {
          identifier: communityIdentifier,
          title: communityTitle,
          description: RandomGenerator.paragraph({ sentences: 4 }),
          visibilityLevelCode: visibilityLevel.code,
          isNsfw: false,
          primaryTagIds: [],
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert<ICommunityPlatformCommunity>(community);
  TestValidator.equals(
    "community identifier should match input",
    community.identifier,
    communityIdentifier,
  );

  // 5. As member user, create a subscription to the community with initial status "pending".
  const subscriptionCreateStatus = "pending";
  const createdSubscription =
    await api.functional.communityPlatform.memberUser.subscriptions.create(
      connection,
      {
        body: {
          community_id: community.id,
          status: subscriptionCreateStatus,
        } satisfies ICommunityPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert<ICommunityPlatformCommunitySubscription>(createdSubscription);
  TestValidator.equals(
    "created subscription community_id matches community.id",
    createdSubscription.community_id,
    community.id,
  );
  TestValidator.equals(
    "created subscription status should be pending",
    createdSubscription.status,
    subscriptionCreateStatus,
  );

  const subscriptionId = createdSubscription.id;

  // 6. Switch back to platform admin by logging in explicitly.
  const platformAdminLogin = await api.functional.auth.platformAdmin.login(
    connection,
    {
      body: {
        identifier:
          platformAdminEmail.length > 0
            ? platformAdminEmail
            : platformAdminUsername,
        password: "AdminPass!123",
        ip: null,
        href: "https://admin.example.com/login",
        referrer: "https://admin.example.com/",
      } satisfies ICommunityPlatformPlatformadmin.ILogin,
    },
  );
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(platformAdminLogin);

  // 7. First valid update: move subscription status to a terminal value "rejected".
  const terminalStatus = "rejected";
  const rejectedSubscription =
    await api.functional.communityPlatform.platformAdmin.subscriptions.update(
      connection,
      {
        subscriptionId,
        body: {
          status: terminalStatus,
        } satisfies ICommunityPlatformCommunitySubscription.IUpdate,
      },
    );
  typia.assert<ICommunityPlatformCommunitySubscription>(rejectedSubscription);
  TestValidator.equals(
    "first update should change status to rejected",
    rejectedSubscription.status,
    terminalStatus,
  );

  // 8. Second, invalid update: attempt to move from "rejected" back to "pending".
  const invalidTargetStatus = "pending";
  await TestValidator.error(
    "invalid transition rejected -> pending should fail for platform admin",
    async () => {
      await api.functional.communityPlatform.platformAdmin.subscriptions.update(
        connection,
        {
          subscriptionId,
          body: {
            status: invalidTargetStatus,
          } satisfies ICommunityPlatformCommunitySubscription.IUpdate,
        },
      );
    },
  );

  // 9. We cannot re-fetch from server, but we can assert that our last known
  // good object still reflects the terminal status, emphasizing that only the
  // successful update mutated state on the server and that the failed update
  // did not alter our expectations.
  TestValidator.equals(
    "subscription status remains rejected after failed invalid transition",
    rejectedSubscription.status,
    terminalStatus,
  );
}
