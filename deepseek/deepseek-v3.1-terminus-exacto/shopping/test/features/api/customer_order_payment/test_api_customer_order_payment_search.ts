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
 * Test customer's ability to search and retrieve payment information for their
 * orders.
 *
 * This E2E test validates the complete payment search workflow including
 * customer authentication, order creation, and comprehensive payment search
 * functionality with various filtering criteria. The test ensures that
 * customers can only access their own payment information and that search
 * results are properly filtered and paginated according to the request
 * parameters.
 */
export async function test_api_customer_order_payment_search(
  connection: api.IConnection,
) {
  // 1. Customer registration and authentication
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "testPassword123";

  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      phone_number: RandomGenerator.mobile(),
      href: "https://shopping-mall.com/register",
      referrer: "https://shopping-mall.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // 2. Create an order that will have associated payments for searching
  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    {
      body: {
        currency: "USD",
        shipping_address: `${RandomGenerator.name(1)} ${RandomGenerator.name(1)}, 123 Main St, City, State 12345`,
        billing_address: `${RandomGenerator.name(1)} ${RandomGenerator.name(1)}, 123 Main St, City, State 12345`,
        items: ArrayUtil.repeat(
          typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<3>
          >(),
          () =>
            ({
              shopping_mall_product_variant_id: typia.random<
                string & tags.Format<"uuid">
              >(),
              quantity: typia.random<
                number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
              >(),
            }) satisfies IShoppingMallOrderItem.ICreate,
        ),
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);

  // 3. Test basic pagination search
  const basicSearchResult =
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
  typia.assert(basicSearchResult);
  TestValidator.equals(
    "pagination current page should be 1",
    1,
    basicSearchResult.pagination.current,
  );
  TestValidator.equals(
    "pagination limit should match request",
    10,
    basicSearchResult.pagination.limit,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    basicSearchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    basicSearchResult.pagination.pages >= 0,
  );

  // 4. Test status-based filtering
  const statusFilterResult =
    await api.functional.shopping_mall.customer.orders.payments.index(
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
  typia.assert(statusFilterResult);

  // 5. Test payment method filtering
  const methodFilterResult =
    await api.functional.shopping_mall.customer.orders.payments.index(
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
  typia.assert(methodFilterResult);

  // 6. Test date range filtering
  const currentDate = new Date();
  const oneWeekAgo = new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000);

  const dateFilterResult =
    await api.functional.shopping_mall.customer.orders.payments.index(
      connection,
      {
        orderId: order.id,
        body: {
          page: 1,
          limit: 10,
          date_from: oneWeekAgo.toISOString(),
          date_to: currentDate.toISOString(),
        } satisfies IShoppingMallPayment.IRequest,
      },
    );
  typia.assert(dateFilterResult);

  // 7. Test search query functionality
  const searchQueryResult =
    await api.functional.shopping_mall.customer.orders.payments.index(
      connection,
      {
        orderId: order.id,
        body: {
          page: 1,
          limit: 10,
          search: "TXN",
        } satisfies IShoppingMallPayment.IRequest,
      },
    );
  typia.assert(searchQueryResult);

  // 8. Test sorting functionality
  const sortedResult =
    await api.functional.shopping_mall.customer.orders.payments.index(
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
  typia.assert(sortedResult);

  // 9. Validate that response data structure is correct
  if (basicSearchResult.data.length > 0) {
    const payment = basicSearchResult.data[0];
    TestValidator.equals(
      "payment ID should be string",
      "string",
      typeof payment.id,
    );
    TestValidator.equals(
      "payment order ID should match created order",
      order.id,
      payment.order.id,
    );
    TestValidator.equals(
      "payment amount should be number",
      "number",
      typeof payment.amount,
    );
    TestValidator.equals(
      "payment currency should be string",
      "string",
      typeof payment.currency,
    );
    TestValidator.equals(
      "payment status should be string",
      "string",
      typeof payment.status,
    );
    TestValidator.equals(
      "payment method should be string",
      "string",
      typeof payment.payment_method,
    );
    TestValidator.equals(
      "payment gateway should be string",
      "string",
      typeof payment.payment_gateway,
    );
    TestValidator.equals(
      "payment transaction ID should be string",
      "string",
      typeof payment.transaction_id,
    );
    TestValidator.predicate(
      "payment created_at should be valid date string",
      typeof payment.created_at === "string",
    );
    TestValidator.predicate(
      "payment updated_at should be valid date string",
      typeof payment.updated_at === "string",
    );
  }

  // 10. Test access control - customer should only access their own orders
  // Create a second customer and attempt to access first customer's order
  const secondCustomerEmail = typia.random<string & tags.Format<"email">>();

  const secondCustomer = await api.functional.auth.customer.join(
    { ...connection, headers: {} },
    {
      body: {
        email: secondCustomerEmail,
        password: "secondPassword123",
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        phone_number: RandomGenerator.mobile(),
        href: "https://shopping-mall.com/register",
        referrer: "https://shopping-mall.com",
      } satisfies IShoppingMallCustomer.ICreate,
    },
  );
  typia.assert(secondCustomer);

  // Attempt to access first customer's order with second customer's credentials
  // This should fail due to access control
  await TestValidator.error(
    "second customer should not access first customer's order payments",
    async () => {
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
    },
  );
}
