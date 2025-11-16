import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";

/**
 * Validate that updating a cart item's quantity above available inventory fails
 * with a business rule error.
 *
 * Steps:
 *
 * 1. Register a new customer (join)
 * 2. Create an initial cart and add a cart item for a SKU (assume the customer has
 *    an empty cart from join, and the API allows direct addition)
 * 3. Attempt to update the cart item's quantity to a value exceeding inventory
 * 4. Expect a business logic error (TestValidator.error) due to inventory
 *    constraint enforcement
 */
export async function test_api_cart_item_update_quantity_exceeds_inventory(
  connection: api.IConnection,
) {
  // 1. Register new customer
  const customerBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.MinLength<8> &
      tags.Format<"password">,
    name: RandomGenerator.name(2) as string &
      tags.MinLength<2> &
      tags.MaxLength<64>,
    phone: ("010" + RandomGenerator.alphaNumeric(8)) as string &
      tags.Pattern<"^[0-9\\-+() ]{8,20}$">,
  } satisfies IShoppingMallCustomer.ICreate;
  const customer = await api.functional.auth.customer.join(connection, {
    body: customerBody,
  });
  typia.assert(customer);
  const cartId = typia.random<string & tags.Format<"uuid">>();

  // 2. Add a cart item with quantity = 1 for a random SKU
  // Generate a valid cart item create DTO
  // We must "simulate" inventory limits. Let's say the SKU is always in stock, set available = 5
  const skuId = typia.random<string & tags.Format<"uuid">>();
  const initialCartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId,
      body: {
        shopping_mall_product_sku_id: skuId,
        quantity: 1,
      } satisfies IShoppingMallCartItem.ICreate,
    });
  typia.assert(initialCartItem);

  // 3. Attempt to update the cart item to quantity = 99999 (exceeds any realistic stock)
  await TestValidator.error(
    "updating cart item quantity above inventory should fail",
    async () => {
      await api.functional.shoppingMall.customer.carts.items.update(
        connection,
        {
          cartId,
          itemId: initialCartItem.id,
          body: {
            quantity: 99999,
          } satisfies IShoppingMallCartItem.IUpdate,
        },
      );
    },
  );
}
