import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

export async function test_api_shopping_cart_item_add_by_customer(
  connection: api.IConnection,
) {
  // 1. Customer joins to authenticate
  const customerBody = {
    email: RandomGenerator.alphaNumeric(8) + "@example.com",
    password: "Password123!",
    nickname: RandomGenerator.name(),
  } satisfies IShoppingMallCustomer.ICreate;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, { body: customerBody });
  typia.assert(customer);

  // 2. Prepare to add a cart item - need a cartId and SKU ID
  // Since no API is provided for shopping cart creation or SKU retrieval, we use random UUIDs for testing
  // In real scenario, these would be fetched or created prior
  const cartId = typia.random<string & tags.Format<"uuid">>();
  const skuId = typia.random<string & tags.Format<"uuid">>();

  // 3. Create shopping cart item request body
  const requestBody = {
    shopping_mall_product_sku_id: skuId,
    quantity:
      RandomGenerator.alphaNumeric(1) === "0"
        ? 1
        : Math.max(1, Math.floor(Math.random() * 5)),
  } satisfies IShoppingMallCartItem.ICreate;

  // 4. Add item to the shopping cart
  const cartItem: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.shoppingCarts.items.create(
      connection,
      { cartId, body: requestBody },
    );
  typia.assert(cartItem);

  // 5. Validate response data
  TestValidator.equals(
    "cart item cart ID matches",
    cartItem.shopping_mall_shopping_cart_id,
    cartId,
  );
  TestValidator.equals(
    "cart item SKU ID matches",
    cartItem.shopping_mall_product_sku_id,
    skuId,
  );
  TestValidator.predicate(
    "cart item quantity is positive",
    cartItem.quantity > 0,
  );
  TestValidator.predicate(
    "cart item has created timestamp",
    typeof cartItem.created_at === "string" && cartItem.created_at.length > 0,
  );
  TestValidator.predicate(
    "cart item has updated timestamp",
    typeof cartItem.updated_at === "string" && cartItem.updated_at.length > 0,
  );
  TestValidator.equals("cart item not deleted", cartItem.deleted_at, null);
}
