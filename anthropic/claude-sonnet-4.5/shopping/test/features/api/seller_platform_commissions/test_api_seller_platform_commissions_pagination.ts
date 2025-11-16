import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPlatformCommission } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPlatformCommission";
import type { IShoppingMallPlatformCommission } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformCommission";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test pagination functionality for seller platform commission record
 * retrieval.
 *
 * This test validates that the page and limit parameters control pagination
 * correctly, with page starting from 1 and limit respecting the maximum of 100
 * records per page. It verifies that pagination metadata includes accurate
 * current page, total records, total pages, and limit values. Tests navigation
 * through multiple pages of commission records and verifies that each page
 * contains the correct number of records.
 *
 * Edge cases tested:
 *
 * 1. Requesting a page number beyond available pages
 * 2. Using minimum and maximum limit values
 * 3. Handling scenarios where total records are less than the page limit
 *
 * Test Flow:
 *
 * 1. Create and authenticate seller account
 * 2. Test default pagination (page 1)
 * 3. Test various page numbers
 * 4. Test minimum limit value (1)
 * 5. Test maximum limit value (100)
 * 6. Test page beyond available data
 * 7. Validate pagination metadata accuracy
 */
export async function test_api_seller_platform_commissions_pagination(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate seller account
  const sellerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile("+82"),
    business_name: RandomGenerator.name(2),
    business_description: RandomGenerator.paragraph({ sentences: 5 }),
    store_name: RandomGenerator.name(2),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSeller.ICreate;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerData,
    });
  typia.assert(seller);

  // Step 2: Test default pagination (page 1, default limit)
  const defaultPage: IPageIShoppingMallPlatformCommission.ISummary =
    await api.functional.shoppingMall.seller.sellers.platformCommissions.index(
      connection,
      {
        sellerId: seller.id,
        body: {} satisfies IShoppingMallPlatformCommission.IRequest,
      },
    );
  typia.assert(defaultPage);

  // Validate pagination structure
  TestValidator.predicate(
    "pagination object exists",
    defaultPage.pagination !== null && defaultPage.pagination !== undefined,
  );
  TestValidator.predicate("data array exists", Array.isArray(defaultPage.data));

  // Step 3: Test explicit page 1 with limit 20
  const page1: IPageIShoppingMallPlatformCommission.ISummary =
    await api.functional.shoppingMall.seller.sellers.platformCommissions.index(
      connection,
      {
        sellerId: seller.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies IShoppingMallPlatformCommission.IRequest,
      },
    );
  typia.assert(page1);

  // Validate page 1 metadata
  TestValidator.equals("page 1 current page", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1.pagination.limit, 20);
  TestValidator.predicate(
    "page 1 records is non-negative",
    page1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page 1 pages is non-negative",
    page1.pagination.pages >= 0,
  );

  // Step 4: Test minimum limit value (1)
  const minLimit: IPageIShoppingMallPlatformCommission.ISummary =
    await api.functional.shoppingMall.seller.sellers.platformCommissions.index(
      connection,
      {
        sellerId: seller.id,
        body: {
          page: 1,
          limit: 1,
        } satisfies IShoppingMallPlatformCommission.IRequest,
      },
    );
  typia.assert(minLimit);

  TestValidator.equals(
    "min limit current page",
    minLimit.pagination.current,
    1,
  );
  TestValidator.equals("min limit value", minLimit.pagination.limit, 1);
  TestValidator.predicate(
    "min limit data length <= 1",
    minLimit.data.length <= 1,
  );

  // Step 5: Test maximum limit value (100)
  const maxLimit: IPageIShoppingMallPlatformCommission.ISummary =
    await api.functional.shoppingMall.seller.sellers.platformCommissions.index(
      connection,
      {
        sellerId: seller.id,
        body: {
          page: 1,
          limit: 100,
        } satisfies IShoppingMallPlatformCommission.IRequest,
      },
    );
  typia.assert(maxLimit);

  TestValidator.equals(
    "max limit current page",
    maxLimit.pagination.current,
    1,
  );
  TestValidator.equals("max limit value", maxLimit.pagination.limit, 100);
  TestValidator.predicate(
    "max limit data length <= 100",
    maxLimit.data.length <= 100,
  );

  // Step 6: Test page 2 to verify multi-page navigation
  const page2: IPageIShoppingMallPlatformCommission.ISummary =
    await api.functional.shoppingMall.seller.sellers.platformCommissions.index(
      connection,
      {
        sellerId: seller.id,
        body: {
          page: 2,
          limit: 10,
        } satisfies IShoppingMallPlatformCommission.IRequest,
      },
    );
  typia.assert(page2);

  TestValidator.equals("page 2 current page", page2.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2.pagination.limit, 10);

  // Step 7: Test page beyond available pages (page 999)
  const beyondPage: IPageIShoppingMallPlatformCommission.ISummary =
    await api.functional.shoppingMall.seller.sellers.platformCommissions.index(
      connection,
      {
        sellerId: seller.id,
        body: {
          page: 999,
          limit: 20,
        } satisfies IShoppingMallPlatformCommission.IRequest,
      },
    );
  typia.assert(beyondPage);

  TestValidator.equals(
    "beyond page current page",
    beyondPage.pagination.current,
    999,
  );
  TestValidator.predicate(
    "beyond page should have empty or limited data",
    beyondPage.data.length === 0 ||
      beyondPage.pagination.current <= beyondPage.pagination.pages,
  );

  // Step 8: Validate pagination calculation consistency
  if (page1.pagination.records > 0) {
    const expectedPages = Math.ceil(
      page1.pagination.records / page1.pagination.limit,
    );
    TestValidator.equals(
      "calculated pages matches pagination.pages",
      page1.pagination.pages,
      expectedPages,
    );
  }

  // Step 9: Validate data array length respects limit
  TestValidator.predicate(
    "page 1 data length does not exceed limit",
    page1.data.length <= page1.pagination.limit,
  );
}
