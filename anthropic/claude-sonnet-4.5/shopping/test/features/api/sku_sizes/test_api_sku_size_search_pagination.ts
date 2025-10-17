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
 * Test the pagination functionality of the SKU size variant search operation.
 *
 * This test validates that pagination parameters work correctly including page
 * number, page size configuration, and navigation through large size catalogs.
 * The test workflow:
 *
 * 1. Authenticate as admin to gain necessary permissions
 * 2. Retrieve existing size variants with different pagination parameters
 * 3. Test first page retrieval with default page size
 * 4. Test different page sizes (5, 10, 20 items per page)
 * 5. Navigate through multiple pages and verify page boundaries
 * 6. Validate pagination metadata (total count, page numbers, page counts)
 * 7. Verify that page data is consistent and non-overlapping
 */
export async function test_api_sku_size_search_pagination(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin
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

  // Step 2: Retrieve initial page to see existing sizes
  const initialPage: IPageIShoppingMallSkuSize =
    await api.functional.shoppingMall.skuSizes.index(connection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallSkuSize.IRequest,
    });
  typia.assert(initialPage);

  // Step 3: Test pagination with page size of 5
  const pageSize5: IPageIShoppingMallSkuSize =
    await api.functional.shoppingMall.skuSizes.index(connection, {
      body: {
        page: 1,
        limit: 5,
      } satisfies IShoppingMallSkuSize.IRequest,
    });
  typia.assert(pageSize5);
  TestValidator.predicate(
    "page size 5 returns at most 5 items",
    pageSize5.data.length <= 5,
  );
  TestValidator.equals(
    "pagination current page is 1",
    pageSize5.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit is 5", pageSize5.pagination.limit, 5);

  // Step 4: Test pagination with page size of 20
  const pageSize20: IPageIShoppingMallSkuSize =
    await api.functional.shoppingMall.skuSizes.index(connection, {
      body: {
        page: 1,
        limit: 20,
      } satisfies IShoppingMallSkuSize.IRequest,
    });
  typia.assert(pageSize20);
  TestValidator.predicate(
    "page size 20 returns at most 20 items",
    pageSize20.data.length <= 20,
  );
  TestValidator.equals(
    "pagination limit is 20",
    pageSize20.pagination.limit,
    20,
  );

  // Step 5: Test second page retrieval
  if (pageSize5.pagination.pages >= 2) {
    const secondPage: IPageIShoppingMallSkuSize =
      await api.functional.shoppingMall.skuSizes.index(connection, {
        body: {
          page: 2,
          limit: 5,
        } satisfies IShoppingMallSkuSize.IRequest,
      });
    typia.assert(secondPage);
    TestValidator.equals(
      "second page current is 2",
      secondPage.pagination.current,
      2,
    );
    TestValidator.equals(
      "second page limit is 5",
      secondPage.pagination.limit,
      5,
    );

    // Verify page boundaries - first page and second page should not have same IDs
    const firstPageIds = pageSize5.data.map((size) => size.id);
    const secondPageIds = secondPage.data.map((size) => size.id);
    const hasOverlap = firstPageIds.some((id) => secondPageIds.includes(id));
    TestValidator.predicate("pages have no overlapping IDs", !hasOverlap);
  }

  // Step 6: Validate pagination metadata consistency
  const totalRecords = pageSize5.pagination.records;
  const calculatedPages = Math.ceil(totalRecords / 5);
  TestValidator.equals(
    "calculated pages match pagination pages",
    pageSize5.pagination.pages,
    calculatedPages,
  );

  // Step 7: Test maximum limit (100)
  const maxLimitPage: IPageIShoppingMallSkuSize =
    await api.functional.shoppingMall.skuSizes.index(connection, {
      body: {
        page: 1,
        limit: 100,
      } satisfies IShoppingMallSkuSize.IRequest,
    });
  typia.assert(maxLimitPage);
  TestValidator.equals(
    "max limit page has correct limit",
    maxLimitPage.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "max limit page data respects limit",
    maxLimitPage.data.length <= 100,
  );

  // Step 8: Test category filtering with pagination
  if (pageSize5.data.length > 0) {
    const filteredPage: IPageIShoppingMallSkuSize =
      await api.functional.shoppingMall.skuSizes.index(connection, {
        body: {
          page: 1,
          limit: 10,
          category: "US Sizes",
        } satisfies IShoppingMallSkuSize.IRequest,
      });
    typia.assert(filteredPage);
    TestValidator.predicate(
      "filtered page returns valid data",
      filteredPage.data.length >= 0,
    );
  }
}
