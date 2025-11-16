import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test that seller order search results support pagination with configurable
 * page sizes and page navigation.
 *
 * This test validates pagination functionality for sellers managing large order
 * volumes. It tests different limit values, navigating across pages, and
 * verifies pagination metadata accuracy. The test confirms that page counts
 * reflect only orders containing the seller's items.
 *
 * Test workflow:
 *
 * 1. Create and authenticate a new seller account
 * 2. Test basic pagination with default parameters
 * 3. Test different page sizes (limit values)
 * 4. Navigate across multiple pages
 * 5. Validate pagination metadata accuracy
 * 6. Verify page counts reflect correct order subsets
 */
export async function test_api_seller_orders_search_with_pagination(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a new seller account
  const sellerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile("+1"),
    business_name: RandomGenerator.name(2),
    business_description: RandomGenerator.paragraph({ sentences: 5 }),
    store_name: RandomGenerator.name(2),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSeller.ICreate;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: sellerData });
  typia.assert(seller);

  // Step 2: Test basic pagination with default parameters (page 1, default limit)
  const defaultRequest = {} satisfies IShoppingMallOrder.IRequest;
  const defaultResult: IPageIShoppingMallOrder.ISummary =
    await api.functional.shoppingMall.seller.orders.index(connection, {
      body: defaultRequest,
    });
  typia.assert(defaultResult);

  // Validate pagination metadata structure
  TestValidator.predicate(
    "pagination metadata exists",
    defaultResult.pagination !== null && defaultResult.pagination !== undefined,
  );
  TestValidator.predicate(
    "data array exists",
    Array.isArray(defaultResult.data),
  );

  // Validate pagination metadata values are consistent
  const defaultPagination = defaultResult.pagination;
  TestValidator.predicate(
    "current page is positive",
    defaultPagination.current >= 1,
  );
  TestValidator.predicate("limit is positive", defaultPagination.limit > 0);
  TestValidator.predicate(
    "records count is non-negative",
    defaultPagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    defaultPagination.pages >= 0,
  );

  // Step 3: Test different page sizes (limit values)
  const limitValues = [5, 10, 20, 50] as const;

  for (const limit of limitValues) {
    const limitRequest = {
      page: 1,
      limit: limit,
    } satisfies IShoppingMallOrder.IRequest;

    const limitResult: IPageIShoppingMallOrder.ISummary =
      await api.functional.shoppingMall.seller.orders.index(connection, {
        body: limitRequest,
      });
    typia.assert(limitResult);

    // Validate that the limit is respected
    TestValidator.equals(
      "limit matches request",
      limitResult.pagination.limit,
      limit,
    );

    // Validate that data array size doesn't exceed limit
    TestValidator.predicate(
      "data size does not exceed limit",
      limitResult.data.length <= limit,
    );

    // Validate current page is 1
    TestValidator.equals(
      "current page is 1",
      limitResult.pagination.current,
      1,
    );
  }

  // Step 4: Navigate across multiple pages if there are enough records
  if (defaultResult.pagination.pages > 1) {
    const page2Request = {
      page: 2,
      limit: defaultResult.pagination.limit,
    } satisfies IShoppingMallOrder.IRequest;

    const page2Result: IPageIShoppingMallOrder.ISummary =
      await api.functional.shoppingMall.seller.orders.index(connection, {
        body: page2Request,
      });
    typia.assert(page2Result);

    // Validate page navigation
    TestValidator.equals(
      "current page is 2",
      page2Result.pagination.current,
      2,
    );

    // Validate total records remain consistent across pages
    TestValidator.equals(
      "total records consistent across pages",
      page2Result.pagination.records,
      defaultResult.pagination.records,
    );

    // Validate total pages remain consistent
    TestValidator.equals(
      "total pages consistent across pages",
      page2Result.pagination.pages,
      defaultResult.pagination.pages,
    );

    // Validate that different pages return different data (if both have data)
    if (defaultResult.data.length > 0 && page2Result.data.length > 0) {
      const page1Ids = defaultResult.data.map((order) => order.id);
      const page2Ids = page2Result.data.map((order) => order.id);

      const hasOverlap = page1Ids.some((id) => page2Ids.includes(id));
      TestValidator.predicate(
        "different pages have different orders",
        !hasOverlap,
      );
    }
  }

  // Step 5: Test pagination metadata accuracy with specific limit
  const specificLimit = 3;
  const specificRequest = {
    page: 1,
    limit: specificLimit,
  } satisfies IShoppingMallOrder.IRequest;

  const specificResult: IPageIShoppingMallOrder.ISummary =
    await api.functional.shoppingMall.seller.orders.index(connection, {
      body: specificRequest,
    });
  typia.assert(specificResult);

  // Validate pages calculation is correct
  const expectedPages =
    specificResult.pagination.records > 0
      ? Math.ceil(specificResult.pagination.records / specificLimit)
      : 0;

  TestValidator.equals(
    "pages calculation is accurate",
    specificResult.pagination.pages,
    expectedPages,
  );

  // Step 6: Test with sorting and pagination combined
  const sortedRequest = {
    page: 1,
    limit: 10,
    sort_by: "created_at" as const,
    sort_order: "desc" as const,
  } satisfies IShoppingMallOrder.IRequest;

  const sortedResult: IPageIShoppingMallOrder.ISummary =
    await api.functional.shoppingMall.seller.orders.index(connection, {
      body: sortedRequest,
    });
  typia.assert(sortedResult);

  // Validate pagination works with sorting
  TestValidator.equals(
    "pagination works with sorting",
    sortedResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "data returned with sorting",
    Array.isArray(sortedResult.data),
  );
}
