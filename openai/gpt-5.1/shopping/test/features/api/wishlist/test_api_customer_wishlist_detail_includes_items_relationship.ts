import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";

/**
 * Validate that a customer wishlist detail includes its items relationship.
 *
 * Business goal: Ensure that when an authenticated customer fetches a specific
 * wishlist via GET /shoppingMall/customer/wishlists/{wishlistId}, the API
 * returns a fully populated IShoppingMallWishlist including its nested items
 * array, and that each item is structurally consistent and linked to the parent
 * wishlist.
 *
 * Scenario steps:
 *
 * 1. Customer self-registers using /auth/customer/join and becomes authenticated.
 * 2. The customer creates a wishlist via /shoppingMall/customer/wishlists.
 * 3. The customer adds at least one wishlist item to that wishlist via
 *    /shoppingMall/customer/wishlists/{wishlistId}/items.
 * 4. The customer retrieves the wishlist detail with
 *    /shoppingMall/customer/wishlists/{wishlistId}.
 * 5. The test asserts that:
 *
 *    - The response is a valid IShoppingMallWishlist.
 *    - The wishlist id matches the id used in the path.
 *    - The items array is defined and non-empty.
 *    - Every item in items conforms to IShoppingMallWishlistItem.
 *    - Each item's wishlist_id matches the parent wishlist.id.
 *    - Each item has a populated product summary, and an optional sku summary when
 *         present.
 *    - For at least one item, deletedAt is null or undefined (i.e., it is active),
 *         proving that active items are represented in the detail.
 */
export async function test_api_customer_wishlist_detail_includes_items_relationship(
  connection: api.IConnection,
) {
  // 1. Register a new customer and establish authenticated context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    ip: null,
    href: "https://example.com/register",
    referrer: "https://example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const authorizedCustomer = await api.functional.auth.customer.join(
    connection,
    {
      body: joinBody,
    },
  );
  typia.assert<IShoppingMallCustomer.IAuthorized>(authorizedCustomer);

  // 2. Create a wishlist for this customer
  const createWishlistBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IShoppingMallWishlist.ICreate;

  const createdWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: createWishlistBody,
    });
  typia.assert<IShoppingMallWishlist>(createdWishlist);

  // 3. Add at least one item to this wishlist
  const wishlistId = createdWishlist.id;

  const createItemBody = typia.random<IShoppingMallWishlistItem.ICreate>();

  const createdItem =
    await api.functional.shoppingMall.customer.wishlists.items.create(
      connection,
      {
        wishlistId,
        body: createItemBody,
      },
    );
  typia.assert<IShoppingMallWishlistItem>(createdItem);

  // 4. Retrieve wishlist detail
  const wishlistDetail =
    await api.functional.shoppingMall.customer.wishlists.at(connection, {
      wishlistId,
    });
  typia.assert<IShoppingMallWishlist>(wishlistDetail);

  // 5. Basic identity checks
  TestValidator.equals(
    "wishlist id in detail matches created wishlist",
    wishlistDetail.id,
    createdWishlist.id,
  );

  // 6. Ensure items array exists and is non-empty
  TestValidator.predicate(
    "wishlist items array should be defined",
    wishlistDetail.items !== undefined && wishlistDetail.items !== null,
  );

  const items = wishlistDetail.items ?? [];

  TestValidator.predicate(
    "wishlist items array should be non-empty after adding an item",
    Array.isArray(items) && items.length > 0,
  );

  // 7. Per-item structural and relationship validation
  for (const item of items) {
    // Structural assertion
    typia.assert<IShoppingMallWishlistItem>(item);

    // Relationship: wishlist_id must match parent wishlist.id
    TestValidator.equals(
      "wishlist item.wishlist_id matches parent wishlist id",
      item.wishlist_id,
      wishlistDetail.id,
    );

    // Product summary should always be present
    typia.assert<IShoppingMallProduct.ISummary>(item.product);

    // sku is optional but when present (non-null/undefined) must be valid
    if (item.sku !== null && item.sku !== undefined) {
      typia.assert<IShoppingMallProductSku.ISummary>(item.sku);
    }
  }

  // 8. Ensure there is at least one active (non-soft-deleted) item
  const hasActiveItem = items.some(
    (elem) => elem.deletedAt === null || elem.deletedAt === undefined,
  );

  TestValidator.predicate(
    "wishlist should contain at least one active (non-deleted) item",
    hasActiveItem,
  );
}
