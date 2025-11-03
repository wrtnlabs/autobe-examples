import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import type { IShoppingMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingCart";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";

export async function test_api_wishlist_creation_by_authenticated_customer(
  connection: api.IConnection,
) {
  // 1. Customer user signs up via authentication /auth/customer/join
  const customerBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "StrongPass123!",
    nickname: RandomGenerator.name(),
  } satisfies IShoppingMallCustomer.ICreate;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerBody,
    });
  typia.assert(customer);

  // Define a new session ID for shopping mall customer session
  const shoppingMallCustomerSessionId = typia.random<
    string & tags.Format<"uuid">
  >();

  // 2. A new shopping cart is created for the authenticated customer
  const cartBody = {
    shopping_mall_customer_id: customer.id,
    shopping_mall_customer_session_id: shoppingMallCustomerSessionId,
  } satisfies IShoppingMallShoppingCart.ICreate;
  const shoppingCart: IShoppingMallShoppingCart =
    await api.functional.shoppingMall.customer.shoppingCarts.create(
      connection,
      {
        body: cartBody,
      },
    );
  typia.assert(shoppingCart);

  TestValidator.equals(
    "shopping cart belongs to created customer",
    shoppingCart.shopping_mall_customer_id,
    customer.id,
  );

  // 3. Add an item to the shopping cart
  // Since no SKU information is provided, generate a random SKU id and quantity
  const cartItemBody = {
    shopping_mall_product_sku_id: typia.random<string & tags.Format<"uuid">>(),
    quantity: RandomGenerator.pick([1, 2, 3, 4, 5] as const),
  } satisfies IShoppingMallCartItem.ICreate;
  const cartItem: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.shoppingCarts.items.create(
      connection,
      {
        cartId: shoppingCart.id,
        body: cartItemBody,
      },
    );
  typia.assert(cartItem);

  TestValidator.equals(
    "cart item belongs to created cart",
    cartItem.shopping_mall_shopping_cart_id,
    shoppingCart.id,
  );

  // 4. Create a wishlist for the authenticated customer
  const wishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection);
  typia.assert(wishlist);

  TestValidator.equals(
    "wishlist belongs to created customer",
    wishlist.shopping_mall_customer_id,
    customer.id,
  );
}
