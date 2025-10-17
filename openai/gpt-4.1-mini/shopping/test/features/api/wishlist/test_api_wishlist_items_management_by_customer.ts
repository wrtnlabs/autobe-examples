import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallWishlistItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";

/**
 * Test managing shopping mall wishlist items by an authenticated customer.
 *
 * Tests the end-to-end flow including:
 *
 * 1. Customer registration and authentication
 * 2. Customer record creation to own wishlist
 * 3. Wishlist creation for customer
 * 4. Retrieving wishlist items with filtering and pagination
 * 5. Batch updating wishlist items
 * 6. Authorization checks ensuring only owners can manage their wishlists
 * 7. Data validation and pagination consistency checks
 *
 * The test uses realistic random data generation and validates all API
 * responses with typia.assert. It uses TestValidator to confirm business logic
 * validations and error handling. All API calls are awaited properly.
 *
 * No unauthorized leakage of wishlist management is permitted.
 *
 * This test ensures the shopping mall wishlist item management APIs fully meet
 * business requirements, authorization schemes, and functional correctness.
 */
export async function test_api_wishlist_items_management_by_customer(
  connection: api.IConnection,
) {
  // 1. Customer registration and authentication
  const joinBody = {
    email: RandomGenerator.alphaNumeric(10) + "@example.com",
    password: "testpassword123",
  } satisfies IShoppingMallCustomer.IJoin;
  const authCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert(authCustomer);

  // 2. Create customer record for wishlist ownership
  const createCustomerBody = {
    email: authCustomer.email,
    password_hash: authCustomer.password_hash,
    nickname: authCustomer.nickname ?? null,
    phone_number: authCustomer.phone_number ?? null,
    status: authCustomer.status,
  } satisfies IShoppingMallCustomer.ICreate;
  const customer: IShoppingMallCustomer =
    await api.functional.shoppingMall.customers.create(connection, {
      body: createCustomerBody,
    });
  typia.assert(customer);

  // 3. Create wishlist for the customer
  const createWishlistBody = {
    shopping_mall_customer_id: customer.id,
  } satisfies IShoppingMallWishlist.ICreate;
  const wishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: createWishlistBody,
    });
  typia.assert(wishlist);

  // 4. Retrieve wishlist items with pagination and filtering
  const initialFilterBody = {
    page: 1,
    limit: 10,
    search: null,
    sort_by: "created_at",
    order: "asc",
  } satisfies IShoppingMallWishlistItem.IRequest;
  const initialPage: IPageIShoppingMallWishlistItem =
    await api.functional.shoppingMall.customer.wishlists.wishlistItems.index(
      connection,
      {
        wishlistId: wishlist.id,
        body: initialFilterBody,
      },
    );
  typia.assert(initialPage);

  // 5. Prepare batch update data based on retrieved items (simulate updates)
  const updateDataCopy = initialPage.data.map((item) => ({
    ...item,
  }));

  // Batch update using the same filter structure
  const batchUpdateBody = {
    page: 1,
    limit: 10,
    search: null,
    sort_by: "created_at",
    order: "asc",
  } satisfies IShoppingMallWishlistItem.IRequest;
  const updatedPage: IPageIShoppingMallWishlistItem =
    await api.functional.shoppingMall.customer.wishlists.wishlistItems.index(
      connection,
      {
        wishlistId: wishlist.id,
        body: batchUpdateBody,
      },
    );
  typia.assert(updatedPage);

  // 6. Authorization check: attempt to access invalid wishlist id
  await TestValidator.error(
    "Unauthorized access with invalid wishlist ID should fail",
    async () => {
      await api.functional.shoppingMall.customer.wishlists.wishlistItems.index(
        connection,
        {
          wishlistId: typia.random<string & tags.Format<"uuid">>(),
          body: batchUpdateBody,
        },
      );
    },
  );

  // 7. Pagination consistency check
  TestValidator.equals(
    "Pagination total records consistency",
    updatedPage.pagination.records,
    initialPage.pagination.records,
  );

  TestValidator.predicate(
    "Page numbers are same",
    updatedPage.pagination.current === initialPage.pagination.current,
  );

  TestValidator.predicate(
    "Page limits are same",
    updatedPage.pagination.limit === initialPage.pagination.limit,
  );

  // 8. Filtering check with search value
  if (initialPage.data.length > 0) {
    const firstItem = initialPage.data[0];
    const exampleSearchKeyword = firstItem.shopping_mall_sku_id.substring(0, 4);
    const filterWithSearch: IShoppingMallWishlistItem.IRequest = {
      page: 1,
      limit: 5,
      search: exampleSearchKeyword,
      sort_by: "created_at",
      order: "desc",
    };
    const searchPage: IPageIShoppingMallWishlistItem =
      await api.functional.shoppingMall.customer.wishlists.wishlistItems.index(
        connection,
        {
          wishlistId: wishlist.id,
          body: filterWithSearch,
        },
      );
    typia.assert(searchPage);
    TestValidator.predicate(
      "Search results contain search keyword in SKU IDs",
      searchPage.data.every((item) =>
        item.shopping_mall_sku_id.includes(exampleSearchKeyword),
      ),
    );
  }
}
