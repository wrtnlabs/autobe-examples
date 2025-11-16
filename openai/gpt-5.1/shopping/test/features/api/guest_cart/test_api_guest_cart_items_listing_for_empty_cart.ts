import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallGuestCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallGuestCartItem";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallGuestCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestCart";
import type { IShoppingMallGuestCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestCartItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";

export async function test_api_guest_cart_items_listing_for_empty_cart(
  connection: api.IConnection,
) {
  /**
   * Validate listing items for a newly created guest cart that has no items.
   *
   * Business context:
   *
   * - Guest carts are created for unauthenticated visitors using POST
   *   /shoppingMall/guestCarts.
   * - Items in a guest cart live in shopping_mall_guest_cart_items and are
   *   exposed via PATCH /shoppingMall/guestCarts/{guestCartId}/items as a
   *   paginated IPageIShoppingMallGuestCartItem.ISummary collection.
   * - For a brand new cart with no items, the items listing endpoint should
   *   respond successfully with an empty data array and pagination metadata
   *   reflecting zero records/pages.
   *
   * Steps:
   *
   * 1. Create a fresh guest cart using a valid IShoppingMallGuestCart.ICreate
   *    payload.
   * 2. Call guest cart items index for that cart without adding items.
   * 3. Assert the response structure with typia.assert.
   * 4. Validate that pagination.records and pagination.pages are 0 and that data
   *    is an empty array.
   * 5. Sanity-check pagination.current and pagination.limit are non-negative
   *    integers, as required by IPage.IPagination.
   */

  // 1. Create a fresh guest cart for an anonymous visitor
  const createBody = {
    guest_token: RandomGenerator.alphaNumeric(32),
    ip: "127.0.0.1",
    user_agent: RandomGenerator.name(2),
    referrer: "https://example.com/landing",
    region_code: "KR",
  } satisfies IShoppingMallGuestCart.ICreate;

  const guestCart: IShoppingMallGuestCart =
    await api.functional.shoppingMall.guestCarts.create(connection, {
      body: createBody,
    });
  typia.assert(guestCart);

  // Ensure the cart has been created with an empty items collection
  TestValidator.equals(
    "new guest cart should start with zero items",
    guestCart.items.length,
    0,
  );

  // 2. List items for the newly created guest cart
  const page: IPageIShoppingMallGuestCartItem.ISummary =
    await api.functional.shoppingMall.guestCarts.items.index(connection, {
      guestCartId: guestCart.id,
    });
  typia.assert(page);

  // 3. Validate pagination meta and data for an empty cart
  TestValidator.equals(
    "empty cart listing has zero records",
    page.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty cart listing has zero pages",
    page.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty cart listing has empty data array",
    page.data.length,
    0,
  );

  // 4. Sanity-check current page index and limit are non-negative ints
  TestValidator.predicate(
    "pagination.current is a non-negative integer",
    Number.isInteger(page.pagination.current) && page.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination.limit is a non-negative integer",
    Number.isInteger(page.pagination.limit) && page.pagination.limit >= 0,
  );
}
