import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformGuestuser";

/**
 * Validate pagination boundary behavior for guest user search.
 *
 * Business context: Platform administrators need reliable pagination metadata
 * when reviewing guest user activity in admin UI grids. This test ensures that
 * the /communityPlatform/platformAdmin/guestUsers search endpoint correctly
 * computes pagination fields (current, limit, records, pages) and behaves
 * consistently on the first page, the last page, and when requesting a page
 * beyond the last.
 *
 * Steps:
 *
 * 1. Register a platform admin using POST /auth/platformAdmin/join so that
 *    subsequent communityPlatform.platformAdmin endpoints run under an
 *    authenticated platformAdmin actor.
 * 2. Create at least one account status via POST
 *    /communityPlatform/platformAdmin/accountStatuses to reflect the realistic
 *    precondition that guest users can be classified by status.
 * 3. Perform an initial guest user search with a small pageSize (5) and sorting by
 *    created_at desc.
 * 4. Validate that the first page respects pageSize on returned data and exposes
 *    consistent records/pages metadata.
 * 5. Navigate to the last page (pagination.pages) and verify that
 *    pagination.current matches or is clamped, data length is within [0,
 *    pageSize], and records/pages remain unchanged.
 * 6. Optionally request page pages+1 and assert that the implementation’s behavior
 *    (clamped vs empty page) is consistent while preserving records/pages.
 */
export async function test_api_platform_admin_guest_users_search_pagination_boundaries(
  connection: api.IConnection,
) {
  // 1. Register a platform admin to obtain authenticated context
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(adminAuthorized);
  typia.assert<IAuthorizationToken>(adminAuthorized.token);

  // 2. Create at least one account status to match realistic configuration
  const statusCreateBody = {
    key: `ACTIVE_${RandomGenerator.alphabets(6)}`,
    label: "Active Guest",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    isLoginAllowed: true,
    isPostingAllowed: true,
    isVotingAllowed: true,
    requiresManualReview: false,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  const createdStatus: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      { body: statusCreateBody },
    );
  typia.assert<ICommunityPlatformAccountStatus>(createdStatus);

  // Note: We do not have an API to create guest users explicitly in this
  // context. The system under test may already have seed guest data or may
  // be running in simulate mode. Pagination boundary checks are therefore
  // expressed in terms of whatever data exists.

  const pageSize = 5 as const;

  // 3. First page search: page=1, pageSize=5, include_deleted=false
  const firstRequestBody = {
    page: 1,
    pageSize,
    include_deleted: false,
    sort_by: "created_at",
    sort_direction: "desc",
  } satisfies ICommunityPlatformGuestuser.IRequest;

  const firstPage: IPageICommunityPlatformGuestuser.ISummary =
    await api.functional.communityPlatform.platformAdmin.guestUsers.index(
      connection,
      { body: firstRequestBody },
    );
  typia.assert<IPageICommunityPlatformGuestuser.ISummary>(firstPage);

  const firstPagination: IPage.IPagination = firstPage.pagination;
  typia.assert<IPage.IPagination>(firstPagination);

  // Basic pagination expectations on first page
  TestValidator.predicate(
    "first page current index should be 1 or 0 (edge case)",
    firstPagination.current === 1 || firstPagination.current === 0,
  );

  // limit should be non-negative
  TestValidator.predicate(
    "pagination limit should be non-negative",
    firstPagination.limit >= 0,
  );

  // records and pages are consistent with non-negative values
  TestValidator.predicate(
    "total records should be non-negative",
    firstPagination.records >= 0,
  );

  TestValidator.predicate(
    "total pages should be non-negative",
    firstPagination.pages >= 0,
  );

  // data length must not exceed the requested pageSize, regardless of limit
  TestValidator.predicate(
    "first page data length must not exceed pageSize",
    firstPage.data.length <= pageSize,
  );

  // 4. If there are no records or only a single page, boundary checks still
  // hold trivially, but we can only do "last page" vs "out-of-range" when
  // pages >= 1.
  if (firstPagination.pages > 0) {
    const lastPageIndex = firstPagination.pages;

    const lastRequestBody = {
      page: lastPageIndex,
      pageSize,
      include_deleted: false,
      sort_by: "created_at",
      sort_direction: "desc",
    } satisfies ICommunityPlatformGuestuser.IRequest;

    const lastPage: IPageICommunityPlatformGuestuser.ISummary =
      await api.functional.communityPlatform.platformAdmin.guestUsers.index(
        connection,
        { body: lastRequestBody },
      );
    typia.assert<IPageICommunityPlatformGuestuser.ISummary>(lastPage);

    const lastPagination: IPage.IPagination = lastPage.pagination;
    typia.assert<IPage.IPagination>(lastPagination);

    // current should either equal the requested lastPageIndex or be clamped
    TestValidator.predicate(
      "last page current index should be lastPageIndex or clamped but not exceed it",
      lastPagination.current <= lastPageIndex,
    );

    // last-page data size must be between 0 and pageSize
    TestValidator.predicate(
      "last page data length is within [0, pageSize]",
      lastPage.data.length >= 0 && lastPage.data.length <= pageSize,
    );

    // records and pages must stay consistent between first and last calls
    TestValidator.equals(
      "records count should be stable between first and last page responses",
      lastPagination.records,
      firstPagination.records,
    );

    TestValidator.equals(
      "pages count should be stable between first and last page responses",
      lastPagination.pages,
      firstPagination.pages,
    );

    // 5. Optional: out-of-range page probe when pages > 0
    const outOfRangePageIndex = lastPageIndex + 1;
    const outOfRangeRequestBody = {
      page: outOfRangePageIndex,
      pageSize,
      include_deleted: false,
      sort_by: "created_at",
      sort_direction: "desc",
    } satisfies ICommunityPlatformGuestuser.IRequest;

    const outOfRangePage: IPageICommunityPlatformGuestuser.ISummary =
      await api.functional.communityPlatform.platformAdmin.guestUsers.index(
        connection,
        { body: outOfRangeRequestBody },
      );
    typia.assert<IPageICommunityPlatformGuestuser.ISummary>(outOfRangePage);

    const outPagination: IPage.IPagination = outOfRangePage.pagination;
    typia.assert<IPage.IPagination>(outPagination);

    // Implementation may clamp or reflect requested page index, but it must
    // not expose a current value greater than the requested index.
    TestValidator.predicate(
      "out-of-range current page should not exceed requested page index",
      outPagination.current <= outOfRangePageIndex,
    );

    // Out-of-range requests are expected to yield either an empty data set or
    // the same content as the clamped last page. In either case, the size
    // must not exceed pageSize.
    TestValidator.predicate(
      "out-of-range page data length must not exceed pageSize",
      outOfRangePage.data.length <= pageSize,
    );

    // records and pages must remain stable even for out-of-range requests.
    TestValidator.equals(
      "records count should remain stable for out-of-range page request",
      outPagination.records,
      firstPagination.records,
    );

    TestValidator.equals(
      "pages count should remain stable for out-of-range page request",
      outPagination.pages,
      firstPagination.pages,
    );
  }
}
