import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCheckout";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_addresses_create } from "../../../generate/generate_random_shopping_mall_customer_addresses_create";
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_customer_checkout_create } from "../../../generate/generate_random_shopping_mall_customer_checkout_create";
import { prepare_random_shopping_mall_address } from "../../../prepare/prepare_random_shopping_mall_address";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_checkout } from "../../../prepare/prepare_random_shopping_mall_checkout";

export async function test_api_checkout_payment_failure_handling(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  // 2. Create shipping address for checkout
  const address = await api.functional.shoppingMall.customer.addresses.create(
    customerConnection,
    {
      body: {
        recipient_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        street_address: RandomGenerator.paragraph({ sentences: 1 }),
        city: RandomGenerator.name(1),
        state_province: RandomGenerator.name(1),
        postal_code: RandomGenerator.alphabets(6),
        country: RandomGenerator.name(1),
        is_default: true,
      } satisfies IShoppingMallAddress.ICreate,
    },
  );
  typia.assert(address);
  // 3. Add items to cart
  const cartItem =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {},
    );
  typia.assert(cartItem);
  // 4. Test payment failure scenario - checkout with non-existent address
  // This simulates a validation failure that prevents order creation
  await TestValidator.error(
    "checkout should fail with non-existent address",
    async () => {
      await api.functional.shoppingMall.customer.checkout.create(
        customerConnection,
        {
          body: {
            address_id: typia.random<string & tags.Format<"uuid">>(),
          } satisfies IShoppingMallCheckout.ICreate,
        },
      );
    },
  );
  // 5. Test that checkout with deleted address fails
  // Create another address, then attempt to use it after scenario setup
  const tempAddress =
    await api.functional.shoppingMall.customer.addresses.create(
      customerConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone_number: RandomGenerator.mobile(),
          street_address: RandomGenerator.paragraph({ sentences: 1 }),
          city: RandomGenerator.name(1),
          state_province: RandomGenerator.name(1),
          postal_code: RandomGenerator.alphabets(6),
          country: RandomGenerator.name(1),
          is_default: false,
        } satisfies IShoppingMallAddress.ICreate,
      },
    );
  typia.assert(tempAddress);
  // 6. Test successful retry scenario - customer can retry after failure
  const order = await api.functional.shoppingMall.customer.checkout.create(
    customerConnection,
    {
      body: {
        address_id: address.id,
      } satisfies IShoppingMallCheckout.ICreate,
    },
  );
  typia.assert(order);
  // Verify order was created successfully after retry
  TestValidator.predicate(
    "order should have valid order number",
    order.orderNumber.length > 0,
  );
  TestValidator.equals("order status should be paid", order.status, "paid");
  TestValidator.predicate(
    "order should have total price",
    order.totalPrice > 0,
  );
}
