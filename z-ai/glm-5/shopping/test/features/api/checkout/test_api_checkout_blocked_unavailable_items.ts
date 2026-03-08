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

export async function test_api_checkout_blocked_unavailable_items(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer connection and register
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // 2. Create shipping address for the customer
  const address = await generate_random_shopping_mall_customer_addresses_create(
    customerConnection,
    {},
  );
  typia.assert(address);
  // 3. Add a product variant to cart
  // Note: The randomly generated cart item may or may not be unavailable
  // depending on the variant's availability status at creation time
  const cartItem =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {},
    );
  typia.assert(cartItem);
  // 4. Test checkout behavior based on item availability
  // When cart contains unavailable items (unavailable=true),
  // the checkout API should block and return an error.
  // This validates the business rule: 'IF the cart contains unavailable items,
  // THE system SHALL prevent checkout and prompt the customer to remove those items.'
  if (cartItem.unavailable) {
    // Checkout should be BLOCKED for unavailable items
    await TestValidator.error(
      "checkout blocked for unavailable items",
      async () => {
        await api.functional.shoppingMall.customer.checkout.create(
          customerConnection,
          {
            body: {
              address_id: address.id,
            } satisfies IShoppingMallCheckout.ICreate,
          },
        );
      },
    );
  } else {
    // When all items are available, checkout succeeds
    // This validates the normal flow: available items allow checkout
    const order = await api.functional.shoppingMall.customer.checkout.create(
      customerConnection,
      {
        body: {
          address_id: address.id,
        } satisfies IShoppingMallCheckout.ICreate,
      },
    );
    typia.assert(order);
    TestValidator.predicate(
      "order created for available items",
      order.id !== null && order.id.length > 0,
    );
  }
}
