import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerPayout } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerPayout";
import type { IShoppingMallGuestCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestCart";
import type { IShoppingMallGuestCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestCartItem";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerPayout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPayout";

/**
 * Validate pagination boundary behavior for seller payout search.
 *
 * Business goal: ensure that the platform admin payout search endpoint (PATCH
 * /shoppingMall/platformAdmin/sellerPayouts) correctly handles first page, last
 * page, and out-of-range page access, and that pagination metadata remains
 * consistent with the total number of records created.
 *
 * Test workflow:
 *
 * 1. Register a platform admin using POST /auth/platformAdmin/join. This also
 *    configures the connection with an Authorization header usable for
 *    subsequent platformAdmin endpoints.
 * 2. Create a guest cart via POST /shoppingMall/guestCarts to emulate unrelated
 *    upstream shopping context.
 * 3. Create N seller payout batches (e.g., 25) via POST
 *    /shoppingMall/platformAdmin/sellerPayouts using
 *    IShoppingMallSellerPayout.ICreate, keeping seller_id and currency_code
 *    stable while varying monetary amounts to ensure distinct records.
 * 4. Call PATCH /shoppingMall/platformAdmin/sellerPayouts with page = 1 and limit
 *    = 10 via IShoppingMallSellerPayout.IRequest and validate:
 *
 *    - Response conforms to IPageIShoppingMallSellerPayout.ISummary.
 *    - Pagination.current is 0 (zero-based) and limit is 10.
 *    - Data.length is 10.
 *    - Pagination.records >= N and pagination.pages >= 3.
 * 5. Using pagination.pages from step 4, compute the last page index and re-query
 *    with page = pages (one-based) and same limit. Validate that:
 *
 *    - Pagination.current equals pages - 1.
 *    - Data.length equals the number of remaining records (records - limit * (pages
 *
 *         - 1)), which must be between 1 and limit inclusive.
 * 6. Request an out-of-range page by calling PATCH with page = pages + 10 and same
 *    limit, and assert that:
 *
 *    - The call succeeds and response type matches
 *         IPageIShoppingMallSellerPayout.ISummary.
 *    - Data.length is 0.
 *    - Pagination.records and pagination.pages remain consistent with the earlier
 *         responses (no mutation of total counts).
 * 7. Finally, iterate from page 1 through pages, aggregating payout summary ids
 *    across all pages. Assert that the number of unique ids equals
 *    pagination.records and that there are no duplicates, proving that
 *    pagination slices form a complete, non-overlapping partition of the search
 *    result set.
 */
export async function test_api_platform_admin_seller_payout_search_pagination_boundaries(
  connection: api.IConnection,
) {
  // 1. Register a platform admin and obtain authorized session
  const adminJoinBody = {
    email: `platform-admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://landing.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Seed a guest cart for upstream context
  const guestCartBody = {
    guest_token: RandomGenerator.alphaNumeric(16),
    ip: "127.0.0.1",
    user_agent: "E2E-Tester/1.0",
    referrer: "https://shop.example.com/",
    region_code: "KR",
  } satisfies IShoppingMallGuestCart.ICreate;

  const guestCart: IShoppingMallGuestCart =
    await api.functional.shoppingMall.guestCarts.create(connection, {
      body: guestCartBody,
    });
  typia.assert<IShoppingMallGuestCart>(guestCart);

  // 3. Create multiple seller payout batches to span several pages
  const targetCount = 25;
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  const currencyCode = "USD";

  const createdPayouts: IShoppingMallSellerPayout[] =
    await ArrayUtil.asyncRepeat(targetCount, async (index) => {
      const gross = 1000 + index * 10;
      const fee = 100 + index;
      const adjustment = index % 2 === 0 ? 0 : -5;
      const net = gross - fee + adjustment;

      const createBody = {
        seller_id: sellerId,
        currency_code: currencyCode,
        gross_amount: gross,
        fee_amount: fee,
        adjustment_amount: adjustment,
        net_amount: net,
        period_start: new Date(
          Date.now() - 7 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        period_end: new Date().toISOString(),
        payout_status: "payout_pending",
        scheduled_payout_at: new Date(
          Date.now() + 24 * 60 * 60 * 1000,
        ).toISOString(),
        memo: `batch-${index}`,
      } satisfies IShoppingMallSellerPayout.ICreate;

      const payout: IShoppingMallSellerPayout =
        await api.functional.shoppingMall.platformAdmin.sellerPayouts.create(
          connection,
          {
            body: createBody,
          },
        );
      typia.assert<IShoppingMallSellerPayout>(payout);
      return payout;
    });

  TestValidator.equals(
    "created payout count matches target",
    createdPayouts.length,
    targetCount,
  );

  // 4. First page query: page=1, limit=10 (request is 1-based, response current is 0-based)
  const firstPageLimit = 10 as const;
  const firstPageRequest = {
    page: 1,
    limit: firstPageLimit,
    sellerId,
  } satisfies IShoppingMallSellerPayout.IRequest;

  const firstPage: IPageIShoppingMallSellerPayout.ISummary =
    await api.functional.shoppingMall.platformAdmin.sellerPayouts.index(
      connection,
      { body: firstPageRequest },
    );
  typia.assert<IPageIShoppingMallSellerPayout.ISummary>(firstPage);

  const firstPagination = firstPage.pagination;
  typia.assert<IPage.IPagination>(firstPagination);

  TestValidator.equals(
    "first page current index should be 0 (zero-based)",
    firstPagination.current,
    0,
  );
  TestValidator.equals(
    "first page limit should be 10",
    firstPagination.limit,
    firstPageLimit,
  );
  TestValidator.equals(
    "first page data length should equal limit",
    firstPage.data.length,
    firstPageLimit,
  );
  TestValidator.predicate(
    "total records should be at least the number of created payouts",
    firstPagination.records >= createdPayouts.length,
  );
  TestValidator.predicate(
    "total pages should be at least 3 with 25+ records at limit 10",
    firstPagination.pages >= 3,
  );

  const totalRecords = firstPagination.records;
  const totalPages = firstPagination.pages;

  // 5. Query last page and validate remaining records count
  const lastPageIndex = totalPages - 1;
  const lastPageRequest = {
    page: totalPages, // 1-based page number for request
    limit: firstPageLimit,
    sellerId,
  } satisfies IShoppingMallSellerPayout.IRequest;

  const lastPage: IPageIShoppingMallSellerPayout.ISummary =
    await api.functional.shoppingMall.platformAdmin.sellerPayouts.index(
      connection,
      { body: lastPageRequest },
    );
  typia.assert<IPageIShoppingMallSellerPayout.ISummary>(lastPage);

  const lastPagination = lastPage.pagination;
  typia.assert<IPage.IPagination>(lastPagination);

  TestValidator.equals(
    "last page current index should equal pages - 1",
    lastPagination.current,
    lastPageIndex,
  );

  const expectedLastPageSize = totalRecords - firstPageLimit * (totalPages - 1);
  TestValidator.predicate(
    "expected last page size should be between 1 and limit",
    expectedLastPageSize >= 1 && expectedLastPageSize <= firstPageLimit,
  );
  TestValidator.equals(
    "last page data length should equal expected remaining records",
    lastPage.data.length,
    expectedLastPageSize,
  );

  // 6. Out-of-range page: request page greater than totalPages
  const outOfRangePageNumber = totalPages + 10;
  const outOfRangeRequest = {
    page: outOfRangePageNumber,
    limit: firstPageLimit,
    sellerId,
  } satisfies IShoppingMallSellerPayout.IRequest;

  const outOfRange: IPageIShoppingMallSellerPayout.ISummary =
    await api.functional.shoppingMall.platformAdmin.sellerPayouts.index(
      connection,
      { body: outOfRangeRequest },
    );
  typia.assert<IPageIShoppingMallSellerPayout.ISummary>(outOfRange);

  const outPagination = outOfRange.pagination;
  typia.assert<IPage.IPagination>(outPagination);

  TestValidator.equals(
    "out-of-range page should return empty data array",
    outOfRange.data.length,
    0,
  );
  TestValidator.equals(
    "out-of-range pagination.records should remain consistent",
    outPagination.records,
    totalRecords,
  );
  TestValidator.equals(
    "out-of-range pagination.pages should remain consistent",
    outPagination.pages,
    totalPages,
  );

  // 7. Aggregate ids across all real pages and ensure uniqueness & coverage
  const allIds: string[] = [];

  for (let page = 1; page <= totalPages; page += 1) {
    const req = {
      page,
      limit: firstPageLimit,
      sellerId,
    } satisfies IShoppingMallSellerPayout.IRequest;

    const pageResult: IPageIShoppingMallSellerPayout.ISummary =
      await api.functional.shoppingMall.platformAdmin.sellerPayouts.index(
        connection,
        { body: req },
      );
    typia.assert<IPageIShoppingMallSellerPayout.ISummary>(pageResult);

    for (const summary of pageResult.data) {
      allIds.push(summary.id);
    }
  }

  const uniqueIds = new Set(allIds);

  TestValidator.equals(
    "unique payout ids across all pages should equal totalRecords",
    uniqueIds.size,
    totalRecords,
  );
  TestValidator.equals(
    "aggregated payout ids length should equal totalRecords",
    allIds.length,
    totalRecords,
  );
}
