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
 * Verify that a platform administrator can list community subscriptions for a
 * specific community using the PATCH
 * /communityPlatform/platformAdmin/communities/{communityId}/subscriptions
 * endpoint, and that search filters (especially status and communityId)
 * correctly constrain and change the result set.
 *
 * Business flow:
 *
 * 1. Register a platform admin and let the SDK set the Authorization header.
 * 2. As the platform admin, create a community visibility level that will be used
 *    when creating a community.
 * 3. Register two member users (member A and member B).
 * 4. Log in as member A and create a community X using the created visibility
 *    level.
 * 5. As member A, subscribe to community X, creating subscription S1 with status
 *    "active".
 * 6. Log in as member B and subscribe to community X, creating subscription S2
 *    with status "pending".
 * 7. Log back in as platform admin.
 * 8. Call the admin subscriptions index endpoint filtered by status "active" and
 *    communityId = community X, and verify that only S1-like subscriptions are
 *    returned.
 * 9. Call the same endpoint filtered by status "pending" and communityId =
 *    community X, and verify that only S2-like subscriptions are returned and
 *    that the set of subscription ids differs from the first call.
 * 10. Optionally, call without a status filter but with communityId to verify that
 *     both subscriptions can appear and that pagination metadata reflects at
 *     least two records.
 */
export async function test_api_platformadmin_community_subscriptions_index_with_filters(
  connection: api.IConnection,
) {
  // 1. Register platform admin (auto-authenticated)
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string = RandomGenerator.alphaNumeric(12);

  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: adminEmail,
    password: adminPassword,
    displayName: RandomGenerator.name(2),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a community visibility level as platform admin
  const visibilityCode = `vis-${RandomGenerator.alphaNumeric(8)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityCreateBody },
    );
  typia.assert(visibilityLevel);

  // 3. Register member A and member B
  const memberAPassword: string = RandomGenerator.alphaNumeric(10);
  const memberAEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberAJoinBody = {
    username: RandomGenerator.name(1),
    email: memberAEmail,
    password: memberAPassword,
    href: "https://app.example.com/signup",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberAJoinBody,
    });
  typia.assert(memberAAuthorized);

  const memberBPassword: string = RandomGenerator.alphaNumeric(10);
  const memberBEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberBJoinBody = {
    username: RandomGenerator.name(1),
    email: memberBEmail,
    password: memberBPassword,
    href: "https://app.example.com/signup",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberBAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberBJoinBody,
    });
  typia.assert(memberBAuthorized);

  // 4. Log in as member A
  const memberALoginBody = {
    identifier: memberAEmail,
    password: memberAPassword,
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberALogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberALoginBody,
    });
  typia.assert(memberALogin);

  // 5. As member A, create community X
  const communityCreateBody = {
    identifier: `comm-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  // 6. Member A subscribes to community X with status "active" (S1)
  const statusS1 = "active";
  const subscriptionS1CreateBody = {
    community_id: community.id,
    status: statusS1,
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const subscriptionS1: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.communities.subscriptions.create(
      connection,
      {
        communityId: community.id,
        body: subscriptionS1CreateBody,
      },
    );
  typia.assert(subscriptionS1);

  // 7. Log in as member B
  const memberBLoginBody = {
    identifier: memberBEmail,
    password: memberBPassword,
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberBLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberBLoginBody,
    });
  typia.assert(memberBLogin);

  // 8. Member B subscribes to community X with status "pending" (S2)
  const statusS2 = "pending";
  const subscriptionS2CreateBody = {
    community_id: community.id,
    status: statusS2,
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const subscriptionS2: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.communities.subscriptions.create(
      connection,
      {
        communityId: community.id,
        body: subscriptionS2CreateBody,
      },
    );
  typia.assert(subscriptionS2);

  // 9. Log back in as platform admin
  const adminLoginBody = {
    identifier: adminEmail,
    password: adminPassword,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const adminLogin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // Helper to extract subscription ids from a page
  const collectIds = (
    page: IPageICommunityPlatformCommunitySubscription.ISummary,
  ): string[] => page.data.map((s) => s.id);

  // 10. Admin index filtered by status S1 and communityId
  const pageSize = 10 as number & tags.Type<"int32">;
  const page1Request = {
    page: 1 as number & tags.Type<"int32">,
    pageSize,
    sortBy: "created_at",
    sortDirection: "desc",
    communityId: community.id,
    status: statusS1,
  } satisfies ICommunityPlatformCommunitySubscription.IRequest;

  const pageS1: IPageICommunityPlatformCommunitySubscription.ISummary =
    await api.functional.communityPlatform.platformAdmin.communities.subscriptions.index(
      connection,
      {
        communityId: community.id,
        body: page1Request,
      },
    );
  typia.assert(pageS1);

  TestValidator.predicate(
    "filtered by statusS1 should have at least one record",
    pageS1.pagination.records >= 1,
  );

  // Verify all results are for the target community and status S1
  for (const item of pageS1.data) {
    TestValidator.equals(
      "community id in S1 page must match community.id",
      item.community.id,
      community.id,
    );
    TestValidator.equals(
      "status in S1 page must be statusS1",
      item.status,
      statusS1,
    );
  }

  const idsS1 = collectIds(pageS1);
  TestValidator.predicate(
    "S1 subscription id should be included in S1 page",
    idsS1.includes(subscriptionS1.id),
  );

  // 11. Admin index filtered by status S2 and same communityId
  const page2Request = {
    page: 1 as number & tags.Type<"int32">,
    pageSize,
    sortBy: "created_at",
    sortDirection: "desc",
    communityId: community.id,
    status: statusS2,
  } satisfies ICommunityPlatformCommunitySubscription.IRequest;

  const pageS2: IPageICommunityPlatformCommunitySubscription.ISummary =
    await api.functional.communityPlatform.platformAdmin.communities.subscriptions.index(
      connection,
      {
        communityId: community.id,
        body: page2Request,
      },
    );
  typia.assert(pageS2);

  TestValidator.predicate(
    "filtered by statusS2 should have at least one record",
    pageS2.pagination.records >= 1,
  );

  for (const item of pageS2.data) {
    TestValidator.equals(
      "community id in S2 page must match community.id",
      item.community.id,
      community.id,
    );
    TestValidator.equals(
      "status in S2 page must be statusS2",
      item.status,
      statusS2,
    );
  }

  const idsS2 = collectIds(pageS2);
  TestValidator.predicate(
    "S2 subscription id should be included in S2 page",
    idsS2.includes(subscriptionS2.id),
  );

  // Ensure that S1 and S2 filtered result sets differ in ids at least in the S1/S2 pair
  TestValidator.predicate(
    "S1 id should not be present in S2 page",
    !idsS2.includes(subscriptionS1.id),
  );
  TestValidator.predicate(
    "S2 id should not be present in S1 page",
    !idsS1.includes(subscriptionS2.id),
  );

  // 12. Optional: unfiltered by status but filtered by communityId
  const pageAllRequest = {
    page: 1 as number & tags.Type<"int32">,
    pageSize,
    sortBy: "created_at",
    sortDirection: "desc",
    communityId: community.id,
  } satisfies ICommunityPlatformCommunitySubscription.IRequest;

  const pageAll: IPageICommunityPlatformCommunitySubscription.ISummary =
    await api.functional.communityPlatform.platformAdmin.communities.subscriptions.index(
      connection,
      {
        communityId: community.id,
        body: pageAllRequest,
      },
    );
  typia.assert(pageAll);

  TestValidator.predicate(
    "unfiltered-by-status list should have at least two records",
    pageAll.pagination.records >= 2,
  );

  const idsAll = collectIds(pageAll);
  TestValidator.predicate(
    "unfiltered page should include S1",
    idsAll.includes(subscriptionS1.id),
  );
  TestValidator.predicate(
    "unfiltered page should include S2",
    idsAll.includes(subscriptionS2.id),
  );
}
