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
 * Verify that updating a non-existent subscription under a valid member user
 * context fails without affecting existing subscriptions.
 *
 * Business flow:
 *
 * 1. Register a platform admin and create a community visibility level.
 * 2. Register a member user (join) to obtain a memberUserId and authenticated
 *    context.
 * 3. As the member user, create a community using the previously created
 *    visibility level.
 * 4. Create a real subscription for the member user and community.
 * 5. Attempt to update a subscription using a random, non-existent UUID for
 *    subscriptionId and a valid update body; expect an error.
 * 6. Update the real subscription successfully afterwards to confirm it still
 *    works and was not affected by the failed update.
 */
export async function test_api_member_subscription_update_nonexistent_subscription(
  connection: api.IConnection,
) {
  // 1. Create a platform admin and login (join already establishes an authenticated admin session)
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(2),
    ip: undefined,
    href: "https://admin.join.example.com/",
    referrer: "https://admin.landing.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Create a visibility level as platform admin
  const visibilityCode = `public-${RandomGenerator.alphaNumeric(8)}`;
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

  // 3. Register a member user via join (also authenticates as that member user)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    ip: undefined,
    href: "https://member.join.example.com/",
    referrer: "https://member.referrer.example.com/",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const memberUserId = memberAuthorized.id;

  // 4. Ensure we are authenticated as this member user (login)
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: undefined,
    href: "https://member.login.example.com/",
    referrer: "https://member.login-referrer.example.com/",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoginAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginAuthorized);

  // 5. Create a community as the member user using the created visibility level
  const communityCreateBody = {
    identifier: `community-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
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

  // 6. Create a real subscription for this member user and community
  const subscriptionCreateBody = {
    community_id: community.id,
    status: "pending",
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const realSubscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.memberUsers.subscriptions.create(
      connection,
      {
        memberUserId,
        body: subscriptionCreateBody,
      },
    );
  typia.assert(realSubscription);

  // Sanity checks on created subscription
  TestValidator.equals(
    "subscription belongs to the member user",
    realSubscription.member_user_id,
    memberUserId,
  );
  TestValidator.equals(
    "subscription targets the created community",
    realSubscription.community_id,
    community.id,
  );

  const originalSubscriptionId = realSubscription.id;
  const originalStatus = realSubscription.status;

  // 7. Generate a fake, non-existent subscription UUID (ensure it's different)
  let fakeSubscriptionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  if (fakeSubscriptionId === originalSubscriptionId) {
    fakeSubscriptionId = typia.random<string & tags.Format<"uuid">>();
  }

  // 8. Attempt to update non-existent subscription and expect an error
  const nonexistentUpdateBody = {
    status: "active",
  } satisfies ICommunityPlatformCommunitySubscription.IUpdate;

  await TestValidator.error(
    "updating a non-existent subscription should fail",
    async () => {
      await api.functional.communityPlatform.memberUser.memberUsers.subscriptions.update(
        connection,
        {
          memberUserId,
          subscriptionId: fakeSubscriptionId,
          body: nonexistentUpdateBody,
        },
      );
    },
  );

  // 9. Update the real subscription afterwards to prove it is still intact
  const realUpdateBody = {
    status: originalStatus === "pending" ? "active" : "pending",
  } satisfies ICommunityPlatformCommunitySubscription.IUpdate;

  const updatedRealSubscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.memberUsers.subscriptions.update(
      connection,
      {
        memberUserId,
        subscriptionId: originalSubscriptionId,
        body: realUpdateBody,
      },
    );
  typia.assert(updatedRealSubscription);

  // 10. Validate that the real subscription is still the same record and its status changed
  TestValidator.equals(
    "real subscription id remains unchanged after valid update",
    updatedRealSubscription.id,
    originalSubscriptionId,
  );
  TestValidator.notEquals(
    "real subscription status should change after valid update",
    updatedRealSubscription.status,
    originalStatus,
  );
}
