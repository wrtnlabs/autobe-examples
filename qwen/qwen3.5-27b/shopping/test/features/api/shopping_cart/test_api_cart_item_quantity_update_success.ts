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
 * Test the primary success path for updating a cart item quantity.
 *
 * Validates the complete cart item quantity update workflow including customer authentication, cart item creation with initial quantity, and successful quantity modification. Ensures that the cart item quantity is correctly updated, the subtotal is recalculated using the preserved price from cart item creation, and the updated_at timestamp is refreshed.
 *
 * Special attention is given to verifying that the original price captured at cart item creation is preserved and not affected by any product price changes, ensuring accurate order totals even if product prices change after items are added to the cart.
 *
 * 1. Customer authenticates via registration with email and password.
 * 2. Customer adds a product variant to cart with initial quantity (e.g., 2 units).
 * 3. Validates initial cart item has correct quantity and subtotal calculation.
 * 4. Customer updates cart item quantity to a new value (e.g., 5 units).
 * 5. Validates updated cart item: quantity matches new value, subtotal recalculated correctly with preserved price, updated_at timestamp refreshed.
 * 6. Verifies the price preservation mechanism works correctly (original price maintained).
 */
export async function test_api_cart_item_quantity_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_customer_join(customerConnection, {
    body: {},
  });
  typia.assert(authResult);
  // 2. Create cart item with initial quantity
  const initialQuantity = 2;
  const cartItem =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          quantity: initialQuantity,
        },
      },
    );
  typia.assert(cartItem);
  // 3. Validate initial cart item
  TestValidator.equals(
    "initial quantity matches",
    cartItem.quantity,
    initialQuantity,
  );
  const originalPrice =
    cartItem.productVariant.price ?? cartItem.productVariant.product.base_price;
  const expectedInitialSubtotal = originalPrice * initialQuantity;
  TestValidator.equals(
    "initial subtotal calculation",
    cartItem.subtotal,
    expectedInitialSubtotal,
  );
  const createdAt = cartItem.created_at;
  const initialUpdatedAt = cartItem.updated_at;
  // 4. Update cart item quantity
  const newQuantity = 5;
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
  // 5. Validate updated cart item
  TestValidator.equals(
    "quantity updated to new value",
    updatedCartItem.quantity,
    newQuantity,
  );
  // 6. Verify price preservation and subtotal recalculation
  const preservedPrice =
    updatedCartItem.productVariant.price ??
    updatedCartItem.productVariant.product.base_price;
  TestValidator.equals(
    "price preserved from creation",
    preservedPrice,
    originalPrice,
  );
  const expectedNewSubtotal = preservedPrice * newQuantity;
  TestValidator.equals(
    "subtotal recalculated with new quantity",
    updatedCartItem.subtotal,
    expectedNewSubtotal,
  );
  // 7. Verify timestamp update
  TestValidator.equals(
    "created_at unchanged",
    updatedCartItem.created_at,
    createdAt,
  );
  TestValidator.notEquals(
    "updated_at refreshed",
    updatedCartItem.updated_at,
    initialUpdatedAt,
  );
  // 8. Verify cart item identity preserved
  TestValidator.equals(
    "cart item ID unchanged",
    updatedCartItem.id,
    cartItem.id,
  );
  TestValidator.equals(
    "product variant unchanged",
    updatedCartItem.productVariant.id,
    cartItem.productVariant.id,
  );
}
