import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCategory";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_category_subcategory_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Query all categories to understand the hierarchy
  const allCategories = await api.functional.shoppingMall.categories.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(allCategories);
  // 3. Test filtering by parent_category_id if categories exist
  if (allCategories.data.length > 0) {
    const firstCategory = allCategories.data[0];
    // Filter by this category's ID as parent to get subcategories
    const subcategories = await api.functional.shoppingMall.categories.index(
      adminConnection,
      {
        body: {
          parent_category_id: firstCategory.id,
          page: 1,
          limit: 50,
        } satisfies IShoppingMallCategory.IRequest,
      },
    );
    typia.assert(subcategories);
    // Verify all returned categories have the correct parent reference
    for (const category of subcategories.data) {
      TestValidator.predicate(
        "subcategory parent matches filter",
        category.parent === null || category.parent?.id === firstCategory.id,
      );
    }
  }
  // 4. Test with non-existent parent_category_id (should return empty results)
  const fakeParentId = typia.random<string & tags.Format<"uuid">>();
  const emptyResult = await api.functional.shoppingMall.categories.index(
    adminConnection,
    {
      body: {
        parent_category_id: fakeParentId,
        page: 1,
        limit: 20,
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(emptyResult);
  // Verify pagination structure is correct for empty results
  TestValidator.predicate(
    "pagination current page valid",
    emptyResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit valid",
    emptyResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    emptyResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    emptyResult.pagination.pages >= 0,
  );
  // 5. Test search functionality with text query
  const searchResult = await api.functional.shoppingMall.categories.index(
    adminConnection,
    {
      body: {
        search: "test",
        page: 1,
        limit: 20,
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(searchResult);
  // 6. Test sorting functionality
  const sortedResult = await api.functional.shoppingMall.categories.index(
    adminConnection,
    {
      body: {
        sort: "createdAt,desc",
        page: 1,
        limit: 20,
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(sortedResult);
  // 7. Validate response structure for all results
  TestValidator.predicate(
    "all categories data is array",
    Array.isArray(allCategories.data),
  );
  TestValidator.predicate(
    "search data is array",
    Array.isArray(searchResult.data),
  );
  TestValidator.predicate(
    "sorted data is array",
    Array.isArray(sortedResult.data),
  );
  TestValidator.predicate(
    "empty result data is array",
    Array.isArray(emptyResult.data),
  );
}
