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
 * Test comprehensive payment search functionality for customer orders.
 *
 * This test validates that customers can search and filter payment records
 * associated with their orders using various criteria including pagination,
 * status filtering, payment method filtering, date ranges, and transaction
 * details. The test ensures proper authorization checks so customers can only
 * access payment information for their own orders.
 *
 * Business workflow:
 *
 * 1. Create new customer account for authentication context
 * 2. Create order with items to have payment information to search
 * 3. Perform payment search operations with different filtering parameters
 * 4. Verify search functionality works correctly with various criteria
 * 5. Test authorization boundaries and error scenarios
 */
export async function test_api_customer_order_payment_search(
  connection: api.IConnection,
) {
  // 1. Create new customer account for authentication context
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: "testPassword123",
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      phone_number: RandomGenerator.mobile(),
      href: "https://shoppingmall.example.com/register",
      referrer: "https://shoppingmall.example.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // 2. Create order with items to have payment information to search
  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    {
      body: {
        currency: "USD",
        shipping_address: "123 Main St, City, State 12345",
        billing_address: "123 Main St, City, State 12345",
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
    },
  );
  typia.assert(order);

  // 3. Perform payment search operations with different filtering parameters

  // Test basic pagination search
  const basicSearch =
    await api.functional.shoppingMall.customer.orders.payments.index(
      connection,
      {
        orderId: order.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallPayment.IRequest,
      },
    );
  typia.assert(basicSearch);
  TestValidator.equals(
    "pagination should return valid structure",
    basicSearch.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should match request",
    basicSearch.pagination.limit,
    10,
  );

  // Test search with status filtering
  const statusSearch =
    await api.functional.shoppingMall.customer.orders.payments.index(
      connection,
      {
        orderId: order.id,
        body: {
          page: 1,
          limit: 10,
          status: "pending",
        } satisfies IShoppingMallPayment.IRequest,
      },
    );
  typia.assert(statusSearch);

  // Test search with payment method filtering
  const methodSearch =
    await api.functional.shoppingMall.customer.orders.payments.index(
      connection,
      {
        orderId: order.id,
        body: {
          page: 1,
          limit: 10,
          payment_method: "credit_card",
        } satisfies IShoppingMallPayment.IRequest,
      },
    );
  typia.assert(methodSearch);

  // Test search with date range filtering
  const dateSearch =
    await api.functional.shoppingMall.customer.orders.payments.index(
      connection,
      {
        orderId: order.id,
        body: {
          page: 1,
          limit: 10,
          date_from: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
          date_to: new Date().toISOString(),
        } satisfies IShoppingMallPayment.IRequest,
      },
    );
  typia.assert(dateSearch);

  // Test search with sorting
  const sortedSearch =
    await api.functional.shoppingMall.customer.orders.payments.index(
      connection,
      {
        orderId: order.id,
        body: {
          page: 1,
          limit: 10,
          order_by: "created_at",
          order_direction: "desc",
        } satisfies IShoppingMallPayment.IRequest,
      },
    );
  typia.assert(sortedSearch);

  // Test search with multiple parameters combined
  const combinedSearch =
    await api.functional.shoppingMall.customer.orders.payments.index(
      connection,
      {
        orderId: order.id,
        body: {
          page: 1,
          limit: 5,
          status: "pending",
          payment_method: "credit_card",
          order_by: "amount",
          order_direction: "asc",
        } satisfies IShoppingMallPayment.IRequest,
      },
    );
  typia.assert(combinedSearch);

  // 4. Test authorization boundaries - attempt to search payments for non-existent order
  await TestValidator.error(
    "should fail when searching payments for non-existent order",
    async () => {
      await api.functional.shoppingMall.customer.orders.payments.index(
        connection,
        {
          orderId: typia.random<string & tags.Format<"uuid">>(), // Random UUID that doesn't exist
          body: {
            page: 1,
            limit: 10,
          } satisfies IShoppingMallPayment.IRequest,
        },
      );
    },
  );

  // 5. Test search with extreme date ranges (empty result scenario)
  const emptyResultSearch =
    await api.functional.shoppingMall.customer.orders.payments.index(
      connection,
      {
        orderId: order.id,
        body: {
          page: 1,
          limit: 10,
          date_from: new Date(Date.now() + 86400000).toISOString(), // Future date
          date_to: new Date(Date.now() + 172800000).toISOString(), // Further future date
        } satisfies IShoppingMallPayment.IRequest,
      },
    );
  typia.assert(emptyResultSearch);
  TestValidator.equals(
    "future date search should return empty data array",
    emptyResultSearch.data.length,
    0,
  );

  // 6. Verify search functionality works correctly
  TestValidator.predicate(
    "search results should contain pagination info",
    basicSearch.pagination !== undefined,
  );
  TestValidator.predicate(
    "search results should contain data array",
    Array.isArray(basicSearch.data),
  );
  TestValidator.predicate(
    "pagination should have valid record count",
    basicSearch.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination should have valid page count",
    basicSearch.pagination.pages >= 0,
  );
}
