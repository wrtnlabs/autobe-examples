import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPayment";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";

/**
 * Test payment search functionality with specific status filtering.
 *
 * Customer creates an order and tests the payment search API with various
 * status filters. Validates that the search operation correctly handles status
 * filtering parameters and returns proper pagination structure. The test
 * focuses on the search API's capability to filter by status using the
 * available payment data in the system.
 */
export async function test_api_customer_order_payment_search_filtered_by_status(
  connection: api.IConnection,
) {
  // 1. Create customer account for authentication
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "password123",
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        phone_number: RandomGenerator.mobile(),
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // 2. Create a base order for payment operations
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: {
        currency: "USD",
        shipping_address: RandomGenerator.paragraph({ sentences: 3 }),
        billing_address: RandomGenerator.paragraph({ sentences: 3 }),
        items: ArrayUtil.repeat(
          2,
          () =>
            ({
              shopping_mall_product_variant_id: typia.random<
                string & tags.Format<"uuid">
              >(),
              quantity: typia.random<
                number & tags.Type<"int32"> & tags.Minimum<1>
              >(),
            }) satisfies IShoppingMallOrderItem.ICreate,
        ),
      } satisfies IShoppingMallOrder.ICreate,
    });
  typia.assert(order);

  // 3. Test search with different status filters using available status values
  const validStatuses = [
    "pending",
    "authorized",
    "captured",
    "declined",
    "refunded",
    "disputed",
    "chargeback",
  ] as const;

  for (const status of validStatuses) {
    // Search for payments with specific status
    const searchResult: IPageIShoppingMallPayment.ISummary =
      await api.functional.shopping_mall.customer.orders.payments.index(
        connection,
        {
          orderId: order.id,
          body: {
            page: 1,
            limit: 10,
            status: status,
          } satisfies IShoppingMallPayment.IRequest,
        },
      );
    typia.assert(searchResult);

    // Validate pagination structure
    TestValidator.equals(
      `pagination structure for ${status} search`,
      searchResult.pagination,
      {
        current: 1,
        limit: 10,
        records: searchResult.pagination.records,
        pages: searchResult.pagination.pages,
      } satisfies IPage.IPagination,
    );

    // Validate that all returned payments have consistent status (if any exist)
    if (searchResult.data.length > 0) {
      TestValidator.predicate(
        `all payments in ${status} search result have consistent status`,
        searchResult.data.every((payment) => payment.status === status),
      );
    }

    // Validate pagination properties
    TestValidator.predicate(
      `pagination current page is 1 for ${status} search`,
      searchResult.pagination.current === 1,
    );
    TestValidator.predicate(
      `pagination limit is 10 for ${status} search`,
      searchResult.pagination.limit === 10,
    );
    TestValidator.predicate(
      `pagination records count matches data length for ${status} search`,
      searchResult.pagination.records === searchResult.data.length,
    );
  }

  // 4. Test search without status filter (should return all payments)
  const allPaymentsResult: IPageIShoppingMallPayment.ISummary =
    await api.functional.shopping_mall.customer.orders.payments.index(
      connection,
      {
        orderId: order.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallPayment.IRequest,
      },
    );
  typia.assert(allPaymentsResult);

  // Validate that unfiltered search returns valid pagination
  TestValidator.equals(
    "pagination structure for unfiltered search",
    allPaymentsResult.pagination,
    {
      current: 1,
      limit: 10,
      records: allPaymentsResult.pagination.records,
      pages: allPaymentsResult.pagination.pages,
    } satisfies IPage.IPagination,
  );

  // 5. Test pagination with different page and limit values
  const paginationTest =
    await api.functional.shopping_mall.customer.orders.payments.index(
      connection,
      {
        orderId: order.id,
        body: {
          page: 2,
          limit: 5,
        } satisfies IShoppingMallPayment.IRequest,
      },
    );
  typia.assert(paginationTest);

  TestValidator.equals(
    "pagination with page 2 and limit 5",
    paginationTest.pagination,
    {
      current: 2,
      limit: 5,
      records: paginationTest.pagination.records,
      pages: paginationTest.pagination.pages,
    } satisfies IPage.IPagination,
  );

  // 6. Test search with additional filtering parameters
  const comprehensiveSearch =
    await api.functional.shopping_mall.customer.orders.payments.index(
      connection,
      {
        orderId: order.id,
        body: {
          page: 1,
          limit: 10,
          status: "pending",
          payment_method: "credit_card",
          order_by: "created_at",
          order_direction: "desc",
        } satisfies IShoppingMallPayment.IRequest,
      },
    );
  typia.assert(comprehensiveSearch);

  TestValidator.equals(
    "comprehensive search returns valid pagination",
    comprehensiveSearch.pagination,
    {
      current: 1,
      limit: 10,
      records: comprehensiveSearch.pagination.records,
      pages: comprehensiveSearch.pagination.pages,
    } satisfies IPage.IPagination,
  );
}
