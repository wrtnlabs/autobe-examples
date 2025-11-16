import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationQueue";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationQueue";

export async function test_api_moderation_queues_index_for_platform_admin_pagination_boundaries(
  connection: api.IConnection,
) {
  // 1. Register platform admin (also authenticates and sets Authorization header internally)
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd-Admin",
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Create a community visibility level so member user can create a community
  const visibilityCode = `public-${RandomGenerator.alphabets(8)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Visibility",
    description: "Visibility level for public test communities",
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

  // 3. Register member user (also authenticates as member user)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd-Member",
    ip: "127.0.0.1",
    href: "https://app.example.com/join",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4. As member user, create a community using the visibility level code
  const communityIdentifier = `test-community-${RandomGenerator.alphabets(6)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: "Test Moderation Queue Community",
    description: RandomGenerator.paragraph({ sentences: 5 }),
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
  TestValidator.equals(
    "created community identifier matches request",
    community.identifier,
    communityIdentifier,
  );

  // 5. Switch back to platform admin account via login (to demonstrate actor switching explicitly)
  const platformAdminLoginBody = {
    identifier: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLoginResult: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoginResult);

  // 6. As platform admin, create a membership for the member user in the community
  const membershipCreateBody = {
    memberuser_id: memberAuthorized.id,
    is_active: true,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.platformAdmin.communities.memberships.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: membershipCreateBody,
      },
    );
  typia.assert(membership);
  TestValidator.equals(
    "membership community id matches created community",
    membership.community.id,
    community.id,
  );
  TestValidator.equals(
    "membership member user id matches joined member",
    membership.memberuser.id,
    memberAuthorized.id,
  );

  // 7. As platform admin, create many moderation queues (mix of global and community-scoped)
  const totalQueuesToCreate = 15;
  const queueType = "community_default";
  const queueStatus = "active";

  const createdQueues: ICommunityPlatformModerationQueue[] = [];

  for (let i = 0; i < totalQueuesToCreate; i++) {
    const isCommunityScoped = i % 2 === 0;
    const queueCreateBody = {
      community_id: isCommunityScoped ? community.id : null,
      name: `Queue-${i + 1}-${RandomGenerator.alphabets(4)}`,
      queue_type: queueType,
      status: queueStatus,
      description: RandomGenerator.paragraph({ sentences: 3 }),
    } satisfies ICommunityPlatformModerationQueue.ICreate;

    const queue: ICommunityPlatformModerationQueue =
      await api.functional.communityPlatform.platformAdmin.moderationQueues.create(
        connection,
        {
          body: queueCreateBody,
        },
      );
    typia.assert(queue);
    createdQueues.push(queue);
  }

  TestValidator.equals(
    "number of created queues should equal configured total",
    createdQueues.length,
    totalQueuesToCreate,
  );

  // 8. First page listing with small pageSize (no community_id filter so both global and community queues are included)
  const pageSize = 5;
  const firstPageRequest = {
    page: 1,
    pageSize,
    queue_type: queueType,
    status: queueStatus,
    search: null,
    order_by: null,
    order_direction: null,
  } satisfies ICommunityPlatformModerationQueue.IRequest;

  const firstPage: IPageICommunityPlatformModerationQueue.ISummary =
    await api.functional.communityPlatform.platformAdmin.moderationQueues.index(
      connection,
      {
        body: firstPageRequest,
      },
    );
  typia.assert(firstPage);

  const paginationFirst = firstPage.pagination;
  TestValidator.predicate(
    "first page current should be >= 1",
    paginationFirst.current >= 1,
  );
  TestValidator.predicate(
    "first page limit should be > 0",
    paginationFirst.limit > 0,
  );
  TestValidator.predicate(
    "first page pages should be >= 1 when records > 0",
    paginationFirst.records === 0
      ? paginationFirst.pages === 0
      : paginationFirst.pages >= 1,
  );
  TestValidator.predicate(
    "first page records should be >= number of created queues (filtering by status/type)",
    paginationFirst.records >= createdQueues.length,
  );
  TestValidator.predicate(
    "first page data.length should be > 0 and <= limit",
    firstPage.data.length > 0 && firstPage.data.length <= paginationFirst.limit,
  );
  TestValidator.equals(
    "pages field equals ceil(records / limit) when limit > 0",
    paginationFirst.pages,
    paginationFirst.limit > 0
      ? Math.ceil(paginationFirst.records / paginationFirst.limit)
      : 0,
  );

  // 9. Last page listing
  const lastPageNumber = paginationFirst.pages;
  TestValidator.predicate(
    "last page number should be >= 1 when records > 0",
    paginationFirst.records === 0 ? lastPageNumber === 0 : lastPageNumber >= 1,
  );

  if (paginationFirst.records > 0 && lastPageNumber >= 1) {
    const lastPageRequest = {
      page: lastPageNumber,
      pageSize,
      queue_type: queueType,
      status: queueStatus,
      search: null,
      order_by: null,
      order_direction: null,
    } satisfies ICommunityPlatformModerationQueue.IRequest;

    const lastPage: IPageICommunityPlatformModerationQueue.ISummary =
      await api.functional.communityPlatform.platformAdmin.moderationQueues.index(
        connection,
        {
          body: lastPageRequest,
        },
      );
    typia.assert(lastPage);

    const paginationLast = lastPage.pagination;
    TestValidator.equals(
      "last page current should equal requested last page when within range",
      paginationLast.current,
      lastPageNumber,
    );
    TestValidator.predicate(
      "last page data length should be > 0 and <= limit",
      lastPage.data.length > 0 && lastPage.data.length <= paginationLast.limit,
    );
  }

  // 10. Out-of-range page behavior
  const outOfRangePage = paginationFirst.pages + 1;
  const outOfRangeRequest = {
    page: outOfRangePage,
    pageSize,
    queue_type: queueType,
    status: queueStatus,
    search: null,
    order_by: null,
    order_direction: null,
  } satisfies ICommunityPlatformModerationQueue.IRequest;

  const outOfRange: IPageICommunityPlatformModerationQueue.ISummary =
    await api.functional.communityPlatform.platformAdmin.moderationQueues.index(
      connection,
      {
        body: outOfRangeRequest,
      },
    );
  typia.assert(outOfRange);

  const paginationOut = outOfRange.pagination;

  // Two acceptable behaviors:
  // A) current == outOfRangePage and data.length == 0 (empty for out of range)
  // B) current == pages (clamped) and pages < outOfRangePage
  const behaviorA =
    paginationOut.current === outOfRangePage && outOfRange.data.length === 0;
  const behaviorB =
    paginationOut.pages < outOfRangePage &&
    paginationOut.current === paginationOut.pages;

  TestValidator.predicate(
    "out-of-range page behavior must be either empty page at requested index or clamped to last page",
    behaviorA || behaviorB,
  );

  // 11. Rebuild full set across pages and check for duplicates/missing queues
  if (paginationFirst.records > 0 && paginationFirst.pages > 0) {
    const collectedIds: string[] = [];

    for (let page = 1; page <= paginationFirst.pages; page++) {
      const pageRequest = {
        page,
        pageSize,
        queue_type: queueType,
        status: queueStatus,
        search: null,
        order_by: null,
        order_direction: null,
      } satisfies ICommunityPlatformModerationQueue.IRequest;

      const pageResult: IPageICommunityPlatformModerationQueue.ISummary =
        await api.functional.communityPlatform.platformAdmin.moderationQueues.index(
          connection,
          {
            body: pageRequest,
          },
        );
      typia.assert(pageResult);

      for (const summary of pageResult.data) {
        collectedIds.push(summary.id);
      }
    }

    const uniqueIds = Array.from(new Set(collectedIds));

    TestValidator.equals(
      "unique collected ids count should equal pagination.records",
      uniqueIds.length,
      paginationFirst.records,
    );

    // All created queue ids (both global and community-scoped) should be present in full listing
    for (const q of createdQueues) {
      TestValidator.predicate(
        `created queue ${q.id} should be present in full listing`,
        uniqueIds.includes(q.id),
      );
    }
  }
}
