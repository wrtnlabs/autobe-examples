import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
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
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";

export async function test_api_checkout_success_with_valid_cart(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // 2. Create a shipping address for the customer
  const address = await generate_random_shopping_mall_customer_addresses_create(
    customerConnection,
    {},
  );
  typia.assert(address);
  // 3. Call checkout endpoint with the created addressId
  const order = await api.functional.shoppingMall.customer.checkout.create(
    customerConnection,
    {
      body: { addressId: address.id } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // 4. Verify response contains order with generated orderNumber
  TestValidator.predicate(
    "orderNumber is non-empty string",
    order.orderNumber.length > 0,
  );
  // 5. Verify order status is 'paid'
  TestValidator.equals("order status is paid", order.status, "paid");
  // 6. Verify totalPrice is a non-negative number
  TestValidator.predicate("totalPrice is non-negative", order.totalPrice >= 0);
  // 7. Verify shipping address fields are captured on the order
  TestValidator.equals(
    "shipping recipient name matches",
    order.shippingRecipientName,
    address.recipientName,
  );
  TestValidator.equals(
    "shipping phone number matches",
    order.shippingPhoneNumber,
    address.phoneNumber,
  );
  TestValidator.equals(
    "shipping street address matches",
    order.shippingStreetAddress,
    address.streetAddress,
  );
  TestValidator.equals(
    "shipping city matches",
    order.shippingCity,
    address.city,
  );
  TestValidator.equals(
    "shipping state province matches",
    order.shippingStateProvince,
    address.stateProvince,
  );
  TestValidator.equals(
    "shipping postal code matches",
    order.shippingPostalCode,
    address.postalCode,
  );
  TestValidator.equals(
    "shipping country matches",
    order.shippingCountry,
    address.country,
  );
  // 8. Verify order items is an array
  TestValidator.predicate(
    "orderItems is array",
    Array.isArray(order.orderItems),
  );
}
