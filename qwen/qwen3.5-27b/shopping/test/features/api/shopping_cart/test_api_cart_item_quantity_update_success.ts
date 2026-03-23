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
 * Test the primary success path for updating a cart item's quantity.
 * A customer should be able to increase or decrease the quantity of a product variant in their cart
 * when sufficient stock is available. The test verifies customer authentication, cart item ownership,
 * quantity update, timestamp preservation, and correct subtotal recalculation.
 */
export async function test_api_cart_item_quantity_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication using utility function
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: undefined,
  });
  typia.assert(customer);
  // 2. Create a cart item using utility function
  const cartItem =
    await generate_random_shopping_mall_customer_customers_me_cart_items_create(
      customerConnection,
      { body: undefined },
    );
  typia.assert(cartItem);
  // Store original timestamps for validation
  const originalCreatedAt = cartItem.created_at;
  const originalQuantity = cartItem.quantity;
  // 3. Update the cart item quantity to a different valid value
  const newQuantity = originalQuantity === 1 ? 3 : 1;
  const updatedCartItem =
    await api.functional.shoppingMall.customer.cart_items.update(
      customerConnection,
      {
        cartItemId: cartItem.id,
        body: {
          quantity: newQuantity,
        } satisfies IShoppingMallCartItem.IUpdate,
      },
    );
  typia.assert(updatedCartItem);
  // 4. Validate the updated cart item
  TestValidator.equals(
    "quantity updated",
    updatedCartItem.quantity,
    newQuantity,
  );
  TestValidator.equals(
    "created_at preserved",
    updatedCartItem.created_at,
    originalCreatedAt,
  );
  TestValidator.notEquals(
    "updated_at refreshed",
    updatedCartItem.updated_at,
    cartItem.updated_at,
  );
  TestValidator.predicate(
    "subtotal recalculated",
    updatedCartItem.subtotal > 0,
  );
  // Calculate expected subtotal with correct operator precedence
  const price =
    updatedCartItem.variant.price_override ?? updatedCartItem.product.basePrice;
  const expectedSubtotal = price * updatedCartItem.quantity;
  TestValidator.equals(
    "subtotal matches price x quantity",
    updatedCartItem.subtotal,
    expectedSubtotal,
  );
  TestValidator.equals(
    "cart item id unchanged",
    updatedCartItem.id,
    cartItem.id,
  );
  TestValidator.predicate(
    "product info present",
    updatedCartItem.product.name.length > 0,
  );
  TestValidator.predicate(
    "variant info present",
    updatedCartItem.variant.sku_code.length > 0,
  );
  TestValidator.predicate(
    "deleted_at is null",
    updatedCartItem.deleted_at === null,
  );
}
