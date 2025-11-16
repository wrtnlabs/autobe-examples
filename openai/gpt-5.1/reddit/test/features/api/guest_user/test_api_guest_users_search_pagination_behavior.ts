import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformGuestuser";

export async function test_api_guest_users_search_pagination_behavior(
  connection: api.IConnection,
) {
  // 1. Arrange: register an adminUser to obtain Authorization header context.
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const admin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);
  typia.assert<IAuthorizationToken>(admin.token);

  // 2. Act: call guestUsers.index for page 1 with limit 5 and wide date range.
  const now = new Date();
  const createdFrom = new Date(
    now.getTime() - 365 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const createdTo = new Date(
    now.getTime() + 365 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const pageSize = 5 satisfies number;

  const firstRequestBody = {
    page: 1,
    limit: pageSize,
    createdFrom,
    createdTo,
    includeDeleted: false,
  } satisfies ICommunityPlatformGuestuser.IRequest;

  const firstPage: IPageICommunityPlatformGuestuser.ISummary =
    await api.functional.communityPlatform.adminUser.guestUsers.index(
      connection,
      { body: firstRequestBody },
    );
  typia.assert(firstPage);

  const firstPagination: IPage.IPagination = firstPage.pagination;
  typia.assert(firstPagination);

  // Basic pagination invariants for page 1
  TestValidator.equals(
    "pagination current page should be 1 for first request",
    firstPagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should equal requested limit for first page",
    firstPagination.limit,
    pageSize,
  );

  TestValidator.predicate(
    "pagination records should be non-negative",
    firstPagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be at least 1 when there are records, otherwise 0",
    (firstPagination.records === 0 && firstPagination.pages === 0) ||
      (firstPagination.records > 0 && firstPagination.pages >= 1),
  );

  const firstPageIds: string[] = firstPage.data.map((g) => g.id);

  // 3. If there are at least two pages, fetch the second page and compare.
  if (firstPagination.pages >= 2) {
    const secondRequestBody = {
      page: 2,
      limit: pageSize,
      createdFrom,
      createdTo,
      includeDeleted: false,
    } satisfies ICommunityPlatformGuestuser.IRequest;

    const secondPage: IPageICommunityPlatformGuestuser.ISummary =
      await api.functional.communityPlatform.adminUser.guestUsers.index(
        connection,
        { body: secondRequestBody },
      );
    typia.assert(secondPage);
    const secondPagination: IPage.IPagination = secondPage.pagination;
    typia.assert(secondPagination);

    TestValidator.equals(
      "pagination current page should be 2 for second request",
      secondPagination.current,
      2,
    );
    TestValidator.equals(
      "pagination limit should equal requested limit for second page",
      secondPagination.limit,
      pageSize,
    );
    TestValidator.equals(
      "pagination total records must be consistent between first and second pages",
      secondPagination.records,
      firstPagination.records,
    );
    TestValidator.equals(
      "pagination total pages must be consistent between first and second pages",
      secondPagination.pages,
      firstPagination.pages,
    );

    const secondPageIds: string[] = secondPage.data.map((g) => g.id);

    // Ensure no overlapping IDs between page 1 and page 2
    const overlappingIds = secondPageIds.filter((id) =>
      firstPageIds.includes(id),
    );
    TestValidator.equals(
      "page 1 and page 2 should have non-overlapping guest user IDs",
      overlappingIds.length,
      0,
    );
  }

  // 4. Iterate all pages to verify total coverage and uniqueness of IDs.
  const allIds = new Set<string>();
  const totalPages = firstPagination.pages;
  const totalRecords = firstPagination.records;

  if (totalRecords === 0 || totalPages === 0) {
    TestValidator.equals(
      "when there are zero records, pages should also be zero",
      totalPages,
      0,
    );
    TestValidator.equals(
      "no guest users should be returned when records is zero",
      firstPage.data.length,
      0,
    );
    return;
  }

  for (let page = 1; page <= totalPages; page++) {
    const body = {
      page,
      limit: pageSize,
      createdFrom,
      createdTo,
      includeDeleted: false,
    } satisfies ICommunityPlatformGuestuser.IRequest;

    const pageResult: IPageICommunityPlatformGuestuser.ISummary =
      await api.functional.communityPlatform.adminUser.guestUsers.index(
        connection,
        { body },
      );
    typia.assert(pageResult);
    const pagination = pageResult.pagination;
    typia.assert(pagination);

    TestValidator.equals(
      `pagination current page should match requested page ${page}`,
      pagination.current,
      page,
    );
    TestValidator.equals(
      "pagination limit should remain constant across pages",
      pagination.limit,
      pageSize,
    );
    TestValidator.equals(
      "total records should be constant across all pages",
      pagination.records,
      totalRecords,
    );
    TestValidator.equals(
      "total pages should be constant across all pages",
      pagination.pages,
      totalPages,
    );

    for (const guest of pageResult.data) {
      allIds.add(guest.id);
    }
  }

  // 5. Verify that the number of unique IDs seen across all pages does not
  // exceed totalRecords and is reasonably bounded by records.
  const uniqueCount = allIds.size;

  TestValidator.predicate(
    "unique guest user count across all pages should be less than or equal to total records",
    uniqueCount <= totalRecords,
  );

  TestValidator.predicate(
    "when there are enough records to fill pages, totalRecords should be at least the count of unique IDs we observed",
    totalRecords >= uniqueCount,
  );
}
