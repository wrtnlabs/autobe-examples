import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";

/**
 * Validates that an authenticated customer can successfully add a new SKU item
 * to their cart.
 *
 * Steps:
 *
 * 1. Register a new customer account (join)
 * 2. Create a new cart for the customer
 * 3. Generate a mock valid SKU id and quantity to simulate adding an item (since
 *    no product creation APIs are present)
 * 4. Add the SKU to the cart and verify the creation response
 * 5. Attempt to add the same SKU again and expect a uniqueness violation error
 */
export async function test_api_cart_item_creation_by_customer(
  connection: api.IConnection,
) {
  // 1. Register a new customer
  const customerBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.ICreate;
  const auth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerBody,
    });
  typia.assert(auth);

  // 2. Customer creates a new cart
  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: {} satisfies IShoppingMallCart.ICreate,
    });
  typia.assert(cart);
  TestValidator.equals(
    "cart is linked to the authenticated customer",
    cart.customer.id,
    auth.id,
  );

  // 3. Prepare a mock valid SKU ID and quantity for the cart item
  const skuId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const cartItemBody = {
    shopping_mall_product_sku_id: skuId,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallCartItem.ICreate;

  // 4. Add SKU to the cart
  const cartItem: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cart.id,
      body: cartItemBody,
    });
  typia.assert(cartItem);
  TestValidator.equals(
    "cartId is correctly associated",
    cartItem.shopping_mall_cart_id,
    cart.id,
  );
  TestValidator.equals(
    "SKU id in cart item matches input",
    cartItem.productSku.id,
    skuId,
  );
  TestValidator.equals("quantity matches requested", cartItem.quantity, 1);
  TestValidator.predicate(
    "SKU is linked in the cart item",
    typeof cartItem.productSku === "object" && cartItem.productSku.id === skuId,
  );

  // 5. Adding the same SKU should violate uniqueness in cart
  await TestValidator.error(
    "adding duplicate SKU to cart should fail",
    async () => {
      await api.functional.shoppingMall.customer.carts.items.create(
        connection,
        {
          cartId: cart.id,
          body: cartItemBody,
        },
      );
    },
  );
}
