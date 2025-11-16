import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformUserSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSecurityEvent";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformUserSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformUserSecurityEvent";

export async function test_api_user_security_events_pagination_edges(
  connection: api.IConnection,
) {
  // 1. Join as a new platform admin so that subsequent calls are authorized.
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: "https://admin.example.com/signup",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Optionally create a new account status to exercise the dependency
  //    endpoint and ensure account status master data exists.
  const statusBody = {
    key: `STATUS_${RandomGenerator.alphabets(5)}`,
    label: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    isLoginAllowed: true,
    isPostingAllowed: true,
    isVotingAllowed: true,
    requiresManualReview: false,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  const createdStatus: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      { body: statusBody },
    );
  typia.assert(createdStatus);

  // 3. Request the first page with a small pageSize (e.g., 5) and broad filters.
  const firstPageInput = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize: 5 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies ICommunityPlatformUserSecurityEvent.IRequest;

  const firstPage: IPageICommunityPlatformUserSecurityEvent.ISummary =
    await api.functional.communityPlatform.platformAdmin.userSecurityEvents.index(
      connection,
      { body: firstPageInput },
    );
  typia.assert(firstPage);

  const firstPagination: IPage.IPagination = firstPage.pagination;
  typia.assert(firstPagination);

  // Basic invariants for first page.
  TestValidator.predicate(
    "first page: data length <= limit",
    firstPage.data.length <= firstPagination.limit,
  );
  TestValidator.predicate(
    "first page: limit reflects requested pageSize",
    firstPagination.limit === 5,
  );
  TestValidator.predicate(
    "first page: current page index is non-negative",
    firstPagination.current >= 0,
  );
  TestValidator.predicate(
    "first page: records and pages are non-negative",
    firstPagination.records >= 0 && firstPagination.pages >= 0,
  );

  // If no records exist, we can only validate internal consistency and then exit.
  if (firstPagination.records === 0) {
    TestValidator.equals(
      "no records: pages should be zero",
      firstPagination.pages,
      0,
    );
    TestValidator.equals(
      "no records: data must be empty",
      firstPage.data.length,
      0,
    );
    return;
  }

  // When records exist, pages must be at least 1.
  TestValidator.predicate(
    "records > 0 implies at least one page",
    firstPagination.pages >= 1,
  );

  // 4. If there are at least two pages, fetch a second page with same pageSize
  //    and verify that the slices differ when both pages have data.
  if (firstPagination.pages >= 2) {
    const secondPageInput = {
      page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
      pageSize: 5 as number & tags.Type<"int32"> & tags.Minimum<1>,
    } satisfies ICommunityPlatformUserSecurityEvent.IRequest;

    const secondPage: IPageICommunityPlatformUserSecurityEvent.ISummary =
      await api.functional.communityPlatform.platformAdmin.userSecurityEvents.index(
        connection,
        { body: secondPageInput },
      );
    typia.assert(secondPage);
    const secondPagination: IPage.IPagination = secondPage.pagination;
    typia.assert(secondPagination);

    TestValidator.equals(
      "second page: limit reflects requested pageSize",
      secondPagination.limit,
      5,
    );
    TestValidator.predicate(
      "second page: data length <= limit",
      secondPage.data.length <= secondPagination.limit,
    );

    // Compare slices only when both pages have at least one element.
    if (firstPage.data.length > 0 && secondPage.data.length > 0) {
      const firstIds = firstPage.data.map((e) => e.id);
      const secondIds = secondPage.data.map((e) => e.id);

      const anyShared = secondIds.some((id) => firstIds.includes(id));
      TestValidator.predicate(
        "first and second page should represent different slices when both have data",
        anyShared === false,
      );
    }
  }

  // 5. Request an over-large page index (e.g., 9999) and assert graceful handling.
  const bigPageIndex = 9999 as number & tags.Type<"int32"> & tags.Minimum<1>;

  const overLargeInput = {
    page: bigPageIndex,
    pageSize: 5 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies ICommunityPlatformUserSecurityEvent.IRequest;

  const overLargePage: IPageICommunityPlatformUserSecurityEvent.ISummary =
    await api.functional.communityPlatform.platformAdmin.userSecurityEvents.index(
      connection,
      { body: overLargeInput },
    );
  typia.assert(overLargePage);

  const overLargePagination: IPage.IPagination = overLargePage.pagination;
  typia.assert(overLargePagination);

  TestValidator.predicate(
    "over-large page: data length <= limit",
    overLargePage.data.length <= overLargePagination.limit,
  );

  // Behavior may be either clamping or empty result on out-of-range.
  if (firstPagination.pages > 0) {
    TestValidator.predicate(
      "over-large page: current is either requested or last page",
      overLargePagination.current === bigPageIndex ||
        overLargePagination.current === firstPagination.pages,
    );
  }

  // 6. Vary pageSize to a larger value and confirm new limit and data length.
  const largePageSize = 20 as number & tags.Type<"int32"> & tags.Minimum<1>;

  const largePageInput = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize: largePageSize,
  } satisfies ICommunityPlatformUserSecurityEvent.IRequest;

  const largePage: IPageICommunityPlatformUserSecurityEvent.ISummary =
    await api.functional.communityPlatform.platformAdmin.userSecurityEvents.index(
      connection,
      { body: largePageInput },
    );
  typia.assert(largePage);

  const largePagination: IPage.IPagination = largePage.pagination;
  typia.assert(largePagination);

  TestValidator.equals(
    "large page: limit reflects requested larger pageSize",
    largePagination.limit,
    largePageSize,
  );
  TestValidator.predicate(
    "large page: data length does not exceed limit",
    largePage.data.length <= largePagination.limit,
  );
}
