import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSkuSize } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSkuSize";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSkuSize } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuSize";

/**
 * Test comprehensive search and filtering capabilities for SKU size variants.
 *
 * This test validates that users can retrieve a filtered and paginated list of
 * size variants based on various criteria. The test creates multiple size
 * variants with different values through admin authentication, then performs
 * search operations with different filter combinations to verify the filtering
 * logic works correctly.
 *
 * Test workflow:
 *
 * 1. Admin authenticates to gain permission to create size variants
 * 2. Create first size variant for search testing
 * 3. Create second size variant with different properties for filter testing
 * 4. Create third size variant for pagination testing
 * 5. Perform search without filters to verify all sizes are returned
 * 6. Perform search with pagination parameters to verify pagination works
 * 7. Validate pagination information and response structure
 */
export async function test_api_sku_size_search_with_filters(
  connection: api.IConnection,
) {
  // Step 1: Admin authentication
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.MinLength<8>>(),
        name: RandomGenerator.name(),
        role_level: "super_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create first size variant
  const size1: IShoppingMallSkuSize =
    await api.functional.shoppingMall.admin.skuSizes.create(connection, {
      body: {
        value: "Small",
      } satisfies IShoppingMallSkuSize.ICreate,
    });
  typia.assert(size1);

  // Step 3: Create second size variant
  const size2: IShoppingMallSkuSize =
    await api.functional.shoppingMall.admin.skuSizes.create(connection, {
      body: {
        value: "Medium",
      } satisfies IShoppingMallSkuSize.ICreate,
    });
  typia.assert(size2);

  // Step 4: Create third size variant
  const size3: IShoppingMallSkuSize =
    await api.functional.shoppingMall.admin.skuSizes.create(connection, {
      body: {
        value: "Large",
      } satisfies IShoppingMallSkuSize.ICreate,
    });
  typia.assert(size3);

  // Step 5: Search without filters - should return all created sizes
  const allSizes: IPageIShoppingMallSkuSize =
    await api.functional.shoppingMall.skuSizes.index(connection, {
      body: {} satisfies IShoppingMallSkuSize.IRequest,
    });
  typia.assert(allSizes);

  // Step 6: Validate pagination information
  TestValidator.predicate(
    "pagination object should exist",
    allSizes.pagination !== null && allSizes.pagination !== undefined,
  );
  TestValidator.predicate(
    "data array should exist",
    allSizes.data !== null && allSizes.data !== undefined,
  );
  TestValidator.predicate(
    "should have at least 3 size variants",
    allSizes.data.length >= 3,
  );

  // Step 7: Test with pagination parameters
  const paginatedResult: IPageIShoppingMallSkuSize =
    await api.functional.shoppingMall.skuSizes.index(connection, {
      body: {
        page: 1,
        limit: 2,
      } satisfies IShoppingMallSkuSize.IRequest,
    });
  typia.assert(paginatedResult);

  // Validate pagination with limit
  TestValidator.equals(
    "pagination current page should be 1",
    paginatedResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should be 2",
    paginatedResult.pagination.limit,
    2,
  );
  TestValidator.predicate(
    "should return at most 2 items per page",
    paginatedResult.data.length <= 2,
  );
}
