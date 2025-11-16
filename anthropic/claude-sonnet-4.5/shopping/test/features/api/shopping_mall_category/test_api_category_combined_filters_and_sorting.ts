import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCategory";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

/**
 * Test complex category queries combining multiple filters with sorting and
 * pagination.
 *
 * This test validates the robustness of the category query engine by testing
 * how multiple query parameters work together: search filtering, parent
 * category filtering, status filtering, sorting by display_order, and
 * pagination. The test ensures that all these parameters combine correctly
 * without conflicts and return accurate results.
 *
 * Process:
 *
 * 1. Authenticate as admin
 * 2. Create hierarchical category structure with varied attributes
 * 3. Execute combined query with multiple filters, sorting, and pagination
 * 4. Validate all results match all filter criteria
 * 5. Verify correct sort order and pagination metadata
 */
export async function test_api_category_combined_filters_and_sorting(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: "super_admin",
      email_verified: true,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create root categories
  const rootCategory1 =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name: "Electronics",
        slug: "electronics",
        display_order: 1,
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(rootCategory1);

  const rootCategory2 =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name: "Fashion",
        slug: "fashion",
        display_order: 2,
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(rootCategory2);

  const rootCategory3 =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name: "Home",
        slug: "home",
        display_order: 3,
        status: "inactive",
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(rootCategory3);

  // Step 3: Create child categories under Electronics with searchable names
  const smartphone1 = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        parent_id: rootCategory1.id,
        name: "Smartphone Pro",
        slug: "smartphone-pro",
        display_order: 10,
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(smartphone1);

  const smartphone2 = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        parent_id: rootCategory1.id,
        name: "Smartphone Basic",
        slug: "smartphone-basic",
        display_order: 20,
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(smartphone2);

  const laptop = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        parent_id: rootCategory1.id,
        name: "Laptop",
        slug: "laptop",
        display_order: 30,
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(laptop);

  const tablet = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        parent_id: rootCategory1.id,
        name: "Tablet",
        slug: "tablet",
        display_order: 40,
        status: "inactive",
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(tablet);

  const smartwatch = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        parent_id: rootCategory1.id,
        name: "Smartwatch",
        slug: "smartwatch",
        display_order: 50,
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(smartwatch);

  // Step 4: Execute combined query - search for "Smartphone" under Electronics, active only, sorted by display_order
  const searchResult = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        search: "Smartphone",
        parent_id: rootCategory1.id,
        status: "active",
        sort_by: "display_order",
        sort_direction: "asc",
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(searchResult);

  // Step 5: Validate filter results
  TestValidator.equals(
    "should return exactly 2 smartphone categories",
    searchResult.data.length,
    2,
  );

  // Verify all results match search term
  for (const category of searchResult.data) {
    TestValidator.predicate(
      "category name contains search term Smartphone",
      category.name.includes("Smartphone"),
    );
  }

  // Verify all results match parent_id filter
  for (const category of searchResult.data) {
    TestValidator.equals(
      "category parent_id matches filter",
      category.parent_id,
      rootCategory1.id,
    );
  }

  // Verify all results match status filter
  for (const category of searchResult.data) {
    TestValidator.equals(
      "category status is active",
      category.status,
      "active",
    );
  }

  // Step 6: Verify sort order (should be ascending by display_order)
  TestValidator.predicate(
    "first result is Smartphone Pro (display_order 10)",
    searchResult.data[0].name === "Smartphone Pro" &&
      searchResult.data[0].display_order === 10,
  );

  TestValidator.predicate(
    "second result is Smartphone Basic (display_order 20)",
    searchResult.data[1].name === "Smartphone Basic" &&
      searchResult.data[1].display_order === 20,
  );

  TestValidator.predicate(
    "categories sorted by display_order ascending",
    searchResult.data[0].display_order < searchResult.data[1].display_order,
  );

  // Step 7: Verify pagination metadata
  TestValidator.equals(
    "pagination current page is 1",
    searchResult.pagination.current,
    1,
  );

  TestValidator.equals(
    "pagination limit is 10",
    searchResult.pagination.limit,
    10,
  );

  TestValidator.equals(
    "pagination total records is 2",
    searchResult.pagination.records,
    2,
  );

  TestValidator.equals(
    "pagination total pages is 1",
    searchResult.pagination.pages,
    1,
  );

  // Step 8: Test combined query without search term to verify parent filter works alone
  const parentOnlyResult = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        parent_id: rootCategory1.id,
        status: "active",
        sort_by: "display_order",
        sort_direction: "asc",
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(parentOnlyResult);

  TestValidator.equals(
    "parent filter returns 4 active children",
    parentOnlyResult.data.length,
    4,
  );

  // Verify sort order for all children
  for (let i = 0; i < parentOnlyResult.data.length - 1; i++) {
    TestValidator.predicate(
      "categories sorted correctly by display_order",
      parentOnlyResult.data[i].display_order <
        parentOnlyResult.data[i + 1].display_order,
    );
  }
}
