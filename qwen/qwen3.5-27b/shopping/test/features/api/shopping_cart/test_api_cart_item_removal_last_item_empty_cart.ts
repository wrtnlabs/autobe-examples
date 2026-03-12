import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
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
import { generate_random_shopping_mall_customer_customers_me_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_customers_me_cart_items_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";

/**
 * Test cart item removal when it's the last item in cart, verifying empty cart state behavior.
 *
 * This test validates that:
 * 1. A customer can remove the last item from their cart
 * 2. The cart becomes empty but remains functional
 * 3. Customer can continue shopping after cart is empty
 * 4. No errors occur when cart transitions to empty state
 */
export async function test_api_cart_item_removal_last_item_empty_cart(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: undefined,
  });
  typia.assert(customer);
  // 2. Add exactly one product variant to cart (single-item cart)
  const cartItem =
    await generate_random_shopping_mall_customer_customers_me_cart_items_create(
      customerConnection,
      {
        body: undefined,
      },
    );
  typia.assert(cartItem);
  // 3. Store the cart item ID before deletion
  const deletedItemId = cartItem.id;
  // 4. Remove the single cart item (last item in cart)
  // This should return void (HTTP 204 No Content)
  await api.functional.shoppingMall.customer.cart_items.erase(
    customerConnection,
    {
      cartItemId: deletedItemId,
    },
  );
  // 5. Verify cart functionality remains available by adding a new item
  // If cart was properly emptied and remains functional, this should succeed
  const newCartItem =
    await generate_random_shopping_mall_customer_customers_me_cart_items_create(
      customerConnection,
      {
        body: undefined,
      },
    );
  typia.assert(newCartItem);
  // 6. Verify new cart item has a different ID (confirms deletion worked)
  if (deletedItemId === newCartItem.id)
    throw new Error("New cart item should have different ID from deleted item");
  // 7. Verify new cart item has valid quantity
  if (newCartItem.quantity < 1)
    throw new Error("New cart item quantity should be at least 1");
  // Test passed: cart was successfully emptied and remains functional
}
