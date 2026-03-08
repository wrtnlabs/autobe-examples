import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCheckout";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_addresses_create } from "../../../generate/generate_random_shopping_mall_customer_addresses_create";
import { generate_random_shopping_mall_customer_checkout_create } from "../../../generate/generate_random_shopping_mall_customer_checkout_create";
import { prepare_random_shopping_mall_address } from "../../../prepare/prepare_random_shopping_mall_address";
import { prepare_random_shopping_mall_checkout } from "../../../prepare/prepare_random_shopping_mall_checkout";

/**
 * Test that an authenticated customer can successfully retrieve details of
 * their own order.
 *
 * Workflow:
 * 1. Customer authenticates via join
 * 2. Customer creates a shipping address
 * 3. Customer completes checkout to create an order
 * 4. Customer retrieves the order by orderId
 */
export async function test_api_order_detail_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Create customer-specific connection
  const customerConnection: api.IConnection = { host: connection.host };
  // Step 1: Customer authentication via join
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // Step 2: Create shipping address
  const address = await generate_random_shopping_mall_customer_addresses_create(
    customerConnection,
    {},
  );
  typia.assert(address);
  // Step 3: Complete checkout to create order
  const order = await generate_random_shopping_mall_customer_checkout_create(
    customerConnection,
    { body: { address_id: address.id } },
  );
  typia.assert(order);
  // Step 4: Retrieve order details by orderId
  const retrievedOrder = await api.functional.shoppingMall.customer.orders.at(
    customerConnection,
    { orderId: order.id },
  );
  typia.assert(retrievedOrder);
  // Validate order properties
  TestValidator.predicate(
    "order number exists",
    retrievedOrder.orderNumber.length > 0,
  );
  TestValidator.predicate(
    "total price is non-negative",
    retrievedOrder.totalPrice >= 0,
  );
  TestValidator.equals("order status is paid", retrievedOrder.status, "paid");
  // Validate shipping address snapshot matches the created address
  TestValidator.equals(
    "shipping recipient name",
    retrievedOrder.shippingRecipientName,
    address.recipientName,
  );
  TestValidator.equals(
    "shipping phone number",
    retrievedOrder.shippingPhoneNumber,
    address.phoneNumber,
  );
  TestValidator.equals(
    "shipping street address",
    retrievedOrder.shippingStreetAddress,
    address.streetAddress,
  );
  TestValidator.equals(
    "shipping city",
    retrievedOrder.shippingCity,
    address.city,
  );
  TestValidator.equals(
    "shipping state province",
    retrievedOrder.shippingStateProvince,
    address.stateProvince,
  );
  TestValidator.equals(
    "shipping postal code",
    retrievedOrder.shippingPostalCode,
    address.postalCode,
  );
  TestValidator.equals(
    "shipping country",
    retrievedOrder.shippingCountry,
    address.country,
  );
  // Validate customer reference
  TestValidator.predicate(
    "customer exists on order",
    retrievedOrder.customer !== null,
  );
  if (retrievedOrder.customer !== null) {
    TestValidator.equals(
      "customer id matches",
      retrievedOrder.customer.id,
      customer.id,
    );
  }
}
