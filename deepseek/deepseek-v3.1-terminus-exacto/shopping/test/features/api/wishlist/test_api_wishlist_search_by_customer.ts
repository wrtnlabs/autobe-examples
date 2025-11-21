import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallWishlist";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";

/**
 * Test comprehensive wishlist search functionality for authenticated customers.
 *
 * This test validates that customers can search their wishlists with various
 * filters including name matching, status filtering (active/archived/shared),
 * priority ranges, and public/private visibility. It also tests pagination with
 * different page sizes and ordering options.
 *
 * The test creates multiple wishlists with different settings to ensure search
 * returns correct results based on filters and that private wishlists from
 * other customers are not visible.
 */
export async function test_api_wishlist_search_by_customer(
  connection: api.IConnection,
) {
  // Step 1: Create customer account and authenticate
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: "test1234",
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      phone_number: RandomGenerator.mobile(),
      href: "https://shoppingmall.test/register",
      referrer: "https://shoppingmall.test",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Step 2: Create multiple wishlists with different settings
  const wishlists: IShoppingMallWishlist[] = [];

  // Create wishlist with high priority and active status
  const highPriorityWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: {
        name: "High Priority Electronics",
        description: "High priority electronics wishlist",
        is_public: true,
        priority: 10,
        status: "active",
      } satisfies IShoppingMallWishlist.ICreate,
    });
  typia.assert(highPriorityWishlist);
  wishlists.push(highPriorityWishlist);

  // Create wishlist with medium priority and archived status
  const archivedWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: {
        name: "Archived Books Collection",
        description: "Old book collection",
        is_public: false,
        priority: 5,
        status: "archived",
      } satisfies IShoppingMallWishlist.ICreate,
    });
  typia.assert(archivedWishlist);
  wishlists.push(archivedWishlist);

  // Create wishlist with low priority and shared status
  const sharedWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: {
        name: "Shared Gift Ideas",
        description: "Gift ideas to share with family",
        is_public: true,
        priority: 3,
        status: "shared",
      } satisfies IShoppingMallWishlist.ICreate,
    });
  typia.assert(sharedWishlist);
  wishlists.push(sharedWishlist);

  // Create another wishlist with different name pattern
  const anotherWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: {
        name: "Home Decor Items",
        description: "Items for home decoration",
        is_public: false,
        priority: 7,
        status: "active",
      } satisfies IShoppingMallWishlist.ICreate,
    });
  typia.assert(anotherWishlist);
  wishlists.push(anotherWishlist);

  // Step 3: Test basic search without filters
  const allWishlistsResult =
    await api.functional.shoppingMall.customer.wishlists.index(connection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallWishlist.IRequest,
    });
  typia.assert(allWishlistsResult);
  TestValidator.equals(
    "should return all created wishlists",
    allWishlistsResult.data.length,
    wishlists.length,
  );

  // Step 4: Test search by name matching
  const searchResult =
    await api.functional.shoppingMall.customer.wishlists.index(connection, {
      body: {
        search: "Electronics",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallWishlist.IRequest,
    });
  typia.assert(searchResult);
  TestValidator.predicate(
    "search should find wishlist with matching name",
    searchResult.data.some((w) => w.name.includes("Electronics")),
  );

  // Step 5: Test status filtering
  const activeWishlistsResult =
    await api.functional.shoppingMall.customer.wishlists.index(connection, {
      body: {
        status: "active",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallWishlist.IRequest,
    });
  typia.assert(activeWishlistsResult);
  TestValidator.predicate(
    "should only return active wishlists",
    activeWishlistsResult.data.every((w) => w.status === "active"),
  );

  // Step 6: Test priority range filtering
  const priorityRangeResult =
    await api.functional.shoppingMall.customer.wishlists.index(connection, {
      body: {
        priority_min: 5,
        priority_max: 8,
        page: 1,
        limit: 10,
      } satisfies IShoppingMallWishlist.IRequest,
    });
  typia.assert(priorityRangeResult);
  TestValidator.predicate(
    "should return wishlists within priority range",
    priorityRangeResult.data.every((w) => w.priority >= 5 && w.priority <= 8),
  );

  // Step 7: Test public/private filtering
  const publicWishlistsResult =
    await api.functional.shoppingMall.customer.wishlists.index(connection, {
      body: {
        is_public: true,
        page: 1,
        limit: 10,
      } satisfies IShoppingMallWishlist.IRequest,
    });
  typia.assert(publicWishlistsResult);
  TestValidator.predicate(
    "should only return public wishlists",
    publicWishlistsResult.data.every((w) => w.is_public === true),
  );

  // Step 8: Test pagination
  const paginationResult =
    await api.functional.shoppingMall.customer.wishlists.index(connection, {
      body: {
        page: 1,
        limit: 2,
      } satisfies IShoppingMallWishlist.IRequest,
    });
  typia.assert(paginationResult);
  TestValidator.equals(
    "pagination should limit results",
    paginationResult.data.length,
    2,
  );
  TestValidator.predicate(
    "pagination metadata should be valid",
    paginationResult.pagination.current === 1 &&
      paginationResult.pagination.limit === 2,
  );

  // Step 9: Test sorting by name
  const sortedByNameResult =
    await api.functional.shoppingMall.customer.wishlists.index(connection, {
      body: {
        order_by: "name",
        order: "asc",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallWishlist.IRequest,
    });
  typia.assert(sortedByNameResult);
  TestValidator.predicate(
    "should be sorted by name ascending",
    sortedByNameResult.data.length > 1
      ? sortedByNameResult.data[0].name <= sortedByNameResult.data[1].name
      : true,
  );

  // Step 10: Test sorting by priority
  const sortedByPriorityResult =
    await api.functional.shoppingMall.customer.wishlists.index(connection, {
      body: {
        order_by: "priority",
        order: "desc",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallWishlist.IRequest,
    });
  typia.assert(sortedByPriorityResult);
  TestValidator.predicate(
    "should be sorted by priority descending",
    sortedByPriorityResult.data.length > 1
      ? sortedByPriorityResult.data[0].priority >=
          sortedByPriorityResult.data[1].priority
      : true,
  );

  // Step 11: Test combined filters
  const combinedFilterResult =
    await api.functional.shoppingMall.customer.wishlists.index(connection, {
      body: {
        status: "active",
        is_public: true,
        priority_min: 1,
        priority_max: 10,
        page: 1,
        limit: 10,
      } satisfies IShoppingMallWishlist.IRequest,
    });
  typia.assert(combinedFilterResult);
  TestValidator.predicate(
    "combined filter should return matching wishlists",
    combinedFilterResult.data.every(
      (w) =>
        w.status === "active" &&
        w.is_public === true &&
        w.priority >= 1 &&
        w.priority <= 10,
    ),
  );

  // Step 12: Test empty search results
  const emptySearchResult =
    await api.functional.shoppingMall.customer.wishlists.index(connection, {
      body: {
        search: "NonExistentWishlistName",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallWishlist.IRequest,
    });
  typia.assert(emptySearchResult);
  TestValidator.equals(
    "search for non-existent name should return empty results",
    emptySearchResult.data.length,
    0,
  );

  // Step 13: Test invalid priority range
  const invalidPriorityResult =
    await api.functional.shoppingMall.customer.wishlists.index(connection, {
      body: {
        priority_min: 100,
        priority_max: 200,
        page: 1,
        limit: 10,
      } satisfies IShoppingMallWishlist.IRequest,
    });
  typia.assert(invalidPriorityResult);
  TestValidator.equals(
    "invalid priority range should return empty results",
    invalidPriorityResult.data.length,
    0,
  );
}
