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
 * Test advanced wishlist search with multiple filter combinations.
 *
 * This comprehensive test validates the complex filtering capabilities of the
 * wishlist search API. It creates diverse wishlists with specific
 * characteristics and tests various filter combinations including name search,
 * status filters, priority ranges, and visibility settings.
 */
export async function test_api_wishlist_search_with_complex_filters(
  connection: api.IConnection,
) {
  // 1. Create customer account for authentication
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      phone_number: RandomGenerator.mobile(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // 2. Create diverse wishlists with controlled characteristics
  const wishlistConfigs = [
    {
      name: "High Priority Public",
      is_public: true,
      priority: 9,
      status: "active" as const,
    },
    {
      name: "Low Priority Private",
      is_public: false,
      priority: 2,
      status: "active" as const,
    },
    {
      name: "Archived Wishlist",
      is_public: true,
      priority: 5,
      status: "archived" as const,
    },
    {
      name: "Shared Collection",
      is_public: false,
      priority: 7,
      status: "shared" as const,
    },
    {
      name: "Medium Public Active",
      is_public: true,
      priority: 6,
      status: "active" as const,
    },
    {
      name: "High Private Archived",
      is_public: false,
      priority: 8,
      status: "archived" as const,
    },
  ];

  const createdWishlists = await ArrayUtil.asyncRepeat(
    wishlistConfigs.length,
    async (index) => {
      const config = wishlistConfigs[index];
      const wishlistData = {
        name: `${config.name} ${RandomGenerator.paragraph({ sentences: 1, wordMin: 2, wordMax: 4 })}`,
        description: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 3,
          sentenceMax: 5,
        }),
        is_public: config.is_public,
        priority: config.priority satisfies number as number,
        status: config.status,
      } satisfies IShoppingMallWishlist.ICreate;

      const wishlist =
        await api.functional.shoppingMall.customer.wishlists.create(
          connection,
          { body: wishlistData },
        );
      typia.assert(wishlist);
      return wishlist;
    },
  );

  // 3. Test 1: Search by name with partial matching
  const searchResult1 =
    await api.functional.shoppingMall.customer.wishlists.index(connection, {
      body: {
        search: "High Priority" satisfies string &
          tags.MinLength<1> &
          tags.MaxLength<255>,
        page: 1,
        limit: 10,
      } satisfies IShoppingMallWishlist.IRequest,
    });
  typia.assert(searchResult1);
  TestValidator.predicate(
    "search by name returns matching wishlists",
    searchResult1.data.length > 0,
  );

  // 4. Test 2: Filter by active status
  const searchResult2 =
    await api.functional.shoppingMall.customer.wishlists.index(connection, {
      body: {
        status: "active",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallWishlist.IRequest,
    });
  typia.assert(searchResult2);
  TestValidator.predicate(
    "status filter returns only active wishlists",
    searchResult2.data.every((wishlist) => wishlist.status === "active"),
  );

  // 5. Test 3: Priority range filtering (3-7 inclusive)
  const searchResult3 =
    await api.functional.shoppingMall.customer.wishlists.index(connection, {
      body: {
        priority_min: 3 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
        priority_max: 7 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
        page: 1,
        limit: 10,
      } satisfies IShoppingMallWishlist.IRequest,
    });
  typia.assert(searchResult3);
  TestValidator.predicate(
    "priority range filter returns wishlists within range",
    searchResult3.data.every(
      (wishlist) => wishlist.priority >= 3 && wishlist.priority <= 7,
    ),
  );

  // 6. Test 4: Public visibility filter
  const searchResult4 =
    await api.functional.shoppingMall.customer.wishlists.index(connection, {
      body: {
        is_public: true,
        page: 1,
        limit: 10,
      } satisfies IShoppingMallWishlist.IRequest,
    });
  typia.assert(searchResult4);
  TestValidator.predicate(
    "visibility filter returns only public wishlists",
    searchResult4.data.every((wishlist) => wishlist.is_public === true),
  );

  // 7. Test 5: Combined filters with comprehensive validation
  const searchResult5 =
    await api.functional.shoppingMall.customer.wishlists.index(connection, {
      body: {
        search: "Priority" satisfies string &
          tags.MinLength<1> &
          tags.MaxLength<255>,
        status: "active",
        is_public: true,
        priority_min: 5 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
        priority_max: 9 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
        page: 1,
        limit: 5,
        order_by: "priority",
        order: "desc",
      } satisfies IShoppingMallWishlist.IRequest,
    });
  typia.assert(searchResult5);

  // Validate all combined filter conditions
  TestValidator.predicate(
    "combined filters return wishlists matching all criteria",
    searchResult5.data.every(
      (wishlist) =>
        wishlist.name.includes("Priority") &&
        wishlist.status === "active" &&
        wishlist.is_public === true &&
        wishlist.priority >= 5 &&
        wishlist.priority <= 9,
    ),
  );

  // Validate sorting by priority descending
  TestValidator.predicate(
    "results are sorted by priority descending",
    searchResult5.data.every(
      (wishlist, index, array) =>
        index === 0 || wishlist.priority <= array[index - 1].priority,
    ),
  );

  // 8. Test 6: Pagination boundaries
  const searchResult6 =
    await api.functional.shoppingMall.customer.wishlists.index(connection, {
      body: {
        page: 1,
        limit: 2,
      } satisfies IShoppingMallWishlist.IRequest,
    });
  typia.assert(searchResult6);
  TestValidator.equals(
    "pagination returns correct number of items",
    searchResult6.data.length,
    2,
  );

  // 9. Test 7: Empty result scenario
  const searchResult7 =
    await api.functional.shoppingMall.customer.wishlists.index(connection, {
      body: {
        search: "NonexistentWishlistNameXYZ" satisfies string &
          tags.MinLength<1> &
          tags.MaxLength<255>,
        page: 1,
        limit: 10,
      } satisfies IShoppingMallWishlist.IRequest,
    });
  typia.assert(searchResult7);
  TestValidator.equals(
    "non-matching search returns empty results",
    searchResult7.data.length,
    0,
  );

  // 10. Validate pagination metadata consistency across all searches
  TestValidator.predicate(
    "pagination metadata is consistent across searches",
    searchResult1.pagination.current === 1 &&
      searchResult1.pagination.limit === 10 &&
      searchResult1.pagination.pages >= 1 &&
      searchResult1.pagination.records >= searchResult1.data.length,
  );

  // 11. Test 8: Sorting by different criteria
  const searchResult8 =
    await api.functional.shoppingMall.customer.wishlists.index(connection, {
      body: {
        order_by: "name",
        order: "asc",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallWishlist.IRequest,
    });
  typia.assert(searchResult8);
  TestValidator.predicate(
    "sorting by name ascending works correctly",
    searchResult8.data.every(
      (wishlist, index, array) =>
        index === 0 || wishlist.name.localeCompare(array[index - 1].name) >= 0,
    ),
  );
}
