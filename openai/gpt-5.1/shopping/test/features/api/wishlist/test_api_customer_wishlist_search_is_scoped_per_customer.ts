import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallWishlist";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";

/**
 * Ensure wishlist search results are scoped per customer.
 *
 * Business objective:
 *
 * - When a customer lists wishlists through PATCH
 *   /shoppingMall/customer/wishlists, only wishlists owned by that
 *   authenticated customer must be returned. Wishlists belonging to other
 *   customers must never appear in the result set.
 *
 * Test flow:
 *
 * 1. Register Customer A with POST /auth/customer/join.
 * 2. While authenticated as Customer A, create two wishlists ("A-List 1", "A-List
 *    2").
 * 3. Register Customer B with POST /auth/customer/join, switching the connection
 *    context to Customer B.
 * 4. While authenticated as Customer B, create two wishlists ("B-List 1", "B-List
 *    2").
 * 5. Call PATCH /shoppingMall/customer/wishlists as Customer B with a broad search
 *    (page=1, limit=10) and verify that:
 *
 *    - Every wishlist summary is owned by Customer B.
 *    - No wishlist IDs from Customer A appear.
 * 6. Register a new Customer A2 (another independent customer) and create two
 *    wishlists for A2.
 * 7. Call PATCH /shoppingMall/customer/wishlists as Customer A2 and verify that:
 *
 *    - Every wishlist summary is owned by Customer A2.
 *    - No wishlist IDs from Customer B appear.
 *
 * This confirms that wishlist listing is strictly scoped to the authenticated
 * customer and enforces per-customer data isolation.
 */
export async function test_api_customer_wishlist_search_is_scoped_per_customer(
  connection: api.IConnection,
) {
  // Helper to build a realistic join body
  const buildJoinBody = () => {
    const body = {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
      ip: null,
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
    } satisfies IShoppingMallCustomerAuth.IJoin;
    return body;
  };

  // 1. Register first customer (Customer A)
  const joinABody = buildJoinBody();
  const customerAAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinABody,
    });
  typia.assert(customerAAuth);
  const customerAId = customerAAuth.id;

  // 2. Create two wishlists under Customer A
  const aWishlistNames = ["A-List 1", "A-List 2"] as const;
  const aWishlists: IShoppingMallWishlist[] = [];
  for (const name of aWishlistNames) {
    const created: IShoppingMallWishlist =
      await api.functional.shoppingMall.customer.wishlists.create(connection, {
        body: {
          name,
        } satisfies IShoppingMallWishlist.ICreate,
      });
    typia.assert(created);
    aWishlists.push(created);
  }
  const aWishlistIds = aWishlists.map((w) => w.id);

  // 3. Register second customer (Customer B)
  const joinBBody = buildJoinBody();
  const customerBAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBBody,
    });
  typia.assert(customerBAuth);
  const customerBId = customerBAuth.id;

  // 4. Create two wishlists under Customer B
  const bWishlistNames = ["B-List 1", "B-List 2"] as const;
  const bWishlists: IShoppingMallWishlist[] = [];
  for (const name of bWishlistNames) {
    const created: IShoppingMallWishlist =
      await api.functional.shoppingMall.customer.wishlists.create(connection, {
        body: {
          name,
        } satisfies IShoppingMallWishlist.ICreate,
      });
    typia.assert(created);
    bWishlists.push(created);
  }
  const bWishlistIds = bWishlists.map((w) => w.id);

  // 5. While authenticated as Customer B, search wishlists
  // connection is currently authenticated as B because the last join call set the token
  const bSearchRequest = {
    page: 1,
    limit: 10,
  } satisfies IShoppingMallWishlist.IRequest;

  const bPage: IPageIShoppingMallWishlist.ISummary =
    await api.functional.shoppingMall.customer.wishlists.index(connection, {
      body: bSearchRequest,
    });
  typia.assert(bPage);
  typia.assert(bPage.pagination);
  bPage.data.forEach((summary) => typia.assert(summary));

  // Assert that every wishlist belongs to B and none are from A
  for (const summary of bPage.data) {
    TestValidator.equals(
      "wishlist owner should be customer B in B's search",
      summary.customer.id,
      customerBId,
    );
    TestValidator.predicate(
      "B search results must not contain A's wishlist IDs",
      aWishlistIds.includes(summary.id) === false,
    );
  }

  // 6. Register another customer (Customer A2) to validate isolation in the other direction
  const joinA2Body = buildJoinBody();
  const customerA2Auth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinA2Body,
    });
  typia.assert(customerA2Auth);
  const customerA2Id = customerA2Auth.id;

  // Create two wishlists for Customer A2 so that search has data
  const a2WishlistNames = ["A2-List 1", "A2-List 2"] as const;
  const a2Wishlists: IShoppingMallWishlist[] = [];
  for (const name of a2WishlistNames) {
    const created: IShoppingMallWishlist =
      await api.functional.shoppingMall.customer.wishlists.create(connection, {
        body: {
          name,
        } satisfies IShoppingMallWishlist.ICreate,
      });
    typia.assert(created);
    a2Wishlists.push(created);
  }

  const a2SearchRequest = {
    page: 1,
    limit: 10,
  } satisfies IShoppingMallWishlist.IRequest;

  const a2Page: IPageIShoppingMallWishlist.ISummary =
    await api.functional.shoppingMall.customer.wishlists.index(connection, {
      body: a2SearchRequest,
    });
  typia.assert(a2Page);
  typia.assert(a2Page.pagination);
  a2Page.data.forEach((summary) => typia.assert(summary));

  for (const summary of a2Page.data) {
    TestValidator.equals(
      "wishlist owner should be customer A2 in A2's search",
      summary.customer.id,
      customerA2Id,
    );
    TestValidator.predicate(
      "A2 search results must not contain B's wishlist IDs",
      bWishlistIds.includes(summary.id) === false,
    );
  }
}
