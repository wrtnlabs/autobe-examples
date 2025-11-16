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

export async function test_api_wishlist_items_list_with_filtering_and_sorting(
  connection: api.IConnection,
) {
  // 1. Join a customer to obtain an authorized session
  const joinBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    ip: null,
    href: "https://example.com/signup",
    referrer: "https://example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const authorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2. Create a wishlist for this customer
  const wishlistBody = {
    name: `Wishlist - ${RandomGenerator.paragraph({ sentences: 2 })}`,
  } satisfies IShoppingMallWishlist.ICreate;

  const wishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: wishlistBody,
    });
  typia.assert(wishlist);

  // 3. Populate the wishlist with multiple items
  const createdItems: IShoppingMallWishlistItem[] = [];
  const ITEM_COUNT = 6;

  for (let i = 0; i < ITEM_COUNT; i++) {
    const createItemBody = typia.random<IShoppingMallWishlistItem.ICreate>();

    const item: IShoppingMallWishlistItem =
      await api.functional.shoppingMall.customer.wishlists.items.create(
        connection,
        {
          wishlistId: wishlist.id,
          body: createItemBody,
        },
      );
    typia.assert(item);
    createdItems.push(item);
  }

  const createdItemIds = createdItems.map((it) => it.id);

  // Helper to assert sorted order by created_at
  const assertSortedByCreatedAt = (
    title: string,
    summaries: IShoppingMallWishlistItem.ISummary[],
    direction: "asc" | "desc",
  ): void => {
    for (let i = 0; i + 1 < summaries.length; i++) {
      const a = summaries[i]!.created_at;
      const b = summaries[i + 1]!.created_at;

      if (direction === "asc") {
        TestValidator.predicate(
          `${title} - ascending order at index ${i}`,
          a <= b,
        );
      } else {
        TestValidator.predicate(
          `${title} - descending order at index ${i}`,
          a >= b,
        );
      }
    }
  };

  // 4. Call wishlist items index with descending sort by createdAt
  const requestDesc = {
    page: 1 as number & tags.Type<"int32">,
    limit: 20 as number & tags.Type<"int32">,
    sortBy: "createdAt",
    sortDirection: "desc" as const,
  } satisfies IShoppingMallWishlistItem.IRequest;

  const pageDesc: IPageIShoppingMallWishlistItem.ISummary =
    await api.functional.shoppingMall.customer.wishlists.items.index(
      connection,
      {
        wishlistId: wishlist.id,
        body: requestDesc,
      },
    );
  typia.assert(pageDesc);

  // Basic invariants: all items belong to this wishlist and are subset of created IDs
  const idsDesc = pageDesc.data.map((s) => s.id);

  for (const summary of pageDesc.data) {
    TestValidator.equals(
      "wishlist_id should match the requested wishlist in desc listing",
      summary.wishlist_id,
      wishlist.id,
    );

    TestValidator.predicate(
      "listed item id should be one of the created items (desc)",
      createdItemIds.includes(summary.id),
    );
  }

  // Assert descending sort order by created_at
  assertSortedByCreatedAt(
    "wishlist items listing sorted by created_at desc",
    pageDesc.data,
    "desc",
  );

  // 5. Call wishlist items index again with ascending sort by createdAt
  const requestAsc = {
    page: 1 as number & tags.Type<"int32">,
    limit: 20 as number & tags.Type<"int32">,
    sortBy: "createdAt",
    sortDirection: "asc" as const,
  } satisfies IShoppingMallWishlistItem.IRequest;

  const pageAsc: IPageIShoppingMallWishlistItem.ISummary =
    await api.functional.shoppingMall.customer.wishlists.items.index(
      connection,
      {
        wishlistId: wishlist.id,
        body: requestAsc,
      },
    );
  typia.assert(pageAsc);

  const idsAsc = pageAsc.data.map((s) => s.id);

  for (const summary of pageAsc.data) {
    TestValidator.equals(
      "wishlist_id should match the requested wishlist in asc listing",
      summary.wishlist_id,
      wishlist.id,
    );

    TestValidator.predicate(
      "listed item id should be one of the created items (asc)",
      createdItemIds.includes(summary.id),
    );
  }

  assertSortedByCreatedAt(
    "wishlist items listing sorted by created_at asc",
    pageAsc.data,
    "asc",
  );

  // Ensure that the dataset between desc and asc listings is consistent on IDs
  TestValidator.equals(
    "IDs from asc and desc listing should match as a set",
    idsDesc.sort(),
    idsAsc.sort(),
  );
}
