import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPlatformadmin";

export async function test_api_platform_admin_index_pagination_boundaries(
  connection: api.IConnection,
) {
  // 1. Prepare a platform admin by joining (also sets Authorization header).
  const firstAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const firstAdmin = await api.functional.auth.platformAdmin.join(connection, {
    body: firstAdminJoinBody,
  });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(firstAdmin);

  // 2. Create at least one account status so that admins have a valid status.
  const statusCreateBody = {
    key: `ACTIVE_${RandomGenerator.alphaNumeric(6)}`,
    label: "Active",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    isLoginAllowed: true,
    isPostingAllowed: true,
    isVotingAllowed: true,
    requiresManualReview: false,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  const accountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      {
        body: statusCreateBody,
      },
    );
  typia.assert<ICommunityPlatformAccountStatus>(accountStatus);

  // 3. Create multiple platform admins via join to exceed a page size of 10.
  const TARGET_ADMINS = 25;
  const createdAdminIds: (string & tags.Format<"uuid">)[] = [];

  createdAdminIds.push(firstAdmin.id);

  const joinMoreCount = TARGET_ADMINS - 1;
  for (let i = 0; i < joinMoreCount; i++) {
    const joinBody = {
      username: `${RandomGenerator.name(1)}_${i}`,
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformPlatformadmin.IJoin;

    const admin = await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
    typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(admin);
    createdAdminIds.push(admin.id);
  }

  TestValidator.predicate(
    "created enough platform admins for pagination",
    () => createdAdminIds.length >= TARGET_ADMINS,
  );

  const PAGE_SIZE = 10;

  // 4A. First page: page = 1, limit = 10, sort by createdAt asc.
  const firstPageRequestBody = {
    page: 1,
    limit: PAGE_SIZE,
    sortBy: "createdAt",
    sortDirection: "asc",
  } satisfies ICommunityPlatformPlatformadmin.IRequest;

  const firstPage =
    await api.functional.communityPlatform.platformAdmin.platformAdmins.index(
      connection,
      {
        body: firstPageRequestBody,
      },
    );
  typia.assert<IPageICommunityPlatformPlatformadmin.ISummary>(firstPage);

  const firstPagination = firstPage.pagination;
  const firstData = firstPage.data;

  TestValidator.equals(
    "first page current index should be 1",
    firstPagination.current,
    1,
  );
  TestValidator.equals(
    "first page limit should equal PAGE_SIZE",
    firstPagination.limit,
    PAGE_SIZE,
  );
  TestValidator.predicate(
    "first page records should be at least number of created admins",
    () => firstPagination.records >= createdAdminIds.length,
  );
  TestValidator.predicate(
    "first page pages should be consistent with records and limit or zero when limit is zero",
    () =>
      (firstPagination.limit === 0 && firstPagination.pages === 0) ||
      (firstPagination.limit > 0 &&
        firstPagination.pages ===
          Math.ceil(firstPagination.records / firstPagination.limit)),
  );
  TestValidator.predicate(
    "first page should have at least 1 and at most PAGE_SIZE records when there are records",
    () =>
      (firstPagination.records === 0 && firstData.length === 0) ||
      (firstPagination.records > 0 &&
        firstData.length > 0 &&
        firstData.length <= PAGE_SIZE),
  );

  const firstPageIds = firstData.map((admin) => admin.id);

  // 4B. Second page: page = 2, limit = 10, same sort.
  const secondPageRequestBody = {
    page: 2,
    limit: PAGE_SIZE,
    sortBy: "createdAt",
    sortDirection: "asc",
  } satisfies ICommunityPlatformPlatformadmin.IRequest;

  const secondPage =
    await api.functional.communityPlatform.platformAdmin.platformAdmins.index(
      connection,
      {
        body: secondPageRequestBody,
      },
    );
  typia.assert<IPageICommunityPlatformPlatformadmin.ISummary>(secondPage);

  const secondPagination = secondPage.pagination;
  const secondData = secondPage.data;

  TestValidator.equals(
    "second page current index should be 2",
    secondPagination.current,
    2,
  );
  TestValidator.equals(
    "second page limit should equal PAGE_SIZE",
    secondPagination.limit,
    PAGE_SIZE,
  );
  TestValidator.predicate(
    "second page should have at least 1 and at most PAGE_SIZE records when enough records exist",
    () =>
      (secondPagination.records <= PAGE_SIZE &&
        secondData.length <= PAGE_SIZE) ||
      (secondPagination.records > PAGE_SIZE &&
        secondData.length > 0 &&
        secondData.length <= PAGE_SIZE),
  );

  const secondPageIds = secondData.map((admin) => admin.id);
  const combinedIds = [...firstPageIds, ...secondPageIds];

  TestValidator.predicate(
    "first and second page ids should be distinct (no overlap)",
    () => {
      const setFirst = new Set(firstPageIds);
      const hasIntersection = secondPageIds.some((id) => setFirst.has(id));
      return !hasIntersection;
    },
  );

  TestValidator.predicate(
    "combined first two page ids should not exceed 2 * PAGE_SIZE unique ids",
    () => new Set(combinedIds).size <= 2 * PAGE_SIZE,
  );

  // 4C. Out-of-range page: page = 999, limit = 10.
  const outOfRangePageRequestBody = {
    page: 999,
    limit: PAGE_SIZE,
    sortBy: "createdAt",
    sortDirection: "asc",
  } satisfies ICommunityPlatformPlatformadmin.IRequest;

  const outOfRangePage =
    await api.functional.communityPlatform.platformAdmin.platformAdmins.index(
      connection,
      {
        body: outOfRangePageRequestBody,
      },
    );
  typia.assert<IPageICommunityPlatformPlatformadmin.ISummary>(outOfRangePage);

  const outPagination = outOfRangePage.pagination;
  const outData = outOfRangePage.data;

  TestValidator.predicate(
    "out-of-range pagination current should be non-negative",
    () => outPagination.current >= 0,
  );
  TestValidator.predicate(
    "out-of-range pagination pages should be non-negative",
    () => outPagination.pages >= 0,
  );
  TestValidator.predicate(
    "out-of-range pagination records should be non-negative",
    () => outPagination.records >= 0,
  );
  TestValidator.predicate(
    "out-of-range page data length should not exceed PAGE_SIZE",
    () => outData.length <= PAGE_SIZE,
  );
  TestValidator.predicate(
    "out-of-range page: if pages is 0 then records must be 0 and data empty",
    () =>
      outPagination.pages !== 0 ||
      (outPagination.records === 0 && outData.length === 0),
  );
  TestValidator.predicate(
    "out-of-range page: when limit is positive, pages must align with records",
    () =>
      (outPagination.limit === 0 && outPagination.pages === 0) ||
      (outPagination.limit > 0 &&
        outPagination.pages ===
          Math.ceil(outPagination.records / outPagination.limit)),
  );
}
