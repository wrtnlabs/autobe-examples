import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";

/**
 * Test successful order retrieval by the customer who placed the order.
 *
 * This E2E test validates the complete customer order workflow: customer
 * account creation, order placement, and subsequent order retrieval. The test
 * ensures that authenticated customers can access their own order details
 * including customer information, order items, pricing breakdown, and status
 * information.
 */
export async function test_api_customer_order_retrieval_by_owner(
  connection: api.IConnection,
) {
  // Step 1: Create customer account for authentication
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "TestPassword123!";

  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      phone_number: RandomGenerator.mobile(),
      href: "https://shoppingmall.example.com/register",
      referrer: "https://shoppingmall.example.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Step 2: Create order with realistic data
  const orderData = {
    currency: "USD",
    shipping_address: `${RandomGenerator.name(1)} ${RandomGenerator.name(1)}, ${RandomGenerator.name(1)} Street, ${RandomGenerator.name(1)} City, ${RandomGenerator.alphabets(2).toUpperCase()} ${typia.random<number & tags.Type<"uint32"> & tags.Minimum<10000> & tags.Maximum<99999>>()}`,
    billing_address: `${RandomGenerator.name(1)} ${RandomGenerator.name(1)}, ${RandomGenerator.name(1)} Avenue, ${RandomGenerator.name(1)} City, ${RandomGenerator.alphabets(2).toUpperCase()} ${typia.random<number & tags.Type<"uint32"> & tags.Minimum<10000> & tags.Maximum<99999>>()}`,
    items: ArrayUtil.repeat(
      typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
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
  } satisfies IShoppingMallOrder.ICreate;

  const createdOrder = await api.functional.shoppingMall.customer.orders.create(
    connection,
    { body: orderData },
  );
  typia.assert(createdOrder);

  // Step 3: Retrieve the order by the customer who created it
  const retrievedOrder = await api.functional.shoppingMall.customer.orders.at(
    connection,
    { orderId: createdOrder.id },
  );
  typia.assert(retrievedOrder);

  // Step 4: Validate that retrieved order matches created order
  TestValidator.equals(
    "order ID should match",
    retrievedOrder.id,
    createdOrder.id,
  );
  TestValidator.equals(
    "order number should match",
    retrievedOrder.order_number,
    createdOrder.order_number,
  );
  TestValidator.equals(
    "total amount should match",
    retrievedOrder.total_amount,
    createdOrder.total_amount,
  );
  TestValidator.equals(
    "subtotal amount should match",
    retrievedOrder.subtotal_amount,
    createdOrder.subtotal_amount,
  );
  TestValidator.equals(
    "tax amount should match",
    retrievedOrder.tax_amount,
    createdOrder.tax_amount,
  );
  TestValidator.equals(
    "shipping amount should match",
    retrievedOrder.shipping_amount,
    createdOrder.shipping_amount,
  );
  TestValidator.equals(
    "currency should match",
    retrievedOrder.currency,
    createdOrder.currency,
  );
  TestValidator.equals(
    "status should match",
    retrievedOrder.status,
    createdOrder.status,
  );
  TestValidator.equals(
    "shipping address should match",
    retrievedOrder.shipping_address,
    createdOrder.shipping_address,
  );
  TestValidator.equals(
    "billing address should match",
    retrievedOrder.billing_address,
    createdOrder.billing_address,
  );

  // Validate customer information in the retrieved order
  TestValidator.equals(
    "customer ID should match",
    retrievedOrder.customer.id,
    customer.id,
  );
  TestValidator.equals(
    "customer email should match",
    retrievedOrder.customer.email,
    customer.email,
  );
  TestValidator.equals(
    "customer first name should match",
    retrievedOrder.customer.first_name,
    customer.first_name,
  );
  TestValidator.equals(
    "customer last name should match",
    retrievedOrder.customer.last_name,
    customer.last_name,
  );
  TestValidator.equals(
    "customer status should match",
    retrievedOrder.customer.status,
    customer.status,
  );

  // Validate customer session information
  TestValidator.predicate(
    "customer session should have valid ID",
    retrievedOrder.customerSession.id !== null &&
      retrievedOrder.customerSession.id !== undefined,
  );
  TestValidator.predicate(
    "customer session should have creation timestamp",
    retrievedOrder.customerSession.created_at !== null &&
      retrievedOrder.customerSession.created_at !== undefined,
  );

  // Validate order timestamps
  TestValidator.predicate(
    "order should have creation timestamp",
    retrievedOrder.created_at !== null &&
      retrievedOrder.created_at !== undefined,
  );
  TestValidator.predicate(
    "order should have update timestamp",
    retrievedOrder.updated_at !== null &&
      retrievedOrder.updated_at !== undefined,
  );
}
