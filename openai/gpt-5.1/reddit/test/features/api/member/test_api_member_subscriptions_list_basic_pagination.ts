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

export async function test_api_member_subscriptions_list_basic_pagination(
  connection: api.IConnection,
) {
  /**
   * E2E: member user lists their community subscriptions with basic pagination.
   *
   * 1. Platform admin joins and creates a community visibility level.
   * 2. Member user joins and becomes authenticated.
   * 3. Member user creates multiple communities referencing the visibility level.
   * 4. Member user subscribes to each community.
   * 5. Member user requests the first page of subscriptions with pageSize=2.
   * 6. Validate pagination metadata and returned subscription summaries.
   * 7. If enough subscriptions exist, request page 2 and ensure no duplication.
   */

  // 1) Platform admin join and visibility level creation
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPass123!",
    displayName: RandomGenerator.name(2),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized = await api.functional.auth.platformAdmin.join(
    connection,
    {
      body: platformAdminJoinBody,
    },
  );
  typia.assert(platformAdminAuthorized);

  const visibilityLevelCode = `public-${RandomGenerator.alphaNumeric(8)}`;

  const visibilityLevelBody = {
    code: visibilityLevelCode,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityLevelBody },
    );
  typia.assert(visibilityLevel);

  // 2) Member user join
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "MemberPass123!",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized = await api.functional.auth.memberUser.join(
    connection,
    {
      body: memberJoinBody,
    },
  );
  typia.assert(memberAuthorized);

  const memberUserId = memberAuthorized.id;

  // 3) Create multiple communities as the member user (3 communities)
  const communityCount = 3;
  const communities: ICommunityPlatformCommunity[] = [];

  for (let i = 0; i < communityCount; ++i) {
    const communityCreateBody = {
      identifier: `community-${RandomGenerator.alphaNumeric(8)}`,
      title: RandomGenerator.paragraph({ sentences: 3 }),
      description: RandomGenerator.paragraph({ sentences: 8 }),
      visibilityLevelCode,
      isNsfw: false,
    } satisfies ICommunityPlatformCommunity.ICreate;

    const community =
      await api.functional.communityPlatform.memberUser.communities.create(
        connection,
        { body: communityCreateBody },
      );
    typia.assert(community);
    communities.push(community);
  }

  // 4) Create subscriptions for each community
  const subscriptions: ICommunityPlatformCommunitySubscription[] = [];

  for (const community of communities) {
    const subscriptionCreateBody = {
      community_id: community.id,
      status: "active",
    } satisfies ICommunityPlatformCommunitySubscription.ICreate;

    const subscription =
      await api.functional.communityPlatform.memberUser.subscriptions.create(
        connection,
        { body: subscriptionCreateBody },
      );
    typia.assert(subscription);
    subscriptions.push(subscription);
  }

  TestValidator.equals(
    "created subscriptions should equal created communities",
    subscriptions.length,
    communities.length,
  );

  const totalSubscriptions = subscriptions.length;

  // Pre-compute community id set for validation later
  const communityIdSet = new Set<string>(communities.map((c) => c.id));

  // 5) Request first page of subscriptions for the member user
  const pageSize = 2;

  const page1RequestBody = {
    page: 1,
    pageSize,
    sortBy: "created_at",
    sortDirection: "desc",
    memberUserId,
  } satisfies ICommunityPlatformCommunitySubscription.IRequest;

  const page1 =
    await api.functional.communityPlatform.memberUser.memberUsers.subscriptions.index(
      connection,
      {
        memberUserId,
        body: page1RequestBody,
      },
    );
  typia.assert<IPageICommunityPlatformCommunitySubscription.ISummary>(page1);

  // 6) Assertions for page 1 pagination metadata
  TestValidator.equals(
    "page 1 current page should be 1",
    page1.pagination.current,
    1,
  );

  TestValidator.equals(
    "page 1 limit should equal requested pageSize",
    page1.pagination.limit,
    pageSize,
  );

  TestValidator.predicate(
    "total records should be at least number of created subscriptions",
    () => page1.pagination.records >= totalSubscriptions,
  );

  TestValidator.predicate(
    "pages should equal ceil(records / limit) when limit > 0",
    () => {
      const limit = page1.pagination.limit;
      const records = page1.pagination.records;
      const expectedPages = limit === 0 ? 0 : Math.ceil(records / limit);
      return page1.pagination.pages === expectedPages;
    },
  );

  // Data array size checks
  TestValidator.predicate(
    "page 1 contains at most pageSize items",
    () => page1.data.length <= pageSize,
  );

  TestValidator.predicate(
    "page 1 contains at least 1 item when subscriptions exist",
    () => totalSubscriptions === 0 || page1.data.length > 0,
  );

  // Validate each subscription summary on page 1
  for (const item of page1.data) {
    typia.assert<ICommunityPlatformCommunitySubscription.ISummary>(item);

    TestValidator.predicate(
      "subscription summary id should be non-empty",
      () => item.id.length > 0,
    );

    TestValidator.predicate(
      "subscription status should be non-empty",
      () => item.status.length > 0,
    );

    TestValidator.predicate(
      "subscription community id should be one of created communities",
      () => communityIdSet.has(item.community.id),
    );
  }

  // 7) Optional: request second page when there are more than pageSize subscriptions
  if (totalSubscriptions > pageSize) {
    const page2RequestBody = {
      page: 2,
      pageSize,
      sortBy: "created_at",
      sortDirection: "desc",
      memberUserId,
    } satisfies ICommunityPlatformCommunitySubscription.IRequest;

    const page2 =
      await api.functional.communityPlatform.memberUser.memberUsers.subscriptions.index(
        connection,
        {
          memberUserId,
          body: page2RequestBody,
        },
      );
    typia.assert<IPageICommunityPlatformCommunitySubscription.ISummary>(page2);

    TestValidator.equals(
      "page 2 current page should be 2",
      page2.pagination.current,
      2,
    );

    TestValidator.equals(
      "page 2 limit should equal requested pageSize",
      page2.pagination.limit,
      pageSize,
    );

    TestValidator.equals(
      "page 2 records should equal page 1 records",
      page2.pagination.records,
      page1.pagination.records,
    );

    TestValidator.equals(
      "page 2 pages should equal page 1 pages",
      page2.pagination.pages,
      page1.pagination.pages,
    );

    TestValidator.predicate(
      "page 2 contains at most pageSize items",
      () => page2.data.length <= pageSize,
    );

    // Ensure no duplicate subscription ids between page1 and page2
    const page1Ids = new Set<string>(page1.data.map((d) => d.id));
    const hasOverlap = page2.data.some((d) => page1Ids.has(d.id));

    TestValidator.predicate(
      "page 1 and page 2 should have no overlapping subscription ids",
      () => !hasOverlap,
    );

    for (const item of page2.data) {
      typia.assert<ICommunityPlatformCommunitySubscription.ISummary>(item);

      TestValidator.predicate(
        "page 2 subscription id should be non-empty",
        () => item.id.length > 0,
      );

      TestValidator.predicate(
        "page 2 subscription community id should be one of created communities",
        () => communityIdSet.has(item.community.id),
      );
    }
  }
}
