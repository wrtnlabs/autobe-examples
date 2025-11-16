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
 * Validate that a member user cannot perform an invalid status transition on
 * their community subscription using the memberUser-scoped update API.
 *
 * Business intent:
 *
 * - Once a subscription has reached a terminal / moderation-controlled state such
 *   as "rejected", a regular member user must not be able to reactivate it on
 *   their own by calling the update endpoint.
 * - The backend must enforce status transition rules and reject such attempts
 *   with an error.
 *
 * Scenario steps:
 *
 * 1. Create and authenticate a platform admin.
 * 2. As platform admin, create a visibility level that communities can use.
 * 3. Create and authenticate a member user.
 * 4. As member user, create a community using the created visibility level.
 * 5. As member user, create a generic subscription to that community.
 * 6. As the same member user, create a member-scoped subscription for that
 *    community, setting its status to a terminal / rejected-like state.
 * 7. Attempt to update the subscription via the memberUser update endpoint to move
 *    it to an active-like state.
 * 8. Assert that the update call fails (throws an HTTP error) using
 *    TestValidator.error.
 * 9. Optionally, assert that the original subscription DTO in memory still
 *    reflects the original rejected status (no in-memory mutation).
 */
export async function test_api_member_subscription_update_invalid_status_transition(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform admin.
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: RandomGenerator.alphaNumeric(8),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. As platform admin, create a visibility level for communities.
  const visibilityCode = `public-${RandomGenerator.alphaNumeric(6)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Visibility",
    description: RandomGenerator.paragraph({ sentences: 4 }),
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
    "created visibility level code matches request",
    visibilityLevel.code,
    visibilityCode,
  );

  // 3. Create and authenticate a member user.
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: RandomGenerator.alphaNumeric(8),
    href: "https://app.example.com/join",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const memberId = memberAuthorized.id;

  // 4. As member user, create a community using the created visibility level.
  const communityCreateBody = {
    identifier: `community-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibilityLevelCode: visibilityCode,
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

  // 5. As member user, create a generic subscription to the community.
  const genericSubscriptionCreateBody = {
    community_id: community.id,
    status: "active",
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const genericSubscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.subscriptions.create(
      connection,
      {
        body: genericSubscriptionCreateBody,
      },
    );
  typia.assert(genericSubscription);

  // 6. Create a member-scoped subscription with a terminal status (e.g., rejected).
  const memberScopedSubscriptionCreateBody = {
    community_id: community.id,
    status: "rejected",
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const memberScopedSubscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.memberUsers.subscriptions.create(
      connection,
      {
        memberUserId: memberId,
        body: memberScopedSubscriptionCreateBody,
      },
    );
  typia.assert(memberScopedSubscription);

  TestValidator.equals(
    "member-scoped subscription has rejected status at creation",
    memberScopedSubscription.status,
    "rejected",
  );

  // Capture original status and timestamps for later comparison.
  const originalStatus = memberScopedSubscription.status;
  const originalUpdatedAt = memberScopedSubscription.updated_at;

  // 7. Attempt to update the subscription to move it back to an active-like state.
  const invalidUpdateBody = {
    status: "active",
  } satisfies ICommunityPlatformCommunitySubscription.IUpdate;

  await TestValidator.error(
    "member user cannot change rejected subscription back to active",
    async () => {
      await api.functional.communityPlatform.memberUser.memberUsers.subscriptions.update(
        connection,
        {
          memberUserId: memberId,
          subscriptionId: memberScopedSubscription.id,
          body: invalidUpdateBody,
        },
      );
    },
  );

  // 9. Ensure that our original in-memory subscription object has not changed.
  TestValidator.equals(
    "original subscription status remains rejected after failed update",
    memberScopedSubscription.status,
    originalStatus,
  );
  TestValidator.equals(
    "original subscription updated_at remains unchanged after failed update",
    memberScopedSubscription.updated_at,
    originalUpdatedAt,
  );
}
