import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPlatformadmin";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate pagination boundaries when searching platform administrators.
 *
 * This test ensures that the platform-admin search endpoint (PATCH
 * /shoppingMall/platformAdmin/platformAdmins) correctly computes pagination
 * metadata and slices administrator data across pages, including when the
 * requested page index is outside the valid range.
 *
 * High-level flow:
 *
 * 1. Bootstrap an authenticated platform admin via POST /auth/platformAdmin/join.
 * 2. Optionally create a catalog brand via POST /shoppingMall/platformAdmin/brands
 *    to exercise an additional platform-admin-only endpoint (environment
 *    realism).
 * 3. Create multiple additional platform admins via repeated join calls so that
 *    the platform-admin list spans at least two pages for limit=10.
 * 4. Request page 0 with limit=10 and verify:
 *
 *    - Pagination.current is 0 (first page, zero-based),
 *    - Pagination.limit is 10,
 *    - Pagination.records is at least the number we just created,
 *    - Pagination.pages matches ceil(records / max(limit, 1)),
 *    - Data.length is between 0 and limit and > 0 when there are records.
 * 5. Request page 1 (second page) with the same limit and verify:
 *
 *    - Pagination.current is 1,
 *    - Pagination.limit is 10,
 *    - Pagination.records and pagination.pages match those of page 0,
 *    - Data.length is between 0 and limit,
 *    - No admin id is duplicated between page 0 and page 1.
 * 6. Request a page index beyond the last page (pages + 5) and verify:
 *
 *    - The response is still successful,
 *    - Pagination metadata remains consistent,
 *    - Data is empty when the requested page is beyond available pages.
 */
export async function test_api_platform_admin_search_admins_pagination_boundaries(
  connection: api.IConnection,
) {
  // 1. Bootstrap an authenticated platform admin using join.
  const baseAdminRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/referrer",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const baseAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: baseAdminRequest,
    });
  typia.assert(baseAdmin);

  // 2. Optionally create a brand to ensure admin context is realistic.
  const brandCreateBody = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(16),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri: "https://cdn.example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 3. Create additional platform admins so that pagination has multiple pages.
  const ADDITIONAL_ADMINS = 15;
  const createdAdminIds: string[] = [];

  for (let i = 0; i < ADDITIONAL_ADMINS; ++i) {
    const req = {
      email: typia.random<string & tags.Format<"email">>(),
      name: RandomGenerator.name(),
      password: RandomGenerator.alphaNumeric(12),
      ip: null,
      href: "https://admin.example.com/join",
      referrer: "https://admin.example.com/referrer",
    } satisfies IShoppingMallPlatformAdminJoin.IRequest;

    const admin: IShoppingMallPlatformAdmin.IAuthorized =
      await api.functional.auth.platformAdmin.join(connection, {
        body: req,
      });
    typia.assert(admin);
    createdAdminIds.push(admin.id);
  }

  const expectedMinimumRecords = createdAdminIds.length + 1; // base admin + extra

  const PAGE_LIMIT = 10 as const;

  // 4. Request first page (page 0) with limit=10.
  const firstPageRequest = {
    page: 0,
    limit: PAGE_LIMIT,
  } satisfies IShoppingMallPlatformAdmin.IRequest;

  const firstPage: IPageIShoppingMallPlatformadmin.ISummary =
    await api.functional.shoppingMall.platformAdmin.platformAdmins.index(
      connection,
      {
        body: firstPageRequest,
      },
    );
  typia.assert(firstPage);

  const firstPagination = firstPage.pagination;
  const firstData = firstPage.data;

  TestValidator.equals(
    "first page current index should be 0",
    firstPagination.current,
    0,
  );

  TestValidator.equals(
    "first page limit should be PAGE_LIMIT",
    firstPagination.limit,
    PAGE_LIMIT,
  );

  TestValidator.predicate(
    "total records should be at least the number of admins created in this test",
    firstPagination.records >= expectedMinimumRecords,
  );

  const effectiveLimit = Math.max(firstPagination.limit, 1);
  const expectedPages = Math.ceil(firstPagination.records / effectiveLimit);

  TestValidator.equals(
    "pages should equal ceil(records / max(limit,1))",
    firstPagination.pages,
    expectedPages,
  );

  TestValidator.predicate(
    "first page data length must be between 0 and limit",
    firstData.length >= 0 && firstData.length <= firstPagination.limit,
  );

  if (firstPagination.records > 0) {
    TestValidator.predicate(
      "first page should return at least one record when there are records",
      firstData.length > 0,
    );
  }

  // 5. Request second page (page 1) with same limit.
  const secondPageRequest = {
    page: 1,
    limit: PAGE_LIMIT,
  } satisfies IShoppingMallPlatformAdmin.IRequest;

  const secondPage: IPageIShoppingMallPlatformadmin.ISummary =
    await api.functional.shoppingMall.platformAdmin.platformAdmins.index(
      connection,
      {
        body: secondPageRequest,
      },
    );
  typia.assert(secondPage);

  const secondPagination = secondPage.pagination;
  const secondData = secondPage.data;

  TestValidator.equals(
    "second page current index should be 1",
    secondPagination.current,
    1,
  );

  TestValidator.equals(
    "second page limit should match first page limit",
    secondPagination.limit,
    firstPagination.limit,
  );

  TestValidator.equals(
    "records count should be stable across pages for same query",
    secondPagination.records,
    firstPagination.records,
  );

  TestValidator.equals(
    "pages count should be stable across pages for same query",
    secondPagination.pages,
    firstPagination.pages,
  );

  TestValidator.predicate(
    "second page data length must be between 0 and limit",
    secondData.length >= 0 && secondData.length <= secondPagination.limit,
  );

  // Distinctness between page 0 and page 1.
  const firstIds = firstData.map((admin) => admin.id);
  const secondIds = secondData.map((admin) => admin.id);

  const hasOverlap = secondIds.some((id) => firstIds.includes(id));

  TestValidator.predicate(
    "page 0 and page 1 should not have overlapping admin ids",
    hasOverlap === false,
  );

  // 6. Request an out-of-range page.
  const outOfRangePageIndex =
    firstPagination.pages <= 0 ? 0 : firstPagination.pages + 5;

  const outOfRangeRequest = {
    page: outOfRangePageIndex,
    limit: PAGE_LIMIT,
  } satisfies IShoppingMallPlatformAdmin.IRequest;

  const outOfRangePage: IPageIShoppingMallPlatformadmin.ISummary =
    await api.functional.shoppingMall.platformAdmin.platformAdmins.index(
      connection,
      {
        body: outOfRangeRequest,
      },
    );
  typia.assert(outOfRangePage);

  const outPagination = outOfRangePage.pagination;
  const outData = outOfRangePage.data;

  // Pagination metadata should remain consistent with previous calls.
  TestValidator.equals(
    "out-of-range page records should equal initial records",
    outPagination.records,
    firstPagination.records,
  );

  TestValidator.equals(
    "out-of-range page pages should equal initial pages",
    outPagination.pages,
    firstPagination.pages,
  );

  if (firstPagination.pages > 0) {
    // When there are pages, current must be within valid range [0, pages-1].
    TestValidator.predicate(
      "out-of-range page current index must be within valid bounds when there are pages",
      outPagination.current >= 0 && outPagination.current < outPagination.pages,
    );

    // Core business rule: out-of-range page (requested index >= pages) returns empty data.
    TestValidator.predicate(
      "out-of-range page should return empty data for non-empty result set",
      outOfRangePageIndex >= firstPagination.pages && outData.length === 0,
    );
  } else {
    // No records at all; pages should be 0 and data empty regardless of page.
    TestValidator.equals(
      "when there are no records, pages should be 0",
      outPagination.pages,
      0,
    );
    TestValidator.predicate(
      "when there are no records, data should be empty",
      outData.length === 0,
    );
  }
}
