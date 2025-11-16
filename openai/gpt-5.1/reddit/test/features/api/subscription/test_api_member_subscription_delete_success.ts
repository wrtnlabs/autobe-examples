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
 * Validate that a member user can unsubscribe from a community by deleting
 * their own community subscription record.
 *
 * Business flow (adapted to available SDK functions):
 *
 * 1. Register and authenticate a platform admin.
 * 2. As platform admin, create a community visibility level master record.
 * 3. Register and authenticate a member user.
 * 4. As that member user, create a community referencing the created visibility
 *    level.
 * 5. Optionally create a generic subscription for the same community.
 * 6. Create a member-scoped subscription for that member user and community.
 * 7. Delete the member-scoped subscription via the memberUser-owned DELETE
 *    endpoint.
 * 8. Assert that all non-void responses have the correct structure and that the
 *    delete call completes without error.
 *
 * Due to limited read APIs (no GET for subscriptions is provided) and the
 * prohibition on HTTP status and type-error testing, we treat successful
 * completion of the erase call for the owning member as evidence of success.
 */
export async function test_api_member_subscription_delete_success(
  connection: api.IConnection,
) {
  // 1. Register a platform admin (also authenticates connection as platformAdmin)
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@admin.test.com`,
    password: "AdminPass!123",
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.console.local/join",
    referrer: "https://admin.console.local/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. (Optional) login as same platform admin to exercise login flow
  const platformAdminLoginBody = {
    identifier: platformAdmin.email,
    password: platformAdminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin.console.local/login",
    referrer: "https://admin.console.local/",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLoggedIn: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoggedIn);

  // 3. Create a visibility level as platform admin
  const visibilityCode = `vl_${RandomGenerator.alphabets(8)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityCreateBody },
    );
  typia.assert(visibilityLevel);

  TestValidator.equals(
    "visibility level code should match request",
    visibilityLevel.code,
    visibilityCreateBody.code,
  );

  // 4. Register a member user (auth switches connection to memberUser)
  const memberEmail: string & tags.Format<"email"> =
    `${RandomGenerator.alphabets(8)}@member.test.com` as string &
      tags.Format<"email">;

  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: memberEmail,
    password: "MemberPass!123",
    ip: "127.0.0.1",
    href: "https://app.local/join",
    referrer: "https://app.local/",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 5. (Optional) login as the member user to exercise login flow
  const memberLoginBody = {
    identifier: memberAuthorized.email,
    password: memberJoinBody.password,
    ip: "127.0.0.1",
    href: "https://app.local/login",
    referrer: "https://app.local/",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoggedIn: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoggedIn);

  TestValidator.equals(
    "member id after login should match joined member id",
    memberLoggedIn.id,
    memberAuthorized.id,
  );

  // 6. As member user, create a community referencing the visibility level code
  const communityIdentifier = `community_${RandomGenerator.alphabets(8)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 8 }),
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
    "created community identifier should match request",
    community.identifier,
    communityCreateBody.identifier,
  );
  TestValidator.equals(
    "created community visibility level code should match request",
    community.visibilityLevel.code,
    communityCreateBody.visibilityLevelCode,
  );

  // 7. Optionally create a generic subscription for this community
  const genericSubscriptionBody = {
    community_id: community.id,
    status: "active",
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const genericSubscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.subscriptions.create(
      connection,
      { body: genericSubscriptionBody },
    );
  typia.assert(genericSubscription);

  TestValidator.equals(
    "generic subscription community_id should match community.id",
    genericSubscription.community_id,
    community.id,
  );

  // 8. Create a member-scoped subscription for the same community
  const memberScopedSubscriptionBody = {
    community_id: community.id,
    status: "active",
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const memberScopedSubscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.memberUsers.subscriptions.create(
      connection,
      {
        memberUserId: memberLoggedIn.id,
        body: memberScopedSubscriptionBody,
      },
    );
  typia.assert(memberScopedSubscription);

  TestValidator.equals(
    "member-scoped subscription owner should be the logged-in member",
    memberScopedSubscription.member_user_id,
    memberLoggedIn.id,
  );
  TestValidator.equals(
    "member-scoped subscription community_id should match community.id",
    memberScopedSubscription.community_id,
    community.id,
  );

  // 9. Delete the member-scoped subscription as the owning member user
  await api.functional.communityPlatform.memberUser.memberUsers.subscriptions.erase(
    connection,
    {
      memberUserId: memberLoggedIn.id,
      subscriptionId: memberScopedSubscription.id,
    },
  );

  // 10. Since erase returns void and no read APIs exist for subscriptions,
  // we assert indirectly via successful completion of the call.
  await TestValidator.predicate(
    "member-scoped subscription delete call should complete without throwing",
    true,
  );
}
