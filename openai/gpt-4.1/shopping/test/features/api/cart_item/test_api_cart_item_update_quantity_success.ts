import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";

/**
 * Successful update of cart item quantity by an authenticated customer.
 *
 * Steps:
 *
 * 1. Register a new customer and obtain authorization.
 * 2. Add a new cart item (SKU) to the customer's cart using a valid quantity.
 * 3. Update the cart item quantity to a new value (still in stock).
 * 4. Validate that the returned cart item reflects the updated quantity and the
 *    SKU's in_stock flag is true.
 */
export async function test_api_cart_item_update_quantity_success(
  connection: api.IConnection,
) {
  // 1. Register a new customer and obtain authorization
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(12);
  const joinRequest = {
    email: customerEmail,
    password: customerPassword as string &
      tags.MinLength<8> &
      tags.Format<"password">,
    name: RandomGenerator.name(2),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.ICreate;
  const customerAuth = await api.functional.auth.customer.join(connection, {
    body: joinRequest,
  });
  typia.assert(customerAuth);
  // Authentication token is now set on connection

  // 2. Add a new cart item (SKU) to the customer's cart
  // The API does not define how to create a cart or enumerate SKUs in this test scope,
  // so mock a valid cartId and product SKU ID with typia.random.
  const cartId = typia.random<string & tags.Format<"uuid">>();
  const productSkuId = typia.random<string & tags.Format<"uuid">>();
  const createCartItemBody = {
    shopping_mall_product_sku_id: productSkuId,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallCartItem.ICreate;
  const createdItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId,
      body: createCartItemBody,
    });
  typia.assert(createdItem);
  TestValidator.equals(
    "create: cart item quantity matches",
    createdItem.quantity,
    1,
  );
  TestValidator.predicate(
    "create: cart item productSku is in_stock",
    createdItem.productSku.in_stock === true,
  );

  // 3. Update cart item quantity to a new valid value
  const newQuantity = 2 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const updateCartItemBody = {
    quantity: newQuantity,
  } satisfies IShoppingMallCartItem.IUpdate;
  const updatedItem =
    await api.functional.shoppingMall.customer.carts.items.update(connection, {
      cartId,
      itemId: createdItem.id,
      body: updateCartItemBody,
    });
  typia.assert(updatedItem);
  // 4. Validation after update
  TestValidator.equals(
    "update: cart item quantity updated",
    updatedItem.quantity,
    newQuantity,
  );
  TestValidator.equals(
    "update: cartId matches",
    updatedItem.shopping_mall_cart_id,
    cartId,
  );
  TestValidator.equals(
    "update: itemId matches",
    updatedItem.id,
    createdItem.id,
  );
  TestValidator.predicate(
    "update: productSku is in_stock",
    updatedItem.productSku.in_stock === true,
  );
}
