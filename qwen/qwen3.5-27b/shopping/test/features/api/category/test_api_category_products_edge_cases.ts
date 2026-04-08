import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_administrator_categories_create } from "../../../generate/generate_random_shopping_mall_administrator_categories_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";

/**
 * Test edge cases for category product browsing including empty categories and pagination boundaries.
 *
 * Validates that the category product listing endpoint correctly handles edge cases including empty categories and pagination boundaries. Ensures that the API returns valid pagination structures even when no products exist in a category.
 *
 * The test verifies that empty categories return valid pagination structures with zero records, and that pagination boundary conditions are handled correctly by requesting pages beyond the total available pages. Category hierarchy is set up with parent categories, subcategories, and empty categories to test various scenarios.
 *
 * 1. Administrator authenticates and creates test category structure (parent, subcategory, empty category)
 * 2. Empty category test: Verify empty page structure with records=0, pages=0, data=[]
 * 3. Parent category test (no products): Verify empty page structure for category with no products
 * 4. Subcategory test (no products): Verify empty page structure for subcategory with no products
 * 5. Pagination boundary test: Verify page beyond total returns empty data with correct metadata
 */
export async function test_api_category_products_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  // 2. Create parent category
  const parentCategory =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: "Electronics",
          description: "Electronic devices and accessories",
        },
      },
    );
  typia.assert(parentCategory);
  // 3. Create subcategory under parent
  const subCategory =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: "Smartphones",
          description: "Mobile phones and accessories",
          parent_category_id: parentCategory.id,
        },
      },
    );
  typia.assert(subCategory);
  // 4. Create empty category (no products will be added)
  const emptyCategory =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: "Empty Category",
          description: "This category has no products",
        },
      },
    );
  typia.assert(emptyCategory);
  // 5. Test empty category - should return empty page
  const emptyCategoryResult =
    await api.functional.shoppingMall.categories.products.index(
      adminConnection,
      {
        categoryId: emptyCategory.id,
        body: {
          page: 1,
          pageSize: 20,
        },
      },
    );
  typia.assert(emptyCategoryResult);
  TestValidator.equals(
    "empty category records",
    emptyCategoryResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty category pages",
    emptyCategoryResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty category data length",
    emptyCategoryResult.data.length,
    0,
  );
  // 6. Test parent category (no products) - should return empty page
  const parentCategoryResult =
    await api.functional.shoppingMall.categories.products.index(
      adminConnection,
      {
        categoryId: parentCategory.id,
        body: {
          page: 1,
          pageSize: 20,
        },
      },
    );
  typia.assert(parentCategoryResult);
  TestValidator.equals(
    "parent category records",
    parentCategoryResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "parent category data length",
    parentCategoryResult.data.length,
    0,
  );
  // 7. Test subcategory (no products) - should return empty page
  const subCategoryResult =
    await api.functional.shoppingMall.categories.products.index(
      adminConnection,
      {
        categoryId: subCategory.id,
        body: {
          page: 1,
          pageSize: 20,
        },
      },
    );
  typia.assert(subCategoryResult);
  TestValidator.equals(
    "subcategory records",
    subCategoryResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "subcategory data length",
    subCategoryResult.data.length,
    0,
  );
  // 8. Test pagination boundary - request page beyond available (no products exist)
  const boundaryResult =
    await api.functional.shoppingMall.categories.products.index(
      adminConnection,
      {
        categoryId: parentCategory.id,
        body: {
          page: 999,
          pageSize: 20,
        },
      },
    );
  typia.assert(boundaryResult);
  TestValidator.equals(
    "boundary page records",
    boundaryResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "boundary page data length",
    boundaryResult.data.length,
    0,
  );
  TestValidator.equals(
    "boundary page current",
    boundaryResult.pagination.current,
    999,
  );
  TestValidator.equals(
    "boundary page pages",
    boundaryResult.pagination.pages,
    0,
  );
}
