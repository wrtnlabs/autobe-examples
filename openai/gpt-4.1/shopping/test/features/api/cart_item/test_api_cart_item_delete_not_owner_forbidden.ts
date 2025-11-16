import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";

/**
 * Validate that only the true owner of a cart may delete items from it.
 *
 * Steps:
 *
 * 1. Register the first customer (cart owner)
 * 2. Create a cart item as the owner
 * 3. Register a second customer (non-owner)
 * 4. Attempt to delete the first customer's cart item as the second customer —
 *    expect error
 */
export async function test_api_cart_item_delete_not_owner_forbidden(
  connection: api.IConnection,
) {
  // 1. Register first customer
  const ownerInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.ICreate;
  const ownerAuth = await api.functional.auth.customer.join(connection, {
    body: ownerInput,
  });
  typia.assert(ownerAuth);

  // Prepare a cartId to use (use ownerAuth.id as cart id for customer context)
  const cartId = ownerAuth.id satisfies string as string; // Assume customer's id is used as cart id

  // 2. Create productSku summary (simulate random valid sku: id is uuid, code/product_title/option_summary are random strings, in_stock:boolean)
  const skuSummary: IShoppingMallProductSku.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    code: RandomGenerator.alphaNumeric(8),
    product_title: RandomGenerator.paragraph({ sentences: 2 }),
    option_summary: RandomGenerator.paragraph({ sentences: 1 }),
    in_stock: true,
  };

  // 3. Create a cart item as the owner (requires a real sku, simulate with random uuid for sku)
  const cartItemBody = {
    shopping_mall_product_sku_id: skuSummary.id,
    quantity: 1,
  } satisfies IShoppingMallCartItem.ICreate;
  const cartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId,
      body: cartItemBody,
    });
  typia.assert(cartItem);

  // 4. Register a second customer (non-owner)
  const strangerInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.ICreate;
  const strangerAuth = await api.functional.auth.customer.join(connection, {
    body: strangerInput,
  });
  typia.assert(strangerAuth);

  // Switch authenticated user to the stranger (already done by customer.join)

  // 5. Attempt to delete the owner's cart item as the stranger (should be forbidden)
  await TestValidator.error(
    "non-owner cannot delete other customer's cart item",
    async () => {
      await api.functional.shoppingMall.customer.carts.items.erase(connection, {
        cartId,
        itemId: cartItem.id,
      });
    },
  );
}
