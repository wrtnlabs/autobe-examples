import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallWishlistItem";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";

/**
 * Ensure that deleting a customer wishlist removes all of its items from
 * customer-visible listing views.
 *
 * Business goal
 *
 * - A wishlist is a container for wishlist items (shopping_mall_wishlist_items)
 *   belonging to a single customer.
 * - When the wishlist is deleted, customers must no longer see any of its items
 *   through standard wishlist item listing APIs.
 *
 * Steps covered in this test
 *
 * 1. Register a new customer using the customer join endpoint so that we have an
 *    authenticated customer context.
 * 2. Create a wishlist for that customer.
 * 3. Insert multiple items into the wishlist.
 * 4. List items for that wishlist and confirm that the created items are visible.
 * 5. Delete the wishlist.
 * 6. Attempt to list items again for the same wishlist id and confirm that there
 *    are no customer-visible items remaining for that wishlist.
 */
export async function test_api_customer_wishlist_delete_cleans_up_items_from_customer_view(
  connection: api.IConnection,
) {
  // 1. Register a new customer and obtain an authenticated connection context
  const joinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphabets(12),
    name: RandomGenerator.name(),
    href: "https://example.com/register",
    referrer: "https://example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const authorizedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert(authorizedCustomer);

  // 2. Create a wishlist for this customer
  const wishlistBody = {
    name: `E2E Wishlist ${RandomGenerator.alphabets(6)}`,
  } satisfies IShoppingMallWishlist.ICreate;

  const wishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: wishlistBody,
    });
  typia.assert(wishlist);

  // 3. Insert multiple items into the wishlist
  const createdItems: IShoppingMallWishlistItem[] = [];

  // Create two items to make the listing check meaningful.
  const firstItemBody = {
    shopping_mall_product_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_product_sku_id: null,
  } satisfies IShoppingMallWishlistItem.ICreate;

  const firstItem: IShoppingMallWishlistItem =
    await api.functional.shoppingMall.customer.wishlists.items.create(
      connection,
      {
        wishlistId: wishlist.id,
        body: firstItemBody,
      },
    );
  typia.assert(firstItem);
  createdItems.push(firstItem);

  const secondItemBody = {
    shopping_mall_product_id: null,
    shopping_mall_product_sku_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IShoppingMallWishlistItem.ICreate;

  const secondItem: IShoppingMallWishlistItem =
    await api.functional.shoppingMall.customer.wishlists.items.create(
      connection,
      {
        wishlistId: wishlist.id,
        body: secondItemBody,
      },
    );
  typia.assert(secondItem);
  createdItems.push(secondItem);

  // 4. List items for the wishlist and confirm visibility
  const listRequestBefore = {
    page: 0 as number & tags.Type<"int32">,
    limit: 20 as number & tags.Type<"int32">,
  } satisfies IShoppingMallWishlistItem.IRequest;

  const pageBefore: IPageIShoppingMallWishlistItem.ISummary =
    await api.functional.shoppingMall.customer.wishlists.items.index(
      connection,
      {
        wishlistId: wishlist.id,
        body: listRequestBefore,
      },
    );
  typia.assert(pageBefore);

  const beforeIds = pageBefore.data.map((item) => item.id);

  // Ensure that all created item IDs are present in the listing.
  for (const created of createdItems) {
    TestValidator.predicate(
      "created wishlist item must appear in listing before deletion",
      beforeIds.includes(created.id),
    );
  }

  TestValidator.predicate(
    "wishlist listing before deletion must contain at least as many items as created",
    pageBefore.data.length >= createdItems.length,
  );

  // 5. Delete the wishlist
  await api.functional.shoppingMall.customer.wishlists.erase(connection, {
    wishlistId: wishlist.id,
  });

  // 6. List items again for the same wishlist id and ensure no visible items
  const listRequestAfter = {
    page: 0 as number & tags.Type<"int32">,
    limit: 20 as number & tags.Type<"int32">,
  } satisfies IShoppingMallWishlistItem.IRequest;

  const pageAfter: IPageIShoppingMallWishlistItem.ISummary =
    await api.functional.shoppingMall.customer.wishlists.items.index(
      connection,
      {
        wishlistId: wishlist.id,
        body: listRequestAfter,
      },
    );
  typia.assert(pageAfter);

  TestValidator.equals(
    "wishlist listing after deletion must have zero items",
    pageAfter.data.length,
    0,
  );
}
