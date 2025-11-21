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
 * Test order creation with only the required fields to ensure minimum viable
 * order creation works correctly. Customer creates account, then places an
 * order with minimal information - only currency, addresses, and a single item
 * with quantity. Validate that system generates missing fields like order
 * number and calculates pricing correctly.
 */
export async function test_api_customer_order_creation_minimal_required(
  connection: api.IConnection,
) {
  // Step 1: Create customer account for authentication
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(12);

  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      first_name: RandomGenerator.name(),
      last_name: RandomGenerator.name(),
      href: "https://shoppingmall.example.com/register",
      referrer: "https://shoppingmall.example.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Step 2: Create minimal order with only required fields
  const currencies = ["USD", "EUR", "KRW", "JPY", "GBP"] as const;
  const selectedCurrency = RandomGenerator.pick(currencies);
  const productVariantId = typia.random<string & tags.Format<"uuid">>();
  const itemQuantity = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
  >();

  const orderData = {
    currency: selectedCurrency,
    shipping_address: "123 Main St, Anytown, CA 12345, United States",
    billing_address: "123 Main St, Anytown, CA 12345, United States",
    items: [
      {
        shopping_mall_product_variant_id: productVariantId,
        quantity: itemQuantity,
      } satisfies IShoppingMallOrderItem.ICreate,
    ],
  } satisfies IShoppingMallOrder.ICreate;

  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    {
      body: orderData,
    },
  );
  typia.assert(order);

  // Step 3: Validate system-generated fields
  TestValidator.equals(
    "order should have generated order number",
    typeof order.order_number,
    "string",
  );
  TestValidator.predicate(
    "order number should not be empty",
    order.order_number.length > 0,
  );

  TestValidator.predicate(
    "total amount should be calculated",
    order.total_amount >= 0,
  );
  TestValidator.predicate(
    "subtotal amount should be calculated",
    order.subtotal_amount >= 0,
  );
  TestValidator.predicate(
    "tax amount should be calculated",
    order.tax_amount >= 0,
  );
  TestValidator.predicate(
    "shipping amount should be calculated",
    order.shipping_amount >= 0,
  );

  TestValidator.equals(
    "currency should match input",
    order.currency,
    selectedCurrency,
  );
  TestValidator.equals(
    "shipping address should match input",
    order.shipping_address,
    orderData.shipping_address,
  );
  TestValidator.equals(
    "billing address should match input",
    order.billing_address,
    orderData.billing_address,
  );

  TestValidator.predicate(
    "order should have valid status",
    order.status.length > 0,
  );
  TestValidator.predicate(
    "order should have creation timestamp",
    order.created_at.length > 0,
  );
  TestValidator.predicate(
    "order should have update timestamp",
    order.updated_at.length > 0,
  );

  // Step 4: Validate customer relationship
  TestValidator.equals(
    "customer ID should match authenticated customer",
    order.customer.id,
    customer.id,
  );
  TestValidator.equals(
    "customer email should match",
    order.customer.email,
    customer.email,
  );
  TestValidator.equals(
    "customer first name should match",
    order.customer.first_name,
    customer.first_name,
  );
  TestValidator.equals(
    "customer last name should match",
    order.customer.last_name,
    customer.last_name,
  );

  // Step 5: Validate session relationship
  TestValidator.predicate(
    "order should have customer session",
    order.customerSession.id.length > 0,
  );
  TestValidator.predicate(
    "customer session should have creation timestamp",
    order.customerSession.created_at.length > 0,
  );

  // Step 6: Validate order items preservation (indirect validation through successful creation)
  TestValidator.predicate(
    "order creation should succeed with minimal required fields",
    order.id.length > 0,
  );
}
