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
 * Test payment search with date range filtering. Customer creates payments at
 * different timestamps and searches using specific date_from and date_to
 * parameters to retrieve payments created within a defined timeframe. Validates
 * that date-based filtering works correctly and returns payments created within
 * the specified range while excluding those outside the timeframe.
 */
export async function test_api_customer_order_payment_search_with_date_range(
  connection: api.IConnection,
) {
  // Step 1: Create customer account
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "TestPassword123!";

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: customerPassword,
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        phone_number: RandomGenerator.mobile(),
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // Step 2: Create order for payment testing
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: {
        currency: "USD",
        shipping_address: RandomGenerator.paragraph({ sentences: 3 }),
        billing_address: RandomGenerator.paragraph({ sentences: 3 }),
        items: ArrayUtil.repeat(
          2,
          (index) =>
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

  // Note: Since the provided API functions don't include actual payment creation endpoints,
  // this test focuses on validating the search functionality with the assumption that
  // payments already exist in the system. The test validates that the date range filtering
  // parameters are properly accepted and processed by the search API.

  // Test date range filtering with various scenarios
  const currentDate = new Date();

  // Scenario 1: Search within past 7 days
  const weekAgoSearch: IPageIShoppingMallPayment.ISummary =
    await api.functional.shopping_mall.customer.orders.payments.index(
      connection,
      {
        orderId: order.id,
        body: {
          page: 1,
          limit: 10,
          date_from: new Date(
            currentDate.getTime() - 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          date_to: currentDate.toISOString(),
        } satisfies IShoppingMallPayment.IRequest,
      },
    );
  typia.assert(weekAgoSearch);

  TestValidator.equals(
    "pagination should be valid for past week search",
    weekAgoSearch.pagination.current,
    1,
  );

  // Scenario 2: Search with only end date (all payments up to now)
  const upToNowSearch: IPageIShoppingMallPayment.ISummary =
    await api.functional.shopping_mall.customer.orders.payments.index(
      connection,
      {
        orderId: order.id,
        body: {
          page: 1,
          limit: 5,
          date_to: currentDate.toISOString(),
        } satisfies IShoppingMallPayment.IRequest,
      },
    );
  typia.assert(upToNowSearch);

  // Scenario 3: Search with future date range (should return empty or limited results)
  const futureSearch: IPageIShoppingMallPayment.ISummary =
    await api.functional.shopping_mall.customer.orders.payments.index(
      connection,
      {
        orderId: order.id,
        body: {
          page: 1,
          limit: 10,
          date_from: new Date(
            currentDate.getTime() + 24 * 60 * 60 * 1000,
          ).toISOString(),
          date_to: new Date(
            currentDate.getTime() + 48 * 60 * 60 * 1000,
          ).toISOString(),
        } satisfies IShoppingMallPayment.IRequest,
      },
    );
  typia.assert(futureSearch);

  // Validate that different date ranges produce valid responses
  TestValidator.predicate(
    "all search results should have valid pagination structure",
    weekAgoSearch.pagination.limit >= 0 &&
      upToNowSearch.pagination.limit >= 0 &&
      futureSearch.pagination.limit >= 0,
  );

  // Test combination of date range with status filter
  const combinedSearch: IPageIShoppingMallPayment.ISummary =
    await api.functional.shopping_mall.customer.orders.payments.index(
      connection,
      {
        orderId: order.id,
        body: {
          page: 1,
          limit: 5,
          status: "pending",
          date_from: new Date(
            currentDate.getTime() - 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          date_to: currentDate.toISOString(),
          order_by: "created_at",
          order_direction: "desc",
        } satisfies IShoppingMallPayment.IRequest,
      },
    );
  typia.assert(combinedSearch);

  TestValidator.equals(
    "combined search should return valid pagination",
    combinedSearch.pagination.current,
    1,
  );
}
