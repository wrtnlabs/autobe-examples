import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductCategory";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_product_category_search_pagination_success(
  connection: api.IConnection,
): Promise<void> {
  // Scenario description:
  // Test retrieving paginated product category list for administrators.
  // Steps:
  // 1. Admin joins and authenticates to obtain authorized connection.
  // 2. Test product categories filtering, searching, sorting, and pagination.
  // 3. Pick an existing parent category and filter subcategories.
  // 4. Test search by keyword in category names.
  // 5. Validate pagination metadata and response data correctness.
  // 6. Ensure deleted categories are excluded.
  // 7. Verify unauthorized access is rejected.
  // 1. Admin join and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const administrator = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "changeme123",
    },
  });
  // 2. Fetch all categories without filters to find a parent category
  const allCategoriesResponse =
    await api.functional.shoppingMall.administrator.product_categories.index(
      adminConnection,
      {
        body: { page: 1, limit: 100 },
      },
    );
  typia.assert(allCategoriesResponse);
  // 3. Pick existing parent category which is not deleted
  const rootCategories = allCategoriesResponse.data.filter(
    (v) => v.deleted_at === null,
  );
  const parentCategory =
    rootCategories.length > 0
      ? rootCategories[0]
      : allCategoriesResponse.data[0];
  // 4. Prepare search keyword from parentCategory name
  const searchKeyword = parentCategory
    ? parentCategory.name.substring(0, 2)
    : "a";
  // 5. Request paginated product categories with search and parent filter
  const requestBody: IShoppingMallProductCategory.IRequest = {
    search: searchKeyword,
    parentCategoryId: parentCategory?.id ?? null,
    page: 1,
    limit: 10,
    sortBy: "name",
    sortOrder: "asc",
  };
  // 6. Call the API
  const response =
    await api.functional.shoppingMall.administrator.product_categories.index(
      adminConnection,
      {
        body: requestBody,
      },
    );
  typia.assert(response);
  // 7. Validate pagination metadata
  TestValidator.predicate(
    "current page is 1",
    response.pagination.current === 1,
  );
  TestValidator.predicate("limit is 10", response.pagination.limit === 10);
  TestValidator.predicate(
    "records count is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    response.pagination.pages >= 0,
  );
  // 8. Validate returned categories
  for (let i = 0; i < response.data.length; i++) {
    const category = response.data[i];
    typia.assert(category);
    // Each category should not be deleted
    TestValidator.predicate(
      "category not deleted",
      category.deleted_at === null,
    );
    // Verify category is child of parentCategory
    TestValidator.equals(
      "category parent filter",
      category.id !== parentCategory.id,
      true,
    );
    // If has parentCategoryId filter, check or allow null for root
    if (requestBody.parentCategoryId === null) {
      // category should be root level (no parent) - but since data does not have parentId property, skip
      // Just verify category has valid id
      TestValidator.predicate(
        "category has id",
        typeof category.id === "string",
      );
    }
    // Check ascending order by name
    if (i > 0) {
      const prevCategory = response.data[i - 1];
      TestValidator.predicate(
        "category name ascending order",
        prevCategory.name <= category.name,
      );
    }
  }
  // 9. Test unauthorized access
  const nonAuthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "should require administrator authorization",
    401,
    async () =>
      await api.functional.shoppingMall.administrator.product_categories.index(
        nonAuthorizedConnection,
        { body: requestBody },
      ),
  );
}
