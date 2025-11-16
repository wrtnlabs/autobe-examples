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
 * Happy-path test: member user unsubscribes from a community.
 *
 * End-to-end workflow:
 *
 * 1. Create a platform admin (join) to be able to create visibility levels.
 * 2. (Optionally) login as platform admin again to simulate usual auth flow.
 * 3. As platform admin, create a community visibility level.
 * 4. Create a member user (join) and obtain their id and tokens.
 * 5. (Optionally) login as the same member user.
 * 6. As that member user, create a community referencing the created visibility
 *    level.
 * 7. As that member user, create a subscription to the created community.
 * 8. As that member user, DELETE the subscription by its id.
 * 9. List the member user subscriptions and assert the deleted id is no longer
 *    present.
 */
export async function test_api_member_subscription_delete_happy_path(
  connection: api.IConnection,
) {
  // 1. Platform admin join
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: undefined,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuth: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuth);

  // 2. Explicit platform admin login (optional, but keeps flow realistic)
  const platformAdminLoginBody = {
    identifier: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: null,
    href: platformAdminJoinBody.href,
    referrer: platformAdminJoinBody.referrer,
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLoginAuth: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoginAuth);

  // 3. Create a visibility level as platform admin
  const visibilityCode: string = `vis_${RandomGenerator.alphabets(8)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: `Visibility ${RandomGenerator.alphabets(5)}`,
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
    "created visibility level code should match request",
    visibilityLevel.code,
    visibilityCreateBody.code,
  );

  // 4. Member user join
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuth: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuth);

  const memberId: string & tags.Format<"uuid"> = memberAuth.id;

  // 5. Explicit member user login (optional) using identifier (email)
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: null,
    href: memberJoinBody.href,
    referrer: memberJoinBody.referrer,
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoginAuth: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginAuth);
  TestValidator.equals(
    "member id should be consistent between join and login",
    memberLoginAuth.id,
    memberAuth.id,
  );

  // 6. Create a community as the member user, referencing the visibility level
  const communityCreateBody = {
    identifier: `comm-${RandomGenerator.alphabets(6)}`,
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
  TestValidator.equals(
    "community visibility level code should match created visibility level",
    community.visibilityLevel.code,
    visibilityLevel.code,
  );

  // 7. Create a subscription to that community as the member user
  const subscriptionCreateBody = {
    community_id: community.id,
    status: "active",
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const subscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.subscriptions.create(
      connection,
      {
        body: subscriptionCreateBody,
      },
    );
  typia.assert(subscription);
  TestValidator.equals(
    "subscription should be created for the expected community",
    subscription.community_id,
    community.id,
  );
  TestValidator.equals(
    "subscription member user id should match authenticated member",
    subscription.member_user_id,
    memberId,
  );

  const deletedSubscriptionId: string & tags.Format<"uuid"> = subscription.id;

  // 8. Delete the subscription via DELETE endpoint
  await api.functional.communityPlatform.memberUser.subscriptions.erase(
    connection,
    {
      subscriptionId: deletedSubscriptionId,
    },
  );

  // 9. List subscriptions for the member user and verify the deleted one is absent
  const listRequestBody = {
    page: 1 as number & tags.Type<"int32">,
    pageSize: 20 as number & tags.Type<"int32">,
    sortBy: undefined,
    sortDirection: undefined,
    memberUserId: undefined,
    communityId: undefined,
    status: undefined,
    createdFrom: undefined,
    createdTo: undefined,
    updatedFrom: undefined,
    updatedTo: undefined,
  } satisfies ICommunityPlatformCommunitySubscription.IRequest;

  const page: IPageICommunityPlatformCommunitySubscription.ISummary =
    await api.functional.communityPlatform.memberUser.memberUsers.subscriptions.index(
      connection,
      {
        memberUserId: memberId,
        body: listRequestBody,
      },
    );
  typia.assert(page);

  const existsAfterDelete: boolean = page.data.some(
    (item) => item.id === deletedSubscriptionId,
  );

  TestValidator.predicate(
    "deleted subscription id must not appear in member's subscription list",
    !existsAfterDelete,
  );
}
