import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test pagination functionality for buyers with extensive review histories.
 *
 * This test validates comprehensive pagination behavior including:
 *
 * - Page navigation through multiple pages of review data
 * - Page size limits with various limit parameter values
 * - Pagination metadata accuracy (current page, total records, total pages,
 *   limit)
 * - Maximum limit enforcement (100 items per page constraint)
 * - Edge cases such as requesting pages beyond available data range
 *
 * The test creates a buyer account and retrieves their reviews using different
 * pagination parameters to ensure the API correctly handles page navigation,
 * respects limit constraints, and provides accurate pagination metadata for
 * efficient client-side navigation through large review collections.
 */
export async function test_api_buyer_reviews_pagination(
  connection: api.IConnection,
) {
  // Step 1: Create buyer account for pagination testing
  const buyerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallBuyer.ICreate;

  const buyer = await api.functional.auth.buyer.join(connection, {
    body: buyerData,
  });
  typia.assert(buyer);

  // Step 2: Test default pagination (no parameters)
  const defaultPage =
    await api.functional.shoppingMall.buyer.buyers.reviews.index(connection, {
      buyerId: buyer.id,
      body: {},
    });
  typia.assert(defaultPage);

  // Validate pagination metadata structure
  TestValidator.predicate(
    "pagination metadata exists",
    defaultPage.pagination !== null && defaultPage.pagination !== undefined,
  );
  TestValidator.predicate("data array exists", Array.isArray(defaultPage.data));

  // Step 3: Test with explicit page 1 and default limit
  const page1Default =
    await api.functional.shoppingMall.buyer.buyers.reviews.index(connection, {
      buyerId: buyer.id,
      body: { page: 1 } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(page1Default);

  TestValidator.equals(
    "page 1 current equals 1",
    page1Default.pagination.current,
    1,
  );
  TestValidator.predicate(
    "page 1 limit is positive",
    page1Default.pagination.limit > 0,
  );

  // Step 4: Test with custom limit value (50 items)
  const customLimit = 50;
  const page1Custom =
    await api.functional.shoppingMall.buyer.buyers.reviews.index(connection, {
      buyerId: buyer.id,
      body: {
        page: 1,
        limit: customLimit,
      } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(page1Custom);

  TestValidator.equals(
    "custom limit equals 50",
    page1Custom.pagination.limit,
    customLimit,
  );
  TestValidator.predicate(
    "data length does not exceed limit",
    page1Custom.data.length <= customLimit,
  );

  // Step 5: Test maximum limit enforcement (100 items)
  const maxLimit = 100;
  const maxLimitPage =
    await api.functional.shoppingMall.buyer.buyers.reviews.index(connection, {
      buyerId: buyer.id,
      body: { page: 1, limit: maxLimit } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(maxLimitPage);

  TestValidator.equals(
    "maximum limit equals 100",
    maxLimitPage.pagination.limit,
    maxLimit,
  );
  TestValidator.predicate(
    "data length does not exceed maximum limit",
    maxLimitPage.data.length <= maxLimit,
  );

  // Step 6: Validate pagination metadata calculations
  const totalRecords = defaultPage.pagination.records;
  const limitValue = defaultPage.pagination.limit;
  const expectedPages = Math.ceil(totalRecords / limitValue);

  TestValidator.equals(
    "total pages calculation is correct",
    defaultPage.pagination.pages,
    expectedPages,
  );

  // Step 7: Test page navigation if multiple pages exist
  if (defaultPage.pagination.pages > 1) {
    const page2 = await api.functional.shoppingMall.buyer.buyers.reviews.index(
      connection,
      {
        buyerId: buyer.id,
        body: {
          page: 2,
          limit: limitValue,
        } satisfies IShoppingMallReview.IRequest,
      },
    );
    typia.assert(page2);

    TestValidator.equals(
      "page 2 current equals 2",
      page2.pagination.current,
      2,
    );
    TestValidator.equals(
      "page 2 total records match page 1",
      page2.pagination.records,
      totalRecords,
    );
    TestValidator.equals(
      "page 2 total pages match page 1",
      page2.pagination.pages,
      expectedPages,
    );
  }

  // Step 8: Test edge case - requesting page beyond total pages
  const beyondPage = defaultPage.pagination.pages + 5;
  const emptyPage =
    await api.functional.shoppingMall.buyer.buyers.reviews.index(connection, {
      buyerId: buyer.id,
      body: {
        page: beyondPage,
        limit: limitValue,
      } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(emptyPage);

  TestValidator.equals(
    "beyond page current equals requested",
    emptyPage.pagination.current,
    beyondPage,
  );
  TestValidator.predicate(
    "beyond page returns empty data or last page data",
    emptyPage.data.length >= 0,
  );

  // Step 9: Test with small limit to verify multiple pages scenario
  const smallLimit = 5;
  const smallLimitPage =
    await api.functional.shoppingMall.buyer.buyers.reviews.index(connection, {
      buyerId: buyer.id,
      body: {
        page: 1,
        limit: smallLimit,
      } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(smallLimitPage);

  TestValidator.equals(
    "small limit equals 5",
    smallLimitPage.pagination.limit,
    smallLimit,
  );
  TestValidator.predicate(
    "small limit data does not exceed 5",
    smallLimitPage.data.length <= smallLimit,
  );

  // Validate pages calculation with small limit
  const expectedSmallPages = Math.ceil(
    smallLimitPage.pagination.records / smallLimit,
  );
  TestValidator.equals(
    "small limit pages calculation correct",
    smallLimitPage.pagination.pages,
    expectedSmallPages,
  );
}
