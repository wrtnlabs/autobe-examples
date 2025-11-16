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

export async function test_api_wishlist_items_list_basic_pagination(
  connection: api.IConnection,
) {
  // 1) Register a new customer and obtain authorized session
  const joinBody = {
    email: `${RandomGenerator.alphabets(10)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    ip: null,
    href: "https://example.com/register",
    referrer: "https://example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const authorizedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(authorizedCustomer);

  // 2) Create a wishlist for this customer
  const wishlistBody = {
    name: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallWishlist.ICreate;

  const wishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: wishlistBody,
    });
  typia.assert<IShoppingMallWishlist>(wishlist);

  // 3) Populate wishlist with more items than a single page (e.g., 15 items)
  const totalItems = 15;

  for (let i = 0; i < totalItems; i++) {
    const createBody = {
      shopping_mall_product_id: typia.random<string & tags.Format<"uuid">>(),
      shopping_mall_product_sku_id:
        i % 2 === 0 ? typia.random<string & tags.Format<"uuid">>() : null,
    } satisfies IShoppingMallWishlistItem.ICreate;

    const item: IShoppingMallWishlistItem =
      await api.functional.shoppingMall.customer.wishlists.items.create(
        connection,
        {
          wishlistId: wishlist.id,
          body: createBody,
        },
      );
    typia.assert<IShoppingMallWishlistItem>(item);
  }

  // 4) Retrieve first page of wishlist items (basic pagination)
  const limit = 10;
  const firstPageRequest = {
    // IShoppingMallWishlistItem.IRequest.page is documented as 1-based
    page: 1,
    limit,
  } satisfies IShoppingMallWishlistItem.IRequest;

  const firstPage: IPageIShoppingMallWishlistItem.ISummary =
    await api.functional.shoppingMall.customer.wishlists.items.index(
      connection,
      {
        wishlistId: wishlist.id,
        body: firstPageRequest,
      },
    );
  typia.assert<IPageIShoppingMallWishlistItem.ISummary>(firstPage);

  const firstPagination = firstPage.pagination;
  const firstItems = firstPage.data;

  // Pagination metadata validations for first page
  TestValidator.equals(
    "first page limit matches requested limit",
    firstPagination.limit,
    limit,
  );
  // IPage.IPagination.current is zero-based
  TestValidator.equals("first page index is 0", firstPagination.current, 0);
  TestValidator.predicate(
    "first page item count is positive and within limit",
    firstItems.length > 0 && firstItems.length <= limit,
  );
  TestValidator.predicate(
    "pagination.records is at least totalItems",
    firstPagination.records >= totalItems,
  );

  // All items should belong to the same wishlist
  for (const item of firstItems) {
    TestValidator.equals(
      "first page item wishlist_id matches wishlist.id",
      item.wishlist_id,
      wishlist.id,
    );
  }

  // 5) Retrieve second page of wishlist items
  const secondPageRequest = {
    page: 2,
    limit,
  } satisfies IShoppingMallWishlistItem.IRequest;

  const secondPage: IPageIShoppingMallWishlistItem.ISummary =
    await api.functional.shoppingMall.customer.wishlists.items.index(
      connection,
      {
        wishlistId: wishlist.id,
        body: secondPageRequest,
      },
    );
  typia.assert<IPageIShoppingMallWishlistItem.ISummary>(secondPage);

  const secondPagination = secondPage.pagination;
  const secondItems = secondPage.data;

  TestValidator.equals("second page index is 1", secondPagination.current, 1);
  TestValidator.predicate(
    "second page item count is within limit",
    secondItems.length <= limit,
  );

  for (const item of secondItems) {
    TestValidator.equals(
      "second page item wishlist_id matches wishlist.id",
      item.wishlist_id,
      wishlist.id,
    );
  }

  // If both pages have data, ensure there is no complete overlap in IDs
  if (firstItems.length > 0 && secondItems.length > 0) {
    const firstIds = firstItems.map((i) => i.id);
    const secondIds = secondItems.map((i) => i.id);
    const hasDifferent = secondIds.some((id) => !firstIds.includes(id));

    TestValidator.predicate(
      "second page contains at least one item not in first page",
      hasDifferent,
    );
  }
}
