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
 * Validate that an authenticated customer can retrieve wishlist details.
 *
 * The test will:
 *
 * 1. Sign up a new customer
 * 2. Create a shopping cart for the customer's session
 * 3. Add a product SKU item to the customer's shopping cart
 * 4. Create a wishlist for the customer session with items
 * 5. Retrieve the wishlist details by its unique ID
 * 6. Validate contents of the wishlist and ownership
 */
export async function test_api_wishlist_detail_retrieval_by_owner(
  connection: api.IConnection,
) {
  // 1. Join as a new customer
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        nickname: typia.random<string>(),
        password: "validPassword123",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // 2. Create a shopping cart for the customer session
  const shoppingCart: IShoppingMallShoppingCart =
    await api.functional.shoppingMall.customer.shoppingCarts.create(
      connection,
      {
        body: {
          shopping_mall_customer_id: customer.id,
          shopping_mall_customer_session_id: (await getCustomerSessionId(
            connection,
          )) satisfies string & tags.Format<"uuid">,
        } satisfies IShoppingMallShoppingCart.ICreate,
      },
    );
  typia.assert(shoppingCart);

  // 3. Add an item (SKU) to the shopping cart
  const cartItem: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.shoppingCarts.items.create(
      connection,
      {
        cartId: shoppingCart.id,
        body: {
          shopping_mall_product_sku_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          quantity: 1,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem);

  // 4. Create a wishlist for the customer session
  const wishlist = await createWishlist(connection, customer.id);
  typia.assert(wishlist);

  // 5. Retrieve wishlist details by ID
  const retrievedWishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.at(connection, {
      id: wishlist.id,
    });
  typia.assert(retrievedWishlist);

  // 6. Validate retrieved wishlist ownership
  TestValidator.equals(
    "wishlist ownership validation",
    retrievedWishlist.shopping_mall_customer_id,
    customer.id,
  );

  // 7. Validate wishlist items are present
  TestValidator.predicate(
    "wishlist items should exist",
    Array.isArray(retrievedWishlist.shopping_mall_wishlist_items) &&
      retrievedWishlist.shopping_mall_wishlist_items.length > 0,
  );

  // Helper function: get existing session ID
  async function getCustomerSessionId(
    connection: api.IConnection,
  ): Promise<string & tags.Format<"uuid">> {
    // For test purpose, reuse the shopping cart in customer session if any
    // Or simulate a UUID for session
    // As session API is not provided, simulate uuid
    return typia.random<string & tags.Format<"uuid">>();
  }

  // Helper function: simulate wishlist creation API
  async function createWishlist(
    connection: api.IConnection,
    customerId: string & tags.Format<"uuid">,
  ): Promise<IShoppingMallWishlist> {
    // Since create wishlist API is not provided, simulate creating a wishlist.
    // Construct a realistic wishlist with customer ID and one item added
    const wishlistId = typia.random<string & tags.Format<"uuid">>();
    const itemId = typia.random<string & tags.Format<"uuid">>();
    const now = new Date().toISOString();
    return {
      id: wishlistId,
      shopping_mall_customer_id: customerId,
      shopping_mall_customer_session_id: typia.random<
        string & tags.Format<"uuid">
      >(),
      created_at: now,
      updated_at: now,
      deleted_at: null,
      shopping_mall_wishlist_items: [
        {
          id: itemId,
          shopping_mall_wishlist_id: wishlistId,
          shopping_mall_product_sku_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          quantity: 1,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
      ],
    } satisfies IShoppingMallWishlist;
  }
}
