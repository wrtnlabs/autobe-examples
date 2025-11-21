import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSale";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Comprehensive E2E test for seller sales search and filtering functionality.
 *
 * Validates that sellers can search, filter, and paginate through their sales
 * transactions using various criteria. Focuses on API contract validation
 * including proper pagination metadata, filtering parameters, and response
 * structure when sales data may or may not exist.
 */
export async function test_api_seller_sales_search_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create seller account for authentication
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: "seller_password_123",
      business_name: RandomGenerator.paragraph({ sentences: 3 }),
      contact_person: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_address: RandomGenerator.paragraph({ sentences: 5 }),
      tax_id: undefined,
      ip: undefined,
      href: "https://shoppingmall.example.com/seller/dashboard",
      referrer: "https://shoppingmall.example.com/seller/registration",
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 2: Test basic pagination with empty results
  const firstPage = await api.functional.shoppingMall.seller.sales.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallSale.IRequest,
    },
  );
  typia.assert(firstPage);

  // Validate pagination structure regardless of data existence
  TestValidator.equals(
    "pagination current page should match request",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "page limit should match request",
    firstPage.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "total records should be non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages should be non-negative",
    firstPage.pagination.pages >= 0,
  );

  // Step 3: Test status filtering API contract
  const statuses = ["completed", "refunded", "disputed"] as const;
  for (const status of statuses) {
    const filteredByStatus =
      await api.functional.shoppingMall.seller.sales.index(connection, {
        body: {
          page: 1,
          limit: 5,
          sale_status: status,
        } satisfies IShoppingMallSale.IRequest,
      });
    typia.assert(filteredByStatus);

    // Validate API response structure without assuming data exists
    TestValidator.predicate(
      "status filtered response should have valid pagination",
      filteredByStatus.pagination.current === 1 &&
        filteredByStatus.pagination.limit === 5,
    );
  }

  // Step 4: Test amount range filtering API contract
  const amountFiltered = await api.functional.shoppingMall.seller.sales.index(
    connection,
    {
      body: {
        page: 1,
        limit: 5,
        min_amount: 100,
        max_amount: 1000,
      } satisfies IShoppingMallSale.IRequest,
    },
  );
  typia.assert(amountFiltered);

  // Validate response structure
  TestValidator.predicate(
    "amount filtered response should be valid",
    Array.isArray(amountFiltered.data),
  );

  // Step 5: Test commission rate filtering API contract
  const commissionFiltered =
    await api.functional.shoppingMall.seller.sales.index(connection, {
      body: {
        page: 1,
        limit: 5,
        min_commission_rate: 5,
        max_commission_rate: 15,
      } satisfies IShoppingMallSale.IRequest,
    });
  typia.assert(commissionFiltered);

  // Step 6: Test date range filtering API contract
  const startDate = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 30 days ago
  const endDate = new Date().toISOString(); // now

  const dateFiltered = await api.functional.shoppingMall.seller.sales.index(
    connection,
    {
      body: {
        page: 1,
        limit: 5,
        start_date: startDate,
        end_date: endDate,
      } satisfies IShoppingMallSale.IRequest,
    },
  );
  typia.assert(dateFiltered);

  // Step 7: Test sorting options API contract
  const sortFields = [
    "sale_date",
    "sale_amount",
    "item_count",
    "commission_rate",
    "net_amount",
  ] as const;
  const sortDirections = ["asc", "desc"] as const;

  for (const field of sortFields) {
    for (const direction of sortDirections) {
      const sortedResults =
        await api.functional.shoppingMall.seller.sales.index(connection, {
          body: {
            page: 1,
            limit: 5,
            order_by: field,
            order_direction: direction,
          } satisfies IShoppingMallSale.IRequest,
        });
      typia.assert(sortedResults);

      // Validate API response structure
      TestValidator.predicate(
        `sorting by ${field} ${direction} should return valid response`,
        sortedResults.pagination.current === 1 &&
          sortedResults.pagination.limit === 5,
      );
    }
  }

  // Step 8: Test search functionality API contract
  const searchTest = await api.functional.shoppingMall.seller.sales.index(
    connection,
    {
      body: {
        page: 1,
        limit: 5,
        search: "test",
      } satisfies IShoppingMallSale.IRequest,
    },
  );
  typia.assert(searchTest);

  // Step 9: Test complex combined filtering API contract
  const complexFilter = await api.functional.shoppingMall.seller.sales.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        sale_status: "completed",
        min_amount: 50,
        max_amount: 500,
        min_commission_rate: 2,
        max_commission_rate: 20,
        start_date: startDate,
        end_date: endDate,
        order_by: "sale_date",
        order_direction: "desc",
      } satisfies IShoppingMallSale.IRequest,
    },
  );
  typia.assert(complexFilter);

  // Step 10: Test pagination boundaries
  const largePage = await api.functional.shoppingMall.seller.sales.index(
    connection,
    {
      body: {
        page: 1000, // Large page number
        limit: 5,
      } satisfies IShoppingMallSale.IRequest,
    },
  );
  typia.assert(largePage);
  TestValidator.predicate(
    "large page number should handle gracefully",
    largePage.pagination.current === 1000,
  );

  // Step 11: Test maximum limit
  const maxLimit = await api.functional.shoppingMall.seller.sales.index(
    connection,
    {
      body: {
        page: 1,
        limit: 100, // Maximum allowed limit
      } satisfies IShoppingMallSale.IRequest,
    },
  );
  typia.assert(maxLimit);
  TestValidator.equals(
    "maximum limit should be respected",
    maxLimit.pagination.limit,
    100,
  );

  // Step 12: Test minimum page validation
  const minPage = await api.functional.shoppingMall.seller.sales.index(
    connection,
    {
      body: {
        page: 1, // Minimum page number
        limit: 5,
      } satisfies IShoppingMallSale.IRequest,
    },
  );
  typia.assert(minPage);
  TestValidator.equals(
    "minimum page should be accepted",
    minPage.pagination.current,
    1,
  );
}
