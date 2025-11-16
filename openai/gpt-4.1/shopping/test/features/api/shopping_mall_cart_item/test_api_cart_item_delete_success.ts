import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";

/**
 * Validates the successful deletion of a cart item by its owner.
 *
 * This test ensures that a customer can register, add an item to their cart,
 * successfully delete that item, and verifies the item is no longer present in
 * the cart. It covers the primary user journey for cart item removal and
 * asserts correct authorization and API behavior.
 *
 * Steps:
 *
 * 1. Register a customer and ensure authorization context is set up (token
 *    attached by SDK)
 * 2. Prepare random UUIDs to represent the cart and SKU (the backend is expected
 *    to accept these for simulation testing)
 * 3. Add a unique cart item for this customer, linking it to their cart and an SKU
 * 4. Delete the cart item
 * 5. Attempt to delete the cart item again and expect an error (optional; ensures
 *    true deletion)
 * 6. (If API supported) Optionally query the cart contents to assert the item is
 *    gone
 */
export async function test_api_cart_item_delete_success(
  connection: api.IConnection,
) {
  // 1. Register customer
  const customerInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    phone: "010" + RandomGenerator.alphaNumeric(8),
  } satisfies IShoppingMallCustomer.ICreate;
  const customer = await api.functional.auth.customer.join(connection, {
    body: customerInput,
  });
  typia.assert(customer);
  // Ensure SDK sets auth token for subsequent operations (handled by SDK)

  // 2. Prepare cartId and SKU id (simulate since product/cart creation is out of scope)
  const cartId = typia.random<string & tags.Format<"uuid">>();
  const skuId = typia.random<string & tags.Format<"uuid">>();

  // 3. Add item to cart
  const createBody = {
    shopping_mall_product_sku_id: skuId,
    quantity: 1,
  } satisfies IShoppingMallCartItem.ICreate;
  const cartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId,
      body: createBody,
    });
  typia.assert(cartItem);
  TestValidator.equals(
    "cart item has expected cart id",
    cartItem.shopping_mall_cart_id,
    cartId,
  );
  TestValidator.equals(
    "cart item has expected SKU id",
    cartItem.productSku.id,
    skuId,
  );
  TestValidator.equals("cart item quantity is correct", cartItem.quantity, 1);

  // 4. Delete the item
  await api.functional.shoppingMall.customer.carts.items.erase(connection, {
    cartId,
    itemId: cartItem.id,
  });

  // 5. Try to delete again to confirm item is gone (should error)
  await TestValidator.error(
    "deleting already-removed cart item should fail",
    async () => {
      await api.functional.shoppingMall.customer.carts.items.erase(connection, {
        cartId,
        itemId: cartItem.id,
      });
    },
  );
}
