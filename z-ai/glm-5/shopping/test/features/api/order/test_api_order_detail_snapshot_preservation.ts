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

export async function test_api_order_detail_snapshot_preservation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication - create new customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  // 2. Create shipping address for checkout
  const address = await generate_random_shopping_mall_customer_addresses_create(
    customerConnection,
    {
      body: {
        recipient_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        street_address: `${RandomGenerator.alphabets(10)} Street, Apt ${RandomGenerator.alphabets(3)}`,
        city: RandomGenerator.name(1),
        state_province: RandomGenerator.name(1),
        postal_code: `${RandomGenerator.alphabets(2).toUpperCase()}${Math.floor(Math.random() * 9000) + 1000}`,
        country: RandomGenerator.name(1),
        is_default: true,
      },
    },
  );
  typia.assert(address);
  // 3. Complete checkout to create order with snapshots
  const order = await generate_random_shopping_mall_customer_checkout_create(
    customerConnection,
    {
      body: {
        address_id: address.id,
      },
    },
  );
  typia.assert(order);
  // 4. Retrieve order detail
  const orderDetail = await api.functional.shoppingMall.customer.orders.at(
    customerConnection,
    {
      orderId: order.id,
    },
  );
  typia.assert(orderDetail);
  // 5. Verify shipping address snapshot preservation
  TestValidator.equals(
    "recipient name",
    orderDetail.shippingRecipientName,
    address.recipientName,
  );
  TestValidator.equals(
    "phone number",
    orderDetail.shippingPhoneNumber,
    address.phoneNumber,
  );
  TestValidator.equals(
    "street address",
    orderDetail.shippingStreetAddress,
    address.streetAddress,
  );
  TestValidator.equals("city", orderDetail.shippingCity, address.city);
  TestValidator.equals(
    "state province",
    orderDetail.shippingStateProvince,
    address.stateProvince,
  );
  TestValidator.equals(
    "postal code",
    orderDetail.shippingPostalCode,
    address.postalCode,
  );
  TestValidator.equals("country", orderDetail.shippingCountry, address.country);
}
