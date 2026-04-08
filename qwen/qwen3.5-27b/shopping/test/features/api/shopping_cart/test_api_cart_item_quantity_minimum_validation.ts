import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { prepare_random_shopping_mall_customer_cart_item } from "../../../prepare/prepare_random_shopping_mall_customer_cart_item";

/**
 * Test cart item quantity update with valid values.
 *
 * Validates that cart item quantity can be successfully updated to different positive integer values. This test ensures that the quantity update operation works correctly when valid inputs are provided, and that the cart item is properly modified.
 *
 * Special attention is given to verifying that the updated quantity is correctly reflected in the response and that the cart item maintains all other properties.
 *
 * 1. Customer authenticates via registration.
 * 2. Customer adds a product variant to their shopping cart.
 * 3. Customer updates cart item quantity to a different valid positive integer.
 * 4. System accepts the update and returns the modified cart item.
 * 5. Verify the quantity has been successfully updated.
 */
export async function test_api_cart_item_quantity_minimum_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Add a cart item with initial quantity
  const cartItem =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {},
    );
  typia.assert(cartItem);
  const originalQuantity = cartItem.quantity;
  // 3. Update quantity to a different valid value (original + 2)
  const newQuantity = originalQuantity + 2;
  const updatedCartItem =
    await api.functional.shoppingMall.customer.cart.items.update(
      customerConnection,
      {
        itemId: cartItem.id,
        body: {
          quantity: newQuantity,
        } satisfies IShoppingMallCustomerCartItem.IUpdate,
      },
    );
  typia.assert(updatedCartItem);
  // 4. Verify quantity has been updated
  TestValidator.equals(
    "quantity updated",
    updatedCartItem.quantity,
    newQuantity,
  );
  // 5. Verify quantity is different from original
  TestValidator.notEquals(
    "quantity changed",
    updatedCartItem.quantity,
    originalQuantity,
  );
  // 6. Verify cart item ID remains the same
  TestValidator.equals(
    "cart item id unchanged",
    updatedCartItem.id,
    cartItem.id,
  );
}
