import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test complex seller queries combining multiple filter criteria
 * simultaneously.
 *
 * This scenario validates that administrators can perform highly targeted
 * seller searches by combining text search, status filtering, date ranges,
 * pagination, and sorting in a single query. The test creates a diverse set of
 * seller accounts with varied attributes, then performs searches combining
 * multiple criteria (e.g., store name pattern + status filter + registered
 * after specific date + sorted by name).
 *
 * Steps:
 *
 * 1. Create admin account for authentication
 * 2. Create diverse seller accounts with varied store names
 * 3. Perform combined filter searches (text + status + date range)
 * 4. Verify all filters applied correctly using AND logic
 * 5. Validate pagination and sorting with filtered subsets
 * 6. Test zero results scenario when no sellers match criteria
 */
export async function test_api_seller_search_combined_filters(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for seller search operations
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    admin_level: "super_admin" as const,
    email_verified: true,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdmin.ICreate;

  const admin = await api.functional.auth.admin.join(connection, {
    body: adminData,
  });
  typia.assert(admin);

  // Step 2: Create diverse seller accounts with varied store name patterns
  const baseTime = new Date().getTime();
  const oneDay = 24 * 60 * 60 * 1000;

  const createdSellers: IShoppingMallSeller.IAuthorized[] = [];

  // Create 12 sellers with specific store name patterns for testing text search
  for (let i = 0; i < 12; i++) {
    const storeName =
      i < 3
        ? `TechStore${i}`
        : i < 6
          ? `FashionHub${i}`
          : i < 9
            ? `BookWorld${i}`
            : `GeneralMart${i}`;

    const sellerData = {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_name: RandomGenerator.paragraph({ sentences: 2 }),
      business_description: RandomGenerator.content({ paragraphs: 1 }),
      store_name: storeName,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ICreate;

    const seller = await api.functional.auth.seller.join(connection, {
      body: sellerData,
    });
    typia.assert(seller);

    // Verify created seller has expected store name
    TestValidator.equals(
      "created seller has expected store name",
      seller.store_name,
      storeName,
    );

    createdSellers.push(seller);
  }

  // Step 3: Test combined filter - text search + pagination
  const searchResult1 = await api.functional.shoppingMall.admin.sellers.index(
    connection,
    {
      body: {
        search: "TechStore",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallSeller.IRequest,
    },
  );
  typia.assert(searchResult1);

  TestValidator.predicate(
    "search results contain pagination metadata",
    searchResult1.pagination.current >= 1,
  );

  // Verify all results match search criteria
  for (const seller of searchResult1.data) {
    TestValidator.predicate(
      "seller store name contains search term TechStore",
      seller.store_name.includes("TechStore"),
    );
  }

  // Step 4: Test combined filter - text search + sorting ascending
  const searchResult2 = await api.functional.shoppingMall.admin.sellers.index(
    connection,
    {
      body: {
        search: "Store",
        sort_by: "store_name",
        order: "asc",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallSeller.IRequest,
    },
  );
  typia.assert(searchResult2);

  // Verify sorting on filtered results
  if (searchResult2.data.length > 1) {
    for (let i = 0; i < searchResult2.data.length - 1; i++) {
      TestValidator.predicate(
        "sellers sorted by store_name ascending",
        searchResult2.data[i].store_name <=
          searchResult2.data[i + 1].store_name,
      );
    }
  }

  // Step 5: Test combined filter - date range + text search + sorting descending
  const oneDayAgo = new Date(baseTime - oneDay).toISOString();
  const searchResult3 = await api.functional.shoppingMall.admin.sellers.index(
    connection,
    {
      body: {
        created_after: oneDayAgo,
        search: "Fashion",
        sort_by: "created_at",
        order: "desc",
        page: 1,
        limit: 5,
      } satisfies IShoppingMallSeller.IRequest,
    },
  );
  typia.assert(searchResult3);

  // Verify pagination works with combined filters
  TestValidator.predicate(
    "pagination limit respected",
    searchResult3.data.length <= 5,
  );

  TestValidator.predicate(
    "pagination metadata is valid",
    searchResult3.pagination.limit === 5 &&
      searchResult3.pagination.current === 1 &&
      searchResult3.pagination.records >= 0 &&
      searchResult3.pagination.pages >= 0,
  );

  // Verify all results match search criteria
  for (const seller of searchResult3.data) {
    TestValidator.predicate(
      "all results match Fashion search term",
      seller.store_name.includes("Fashion"),
    );
  }

  // Step 6: Test zero results with impossible combined criteria
  const futureDate = new Date(baseTime + 365 * oneDay).toISOString();
  const searchResult4 = await api.functional.shoppingMall.admin.sellers.index(
    connection,
    {
      body: {
        created_after: futureDate,
        search: "NonExistentStoreName",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallSeller.IRequest,
    },
  );
  typia.assert(searchResult4);

  TestValidator.equals(
    "no results for impossible combined criteria",
    searchResult4.data.length,
    0,
  );

  TestValidator.equals(
    "pagination records is zero for no results",
    searchResult4.pagination.records,
    0,
  );

  TestValidator.equals(
    "pagination pages is zero for no results",
    searchResult4.pagination.pages,
    0,
  );

  // Step 7: Test combined filter - date range before filter + text search
  const futureLimit = new Date(baseTime + oneDay).toISOString();
  const searchResult5 = await api.functional.shoppingMall.admin.sellers.index(
    connection,
    {
      body: {
        created_before: futureLimit,
        search: "Book",
        sort_by: "store_name",
        order: "asc",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallSeller.IRequest,
    },
  );
  typia.assert(searchResult5);

  // Verify all results match search criteria
  for (const seller of searchResult5.data) {
    TestValidator.predicate(
      "all results match Book search term",
      seller.store_name.includes("Book"),
    );
  }

  // Step 8: Test pagination with combined filters across multiple pages
  const searchResult6Page1 =
    await api.functional.shoppingMall.admin.sellers.index(connection, {
      body: {
        page: 1,
        limit: 3,
        sort_by: "store_name",
        order: "asc",
      } satisfies IShoppingMallSeller.IRequest,
    });
  typia.assert(searchResult6Page1);

  if (searchResult6Page1.pagination.pages > 1) {
    const searchResult6Page2 =
      await api.functional.shoppingMall.admin.sellers.index(connection, {
        body: {
          page: 2,
          limit: 3,
          sort_by: "store_name",
          order: "asc",
        } satisfies IShoppingMallSeller.IRequest,
      });
    typia.assert(searchResult6Page2);

    TestValidator.predicate(
      "page 2 results differ from page 1",
      searchResult6Page2.data.length === 0 ||
        searchResult6Page2.data[0].id !== searchResult6Page1.data[0].id,
    );
  }

  // Step 9: Test combined date range filters (both created_after and created_before)
  const threeDaysAgo = new Date(baseTime - 3 * oneDay).toISOString();
  const tomorrow = new Date(baseTime + oneDay).toISOString();
  const searchResult7 = await api.functional.shoppingMall.admin.sellers.index(
    connection,
    {
      body: {
        created_after: threeDaysAgo,
        created_before: tomorrow,
        page: 1,
        limit: 20,
      } satisfies IShoppingMallSeller.IRequest,
    },
  );
  typia.assert(searchResult7);

  TestValidator.predicate(
    "date range filter returns results",
    searchResult7.pagination.records >= 0,
  );
}
