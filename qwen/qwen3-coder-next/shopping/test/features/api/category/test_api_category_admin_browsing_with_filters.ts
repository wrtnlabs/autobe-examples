import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCategory";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_category_admin_browsing_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(12),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Test 1: Browse top-level categories (no parent filter)
  const topLevelCategories =
    await api.functional.shoppingMall.admin.categories.index(adminConnection, {
      body: {} satisfies IShoppingMallCategory.IRequest,
    });
  typia.assert(topLevelCategories);
  // Test 2: Filter by parent category ID
  if (topLevelCategories.data.length > 0) {
    const parentId = topLevelCategories.data[0].id;
    const subCategories =
      await api.functional.shoppingMall.admin.categories.index(
        adminConnection,
        {
          body: {
            parent_category_id: parentId,
          } satisfies IShoppingMallCategory.IRequest,
        },
      );
    typia.assert(subCategories);
    // Verify all returned categories have the correct parent
    for (const category of subCategories.data) {
      TestValidator.equals(
        "parent category matches",
        category.parent?.id,
        parentId,
      );
    }
  }
  // Test 3: Search by name with partial matching
  const searchResults =
    await api.functional.shoppingMall.admin.categories.index(adminConnection, {
      body: {
        search: "Electronics", // Using a common category name pattern
      } satisfies IShoppingMallCategory.IRequest,
    });
  typia.assert(searchResults);
  // Test 4: Pagination test
  const paginatedCategories =
    await api.functional.shoppingMall.admin.categories.index(adminConnection, {
      body: {
        page: 1,
        limit: 5,
      } satisfies IShoppingMallCategory.IRequest,
    });
  typia.assert(paginatedCategories);
  // Verify pagination metadata
  TestValidator.predicate(
    "has pagination",
    paginatedCategories.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page is valid",
    paginatedCategories.pagination.current >= 1,
  );
  TestValidator.predicate(
    "limit is valid",
    paginatedCategories.pagination.limit >= 1,
  );
  // Test 5: Combined filters
  const combinedFilters =
    await api.functional.shoppingMall.admin.categories.index(adminConnection, {
      body: {
        search: "Electronics",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallCategory.IRequest,
    });
  typia.assert(combinedFilters);
  // Test 6: Verify category structure
  for (const category of paginatedCategories.data) {
    typia.assert(category);
    TestValidator.predicate("has valid id", typeof category.id === "string");
    TestValidator.predicate(
      "has valid name",
      typeof category.name === "string",
    );
    TestValidator.predicate(
      "has valid subcategory count",
      typeof category.subcategory_count === "number",
    );
  }
}
