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
 * Validate that memberUser-scoped subscription listing enforces per-user access
 * control.
 *
 * Business intent:
 *
 * - A member user must not be able to list another member user's subscriptions
 *   using PATCH
 *   /communityPlatform/memberUser/memberUsers/{memberUserId}/subscriptions.
 * - The same endpoint must succeed when a member user queries their own
 *   subscriptions.
 *
 * High-level steps:
 *
 * 1. As platformAdmin, create a community visibility level to allow community
 *    creation.
 * 2. Join MemberUser A (auto-auth) and capture its id.
 * 3. While authenticated as A, create a community and a subscription for A.
 * 4. Join MemberUser B (auto-auth) and capture its id.
 * 5. While authenticated as B, create its own community and subscription.
 * 6. As B, attempt to list A's subscriptions via memberUsers.subscriptions.index
 *    and assert that an error occurs (authorization failure).
 * 7. As B, list B's own subscriptions via the same endpoint and assert success and
 *    basic invariants on the returned page and data.
 */
export async function test_api_member_subscriptions_list_access_control(
  connection: api.IConnection,
) {
  // 1. Platform admin: create a visibility level for communities.
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: undefined,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  const visibilityLevelCode = `vl-${RandomGenerator.alphabets(8)}`;

  const visibilityLevelBody = {
    code: visibilityLevelCode,
    name: `Visibility ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityLevelBody },
    );
  typia.assert(visibilityLevel);

  // 2. MemberUser A join (auto-auth).
  const memberAJoinBody = {
    username: `userA_${RandomGenerator.alphabets(8)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://app.example.com/signup",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberA: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberAJoinBody,
    });
  typia.assert(memberA);

  // 3. As A, create a community and subscription.
  const communityABody = {
    identifier: `community-a-${RandomGenerator.alphabets(6)}`,
    title: `Community A ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibilityLevelCode,
    isNsfw: false,
    primaryTagIds: undefined,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const communityA: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityABody },
    );
  typia.assert(communityA);

  const subscriptionABody = {
    community_id: communityA.id,
    status: "active",
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const subscriptionA: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.subscriptions.create(
      connection,
      { body: subscriptionABody },
    );
  typia.assert(subscriptionA);

  // 4. MemberUser B join (auto-auth, overwrites Authorization to B).
  const memberBJoinBody = {
    username: `userB_${RandomGenerator.alphabets(8)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://app.example.com/signup",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberB: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberBJoinBody,
    });
  typia.assert(memberB);

  // 5. As B, create B's own community and subscription so B has data.
  const communityBBody = {
    identifier: `community-b-${RandomGenerator.alphabets(6)}`,
    title: `Community B ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 4 }),
    visibilityLevelCode,
    isNsfw: false,
    primaryTagIds: undefined,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const communityB: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityBBody },
    );
  typia.assert(communityB);

  const subscriptionBBody = {
    community_id: communityB.id,
    status: "active",
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const subscriptionB: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.subscriptions.create(
      connection,
      { body: subscriptionBBody },
    );
  typia.assert(subscriptionB);

  // 6. As B, attempt to list A's subscriptions -> must result in an error.
  const crossAccessRequestBody = {
    page: typia.random<number & tags.Type<"int32">>(),
    pageSize: typia.random<number & tags.Type<"int32">>(),
    sortBy: "created_at",
    sortDirection: "desc",
    memberUserId: undefined,
    communityId: undefined,
    status: undefined,
    createdFrom: undefined,
    createdTo: undefined,
    updatedFrom: undefined,
    updatedTo: undefined,
  } satisfies ICommunityPlatformCommunitySubscription.IRequest;

  await TestValidator.error(
    "member B cannot list member A subscriptions",
    async () => {
      await api.functional.communityPlatform.memberUser.memberUsers.subscriptions.index(
        connection,
        {
          memberUserId: memberA.id,
          body: crossAccessRequestBody,
        },
      );
    },
  );

  // 7. As B, list B's own subscriptions -> must succeed and return B's data page.
  const selfAccessRequestBody = {
    page: typia.random<number & tags.Type<"int32">>(),
    pageSize: typia.random<number & tags.Type<"int32">>(),
    sortBy: "created_at",
    sortDirection: "desc",
    memberUserId: undefined,
    communityId: undefined,
    status: "active",
    createdFrom: undefined,
    createdTo: undefined,
    updatedFrom: undefined,
    updatedTo: undefined,
  } satisfies ICommunityPlatformCommunitySubscription.IRequest;

  const selfPage: IPageICommunityPlatformCommunitySubscription.ISummary =
    await api.functional.communityPlatform.memberUser.memberUsers.subscriptions.index(
      connection,
      {
        memberUserId: memberB.id,
        body: selfAccessRequestBody,
      },
    );
  typia.assert(selfPage);

  TestValidator.predicate(
    "self subscription page should have at least one record",
    selfPage.data.length >= 1,
  );

  const anySubscription = selfPage.data[0];
  TestValidator.equals(
    "self subscription status should be active when filtered by status=active",
    anySubscription.status,
    "active",
  );
}
