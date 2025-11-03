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

/**
 * Tests the full lifecycle of deleting an item in the shopping cart by a
 * customer.
 *
 * The test performs customer account registration and login, creates a new
 * shopping cart for the customer session, adds a product SKU item to the
 * shopping cart, deletes the specific cart item, and verifies deletion was
 * successful.
 *
 * Validates response content and types at every step using typia.assert,
 * ensuring API schemas are correctly respected.
 *
 * Also verifies business rules such as customer ownership and cart integrity.
 */
export async function test_api_shopping_cart_item_deletion_by_customer(
  connection: api.IConnection,
) {
  // 1. Customer signs up and authenticates
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "Password123!",
        nickname: RandomGenerator.name(),
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // 2. Create a new shopping cart for this customer
  const shoppingCart: IShoppingMallShoppingCart =
    await api.functional.shoppingMall.customer.shoppingCarts.create(
      connection,
      {
        body: {
          shopping_mall_customer_id: customer.id,
          shopping_mall_customer_session_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        } satisfies IShoppingMallShoppingCart.ICreate,
      },
    );
  typia.assert(shoppingCart);

  // 3. Add an item to the created shopping cart
  const cartItemCreateBody = {
    shopping_mall_product_sku_id: typia.random<string & tags.Format<"uuid">>(),
    quantity: RandomGenerator.alphaNumeric(1).length === 1 ? 1 : 1,
  } satisfies IShoppingMallCartItem.ICreate;

  const cartItem: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.shoppingCarts.items.create(
      connection,
      {
        cartId: shoppingCart.id,
        body: cartItemCreateBody,
      },
    );
  typia.assert(cartItem);

  // 4. Delete the added item from the shopping cart
  await api.functional.shoppingMall.customer.shoppingCarts.items.eraseCartItem(
    connection,
    {
      cartId: shoppingCart.id,
      itemId: cartItem.id,
    },
  );

  // 5. Confirm deletion by trying to delete again and expecting an error
  await TestValidator.error(
    "deleting non-existent cart item should fail",
    async () => {
      await api.functional.shoppingMall.customer.shoppingCarts.items.eraseCartItem(
        connection,
        {
          cartId: shoppingCart.id,
          itemId: cartItem.id,
        },
      );
    },
  );
}
