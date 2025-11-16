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
 * Ensure that wishlist item listing is restricted to the owning customer.
 *
 * Business goal
 *
 * - Verify that PATCH /shoppingMall/customer/wishlists/{wishlistId}/items
 *   (api.functional.shoppingMall.customer.wishlists.items.index) only returns
 *   data to the customer who owns the wishlist and rejects cross-account
 *   listing attempts.
 *
 * High-level flow
 *
 * 1. Customer A joins (registration) and becomes authenticated.
 * 2. Optionally, Customer A completes email verification (type-level only).
 * 3. Customer A creates a wishlist.
 * 4. Customer A adds multiple items into the wishlist.
 * 5. Customer A lists items in their wishlist (positive ownership control).
 * 6. Customer B joins and becomes authenticated (Authorization header switches to
 *    B).
 * 7. Customer B attempts to list Customer A's wishlist items and should get an
 *    error.
 *
 * Assertions
 *
 * - For Customer A, listing returns a valid page of wishlist item summaries and
 *   includes at least as many records as the number of created items, within
 *   the requested limit.
 * - For Customer B, attempting to list using A's wishlistId fails with an error,
 *   proving that cross-account access to wishlist items is not allowed.
 */
export async function test_api_wishlist_items_list_ownership_enforced(
  connection: api.IConnection,
) {
  // 1. Register Customer A and authenticate
  const joinAEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const joinAInput = {
    email: joinAEmail,
    password: "password-A",
    name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerA: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinAInput,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerA);

  // 2. (Optional) Email verification for Customer A
  const verifyAInput = typia.random<IShoppingMallCustomerAuth.IVerifyEmail>();
  const verifiedA: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.email.verify.verifyEmail(connection, {
      body: verifyAInput,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(verifiedA);

  // 3. Customer A creates a wishlist
  const wishlistCreateInput = {
    name: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallWishlist.ICreate;

  const wishlistA: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: wishlistCreateInput,
    });
  typia.assert<IShoppingMallWishlist>(wishlistA);

  // 4. Customer A adds multiple items to wishlistA
  const itemsToCreateCount = 3;
  const createdItems: IShoppingMallWishlistItem[] = [];

  for (let i = 0; i < itemsToCreateCount; i++) {
    const createItemInput = {
      shopping_mall_product_id: typia.random<string & tags.Format<"uuid">>(),
      shopping_mall_product_sku_id: null,
    } satisfies IShoppingMallWishlistItem.ICreate;

    const item: IShoppingMallWishlistItem =
      await api.functional.shoppingMall.customer.wishlists.items.create(
        connection,
        {
          wishlistId: wishlistA.id,
          body: createItemInput,
        },
      );
    typia.assert<IShoppingMallWishlistItem>(item);
    createdItems.push(item);
  }

  // 5. Positive control: Customer A lists their own wishlist items
  const listRequestForA = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
  } satisfies IShoppingMallWishlistItem.IRequest;

  const pageForA: IPageIShoppingMallWishlistItem.ISummary =
    await api.functional.shoppingMall.customer.wishlists.items.index(
      connection,
      {
        wishlistId: wishlistA.id,
        body: listRequestForA,
      },
    );
  typia.assert<IPageIShoppingMallWishlistItem.ISummary>(pageForA);

  TestValidator.predicate(
    "owner listing should return at least as many records as created items (within limit)",
    pageForA.data.length >= createdItems.length ||
      pageForA.pagination.records >= createdItems.length,
  );

  // 6. Register Customer B, which also switches Authorization on the same connection
  const joinBEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const joinBInput = {
    email: joinBEmail,
    password: "password-B",
    name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerB: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBInput,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerB);

  const verifyBInput = typia.random<IShoppingMallCustomerAuth.IVerifyEmail>();
  const verifiedB: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.email.verify.verifyEmail(connection, {
      body: verifyBInput,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(verifiedB);

  // 7. Negative test: Customer B attempts to list Customer A's wishlist items
  const listRequestForB = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
  } satisfies IShoppingMallWishlistItem.IRequest;

  await TestValidator.error(
    "non-owner cannot list another customer's wishlist items",
    async () => {
      await api.functional.shoppingMall.customer.wishlists.items.index(
        connection,
        {
          wishlistId: wishlistA.id,
          body: listRequestForB,
        },
      );
    },
  );
}
