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

export async function test_api_member_subscriptions_list_with_filters(
  connection: api.IConnection,
) {
  // 1. Prepare admin and visibility level so communities can be created
  const platformAdminJoin = await api.functional.auth.platformAdmin.join(
    connection,
    {
      body: {
        username: RandomGenerator.name(1),
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        displayName: RandomGenerator.name(2),
        ip: undefined,
        href: "https://admin.example.com/join",
        referrer: "https://admin.example.com/landing",
      } satisfies ICommunityPlatformPlatformadmin.IJoin,
    },
  );
  typia.assert(platformAdminJoin);

  const visibilityPublic =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: {
          code: `public-${RandomGenerator.alphaNumeric(6)}`,
          name: "Public",
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate,
      },
    );
  typia.assert(visibilityPublic);

  // 2. Register a member user and keep their id
  const memberJoin = await api.functional.auth.memberUser.join(connection, {
    body: {
      username: RandomGenerator.name(1),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(10),
      ip: undefined,
      href: "https://app.example.com/join",
      referrer: "https://app.example.com/landing",
    } satisfies ICommunityPlatformMemberuser.IJoinRequest,
  });
  typia.assert(memberJoin);

  const memberUserId = memberJoin.id;

  // 3. As memberUser, create several communities
  // (memberJoin already authenticated the connection as memberUser)
  const communities: ICommunityPlatformCommunity[] = [];
  for (let i = 0; i < 4; i++) {
    const community =
      await api.functional.communityPlatform.memberUser.communities.create(
        connection,
        {
          body: {
            identifier: `community-${RandomGenerator.alphaNumeric(8)}`,
            title: RandomGenerator.paragraph({ sentences: 2 }),
            description: RandomGenerator.paragraph({ sentences: 5 }),
            visibilityLevelCode: visibilityPublic.code,
            isNsfw: i % 2 === 0,
            primaryTagIds: undefined,
          } satisfies ICommunityPlatformCommunity.ICreate,
        },
      );
    typia.assert(community);
    communities.push(community);
  }

  // 4. Create subscriptions in two time groups with different statuses
  const earlySubscriptions: ICommunityPlatformCommunitySubscription[] = [];
  const lateSubscriptions: ICommunityPlatformCommunitySubscription[] = [];

  // early group - status "pending"
  for (let i = 0; i < 2; i++) {
    const sub =
      await api.functional.communityPlatform.memberUser.subscriptions.create(
        connection,
        {
          body: {
            community_id: communities[i].id,
            status: "pending",
          } satisfies ICommunityPlatformCommunitySubscription.ICreate,
        },
      );
    typia.assert(sub);
    earlySubscriptions.push(sub);
  }

  // Gap between early and late groups to make date ranges distinct
  const gapMillis = 2_000;
  await new Promise((resolve) => setTimeout(resolve, gapMillis));

  // late group - status "active"
  for (let i = 2; i < 4; i++) {
    const sub =
      await api.functional.communityPlatform.memberUser.subscriptions.create(
        connection,
        {
          body: {
            community_id: communities[i].id,
            status: "active",
          } satisfies ICommunityPlatformCommunitySubscription.ICreate,
        },
      );
    typia.assert(sub);
    lateSubscriptions.push(sub);
  }

  // Capture approximate time boundaries using created_at from persisted records
  const lateCreatedAtValues = lateSubscriptions.map((s) => s.created_at);
  const earlyCreatedAtValues = earlySubscriptions.map((s) => s.created_at);

  // Sort timestamps to determine min/max where needed
  const sortedLate = [...lateCreatedAtValues].sort();
  const sortedEarly = [...earlyCreatedAtValues].sort();
  void sortedEarly; // reserved for potential future extensions

  const lateFrom = sortedLate[0];
  const lateTo = sortedLate[sortedLate.length - 1];

  // 5. Call index with filters for status="active" and late created range
  const requestPageSize: number & tags.Type<"int32"> = 20 as number &
    tags.Type<"int32">;

  const filteredRequest = {
    page: 1 as number & tags.Type<"int32">,
    pageSize: requestPageSize,
    sortBy: "created_at",
    sortDirection: "asc",
    memberUserId: memberUserId,
    communityId: undefined,
    status: "active",
    createdFrom: lateFrom,
    createdTo: lateTo,
    updatedFrom: undefined,
    updatedTo: undefined,
  } satisfies ICommunityPlatformCommunitySubscription.IRequest;

  const filteredPage =
    await api.functional.communityPlatform.memberUser.memberUsers.subscriptions.index(
      connection,
      {
        memberUserId: memberUserId,
        body: filteredRequest,
      },
    );
  typia.assert<IPageICommunityPlatformCommunitySubscription.ISummary>(
    filteredPage,
  );

  // 6. Validate that all results match filters
  const filteredData = filteredPage.data;

  for (const item of filteredData) {
    // Status matches filter
    TestValidator.equals(
      "subscription status matches active filter",
      item.status,
      "active",
    );

    // created_at within [lateFrom, lateTo]
    TestValidator.predicate(
      "subscription created_at within filtered range",
      item.created_at >= lateFrom && item.created_at <= lateTo,
    );
  }

  // Business-level assertion on count and pagination
  TestValidator.equals(
    "filtered data length equals lateSubscriptions count",
    filteredData.length,
    lateSubscriptions.length,
  );

  const pagination = filteredPage.pagination;
  TestValidator.equals(
    "pagination.records equals data length when pageSize is large",
    filteredData.length,
    pagination.records,
  );
  TestValidator.equals(
    "pagination.pages is 1 when all records fit into one page",
    filteredData.length === 0 ? 0 : 1,
    pagination.pages,
  );
  TestValidator.equals(
    "pagination.current equals requested page",
    1,
    pagination.current,
  );

  // 7. Second call with future date window where no subscriptions exist
  const afterAllCreated = new Date(
    new Date(sortedLate[sortedLate.length - 1]).getTime() + 60_000,
  ).toISOString();

  const emptyFilterRequest = {
    page: 1 as number & tags.Type<"int32">,
    pageSize: requestPageSize,
    sortBy: "created_at",
    sortDirection: "asc",
    memberUserId: memberUserId,
    communityId: undefined,
    status: "active",
    createdFrom: afterAllCreated,
    createdTo: afterAllCreated,
    updatedFrom: undefined,
    updatedTo: undefined,
  } satisfies ICommunityPlatformCommunitySubscription.IRequest;

  const emptyPage =
    await api.functional.communityPlatform.memberUser.memberUsers.subscriptions.index(
      connection,
      {
        memberUserId: memberUserId,
        body: emptyFilterRequest,
      },
    );
  typia.assert<IPageICommunityPlatformCommunitySubscription.ISummary>(
    emptyPage,
  );

  TestValidator.equals(
    "empty filter returns zero data",
    emptyPage.data.length,
    0,
  );
  TestValidator.equals(
    "empty filter pagination.records is 0",
    0,
    emptyPage.pagination.records,
  );
  TestValidator.equals(
    "empty filter pagination.pages is 0",
    0,
    emptyPage.pagination.pages,
  );
}
