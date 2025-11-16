import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformGuestuserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuserSession";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformGuestuserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformGuestuserSession";

export async function test_api_platform_admin_list_guest_sessions_pagination_and_sorting(
  connection: api.IConnection,
) {
  // 1. Platform admin registration & authentication
  const adminJoinBody = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create at least one account status
  const accountStatusBody = {
    key: `ACTIVE_${RandomGenerator.alphaNumeric(8)}`,
    label: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    isLoginAllowed: true,
    isPostingAllowed: true,
    isVotingAllowed: true,
    requiresManualReview: false,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  const createdStatus: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      {
        body: accountStatusBody,
      },
    );
  typia.assert(createdStatus);

  // 3. Prepare random guestUserId and initial pagination request
  const guestUserId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const requestAscPage1 = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    sort_by: "created_at",
    sort_direction: "asc",
  } satisfies ICommunityPlatformGuestuserSession.IRequest;

  const page1: IPageICommunityPlatformGuestuserSession.ISummary =
    await api.functional.communityPlatform.platformAdmin.guestUsers.sessions.index(
      connection,
      {
        guestUserId,
        body: requestAscPage1,
      },
    );
  typia.assert(page1);

  const pagination1: IPage.IPagination = page1.pagination;

  // 4. Validate page1 pagination metadata and ascending ordering
  TestValidator.equals(
    "page1 limit should be 10",
    pagination1.limit,
    10 as number,
  );
  TestValidator.equals(
    "page1 current page should be 1",
    pagination1.current,
    1 as number,
  );

  TestValidator.predicate(
    "page1 records should be >= data length and non-negative",
    pagination1.records >= page1.data.length && pagination1.records >= 0,
  );

  if (pagination1.limit > 0 && pagination1.records > 0) {
    const expectedPages = Math.ceil(pagination1.records / pagination1.limit);
    TestValidator.equals(
      "page1 pages should match ceil(records/limit)",
      pagination1.pages,
      expectedPages,
    );
  }

  TestValidator.predicate(
    "page1 data length must be between 0 and limit",
    page1.data.length >= 0 && page1.data.length <= 10,
  );

  // verify ascending sort by created_at
  for (let i = 1; i < page1.data.length; i++) {
    const prev = page1.data[i - 1];
    const curr = page1.data[i];
    TestValidator.predicate(
      `page1 ascending order at index ${i}`,
      prev.created_at <= curr.created_at,
    );
  }

  // 5. Request second page with same ascending sort
  const requestAscPage2 = {
    page: 2 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    sort_by: "created_at",
    sort_direction: "asc",
  } satisfies ICommunityPlatformGuestuserSession.IRequest;

  const page2: IPageICommunityPlatformGuestuserSession.ISummary =
    await api.functional.communityPlatform.platformAdmin.guestUsers.sessions.index(
      connection,
      {
        guestUserId,
        body: requestAscPage2,
      },
    );
  typia.assert(page2);

  const pagination2: IPage.IPagination = page2.pagination;

  TestValidator.equals(
    "page2 limit should be 10",
    pagination2.limit,
    10 as number,
  );
  TestValidator.equals(
    "page2 current page should be 2",
    pagination2.current,
    2 as number,
  );

  TestValidator.equals(
    "records count should be consistent between page1 and page2",
    pagination2.records,
    pagination1.records,
  );
  TestValidator.equals(
    "pages count should be consistent between page1 and page2",
    pagination2.pages,
    pagination1.pages,
  );

  TestValidator.predicate(
    "page2 data length must be between 0 and limit",
    page2.data.length >= 0 && page2.data.length <= 10,
  );

  for (let i = 1; i < page2.data.length; i++) {
    const prev = page2.data[i - 1];
    const curr = page2.data[i];
    TestValidator.predicate(
      `page2 ascending order at index ${i}`,
      prev.created_at <= curr.created_at,
    );
  }

  // Ensure no duplicate session IDs between page1 and page2 when both have data
  if (page1.data.length > 0 && page2.data.length > 0) {
    const ids: string[] = [
      ...page1.data.map((s) => s.id),
      ...page2.data.map((s) => s.id),
    ];
    const uniqueIds = new Set(ids);
    TestValidator.equals(
      "combined ids of page1 and page2 should be unique",
      ids.length,
      uniqueIds.size,
    );
  }

  // 6. Request descending sort and validate ordering
  const requestDescPage1 = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    sort_by: "created_at",
    sort_direction: "desc",
  } satisfies ICommunityPlatformGuestuserSession.IRequest;

  const descPage1: IPageICommunityPlatformGuestuserSession.ISummary =
    await api.functional.communityPlatform.platformAdmin.guestUsers.sessions.index(
      connection,
      {
        guestUserId,
        body: requestDescPage1,
      },
    );
  typia.assert(descPage1);

  const descPagination1: IPage.IPagination = descPage1.pagination;

  TestValidator.equals(
    "desc page1 limit should be 10",
    descPagination1.limit,
    10 as number,
  );
  TestValidator.equals(
    "desc page1 current page should be 1",
    descPagination1.current,
    1 as number,
  );

  TestValidator.equals(
    "records count should be consistent between asc and desc page1",
    descPagination1.records,
    pagination1.records,
  );
  TestValidator.equals(
    "pages count should be consistent between asc and desc page1",
    descPagination1.pages,
    pagination1.pages,
  );

  TestValidator.predicate(
    "desc page1 data length must be between 0 and limit",
    descPage1.data.length >= 0 && descPage1.data.length <= 10,
  );

  for (let i = 1; i < descPage1.data.length; i++) {
    const prev = descPage1.data[i - 1];
    const curr = descPage1.data[i];
    TestValidator.predicate(
      `desc page1 descending order at index ${i}`,
      prev.created_at >= curr.created_at,
    );
  }

  // If total records fit within first two asc pages, compare extremes for asc vs desc
  const canCompareFullAscSlice =
    pagination1.pages <= 2 && pagination1.records <= 20;

  if (canCompareFullAscSlice) {
    const ascAllSessions: ICommunityPlatformGuestuserSession.ISummary[] = [
      ...page1.data,
      ...page2.data,
    ];

    if (ascAllSessions.length > 0 && descPage1.data.length > 0) {
      const ascSorted = [...ascAllSessions].sort((a, b) =>
        a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0,
      );

      const lastAsc = ascSorted[ascSorted.length - 1];
      const firstDesc = descPage1.data[0];

      TestValidator.equals(
        "first session in desc order should match last in asc slice when fully covered",
        firstDesc.id,
        lastAsc.id,
      );
    }
  }

  // 7. Request page beyond total pages and validate metadata consistency
  if (pagination1.pages >= 1) {
    const outOfRangePageIndex = pagination1.pages + 1;

    const requestBeyond = {
      page: outOfRangePageIndex as number & tags.Type<"int32">,
      limit: 10 as number & tags.Type<"int32">,
      sort_by: "created_at",
      sort_direction: "asc",
    } satisfies ICommunityPlatformGuestuserSession.IRequest;

    const beyondPage: IPageICommunityPlatformGuestuserSession.ISummary =
      await api.functional.communityPlatform.platformAdmin.guestUsers.sessions.index(
        connection,
        {
          guestUserId,
          body: requestBeyond,
        },
      );
    typia.assert(beyondPage);

    const beyondPagination: IPage.IPagination = beyondPage.pagination;

    TestValidator.equals(
      "beyond page limit should remain 10",
      beyondPagination.limit,
      10 as number,
    );

    TestValidator.equals(
      "beyond page records should match original records",
      beyondPagination.records,
      pagination1.records,
    );

    TestValidator.equals(
      "beyond page pages should match original pages",
      beyondPagination.pages,
      pagination1.pages,
    );

    TestValidator.predicate(
      "beyond page current should be either requested index or last page",
      beyondPagination.current === outOfRangePageIndex ||
        beyondPagination.current === pagination1.pages,
    );

    TestValidator.predicate(
      "beyond page data length must be between 0 and limit",
      beyondPage.data.length >= 0 && beyondPage.data.length <= 10,
    );
  }
}
