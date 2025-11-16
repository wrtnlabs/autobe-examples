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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunitySubscription";

/**
 * Verify access control for the community subscriptions index endpoint.
 *
 * Business objectives:
 *
 * - Ensure that a member user (memberUser actor) cannot call the platformAdmin
 *   subscriptions index endpoint for a community.
 * - Ensure that a platform administrator (platformAdmin actor) can call the same
 *   endpoint and see subscriptions for a specific community.
 *
 * Scenario steps:
 *
 * 1. Register a platform admin via POST /auth/platformAdmin/join to obtain an
 *    initial admin session and token.
 * 2. As the platform admin, create a community visibility level via POST
 *    /communityPlatform/platformAdmin/communityVisibilityLevels. The resulting
 *    visibilityLevel.code will be used when creating a community.
 * 3. Register a member user via POST /auth/memberUser/join to obtain a member
 *    session and token. This switches the connection to memberUser context.
 * 4. As the member user, create a community via POST
 *    /communityPlatform/memberUser/communities using the visibility level from
 *    step 2.
 * 5. Still as the member user, create a subscription for that community via POST
 *    /communityPlatform/memberUser/communities/{communityId}/subscriptions.
 * 6. With the memberUser token active, attempt to call PATCH
 *    /communityPlatform/platformAdmin/communities/{communityId}/subscriptions
 *    and expect an authorization error (forbidden for member users).
 * 7. Log in again as the platform admin via POST /auth/platformAdmin/login to
 *    ensure the connection now carries an admin token.
 * 8. As platformAdmin, call the subscriptions index endpoint for the same
 *    community using a minimal valid search body
 *    (ICommunityPlatformCommunitySubscription.IRequest).
 * 9. Validate that the response is a valid
 *    IPageICommunityPlatformCommunitySubscription.ISummary, that pagination
 *    looks sane, and that at least one subscription entry corresponds to the
 *    community created in step 4. Also verify that the subscription status is a
 *    non-empty string.
 *
 * This test demonstrates correct role-based access control by showing that the
 * same endpoint behaves differently depending on whether the token belongs to a
 * member user or a platform administrator.
 */
export async function test_api_platformadmin_community_subscriptions_index_access_control(
  connection: api.IConnection,
) {
  // 1. Register a platform admin (join) and get initial auth token
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminUsername: string = RandomGenerator.alphabets(12);
  const adminJoinBody = {
    username: adminUsername,
    email: adminEmail,
    password: "AdminPassword!234",
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.console.example.com/register",
    referrer: "https://landing.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorizedFromJoin = await api.functional.auth.platformAdmin.join(
    connection,
    {
      body: adminJoinBody,
    },
  );
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(
    adminAuthorizedFromJoin,
  );

  // 2. As platformAdmin, create a visibility level
  const visibilityCode: string = `v-${RandomGenerator.alphabets(8)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Visibility",
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunityVisibilityLevel>(visibilityLevel);

  // 3. Register member user (join) and get member auth token
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername: string = RandomGenerator.alphabets(12);
  const memberJoinBody = {
    username: memberUsername,
    email: memberEmail,
    password: "MemberPassword!234",
    ip: "127.0.0.1",
    href: "https://community.example.com/register",
    referrer: "https://referrer.example.com/",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorizedFromJoin = await api.functional.auth.memberUser.join(
    connection,
    {
      body: memberJoinBody,
    },
  );
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(
    memberAuthorizedFromJoin,
  );

  // 4. As member user, create a community using the created visibility code
  const communityCreateBody = {
    identifier: `comm-${RandomGenerator.alphaNumeric(10)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunity>(community);

  // 5. As member user, create a subscription for that community
  const subscriptionCreateBody = {
    community_id: community.id,
    status: "active",
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const subscription =
    await api.functional.communityPlatform.memberUser.communities.subscriptions.create(
      connection,
      {
        communityId: community.id,
        body: subscriptionCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunitySubscription>(subscription);

  // Minimal valid request body for admin index search
  const searchRequestBody = {
    page: 1 as number,
    pageSize: 10 as number,
    communityId: community.id,
  } satisfies ICommunityPlatformCommunitySubscription.IRequest;

  // 6. Attempt to call admin subscriptions index with member token -> expect error
  await TestValidator.error(
    "member user cannot access admin community subscriptions index",
    async () => {
      await api.functional.communityPlatform.platformAdmin.communities.subscriptions.index(
        connection,
        {
          communityId: community.id,
          body: searchRequestBody,
        },
      );
    },
  );

  // 7. Switch auth back to platformAdmin using login (ensure admin token is active)
  const adminLoginBody = {
    identifier: adminEmail,
    password: "AdminPassword!234",
    ip: "127.0.0.1",
    href: "https://admin.console.example.com/login",
    referrer: "https://landing.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const adminAuthorizedFromLogin =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(
    adminAuthorizedFromLogin,
  );

  // 8. Call admin subscriptions index with platformAdmin token -> expect success
  const adminIndexResult =
    await api.functional.communityPlatform.platformAdmin.communities.subscriptions.index(
      connection,
      {
        communityId: community.id,
        body: searchRequestBody,
      },
    );
  typia.assert<IPageICommunityPlatformCommunitySubscription.ISummary>(
    adminIndexResult,
  );

  // 9. Validate pagination structure and data presence
  const pagination = adminIndexResult.pagination;
  TestValidator.equals(
    "current page should be 1",
    1 as number,
    pagination.current,
  );
  TestValidator.equals(
    "limit should match requested pageSize",
    searchRequestBody.pageSize,
    pagination.limit,
  );
  TestValidator.predicate(
    "records should be at least 1",
    pagination.records >= 1,
  );

  // At least one subscription in data must belong to our created community
  const matchingSubscriptions = adminIndexResult.data.filter(
    (row) => row.community.id === community.id,
  );

  TestValidator.predicate(
    "admin index should include the member-created subscription for the community",
    matchingSubscriptions.length >= 1,
  );

  if (matchingSubscriptions.length > 0) {
    const firstMatch = matchingSubscriptions[0];
    TestValidator.predicate(
      "subscription status should be a non-empty string",
      typeof firstMatch.status === "string" && firstMatch.status.length > 0,
    );
  }
}
