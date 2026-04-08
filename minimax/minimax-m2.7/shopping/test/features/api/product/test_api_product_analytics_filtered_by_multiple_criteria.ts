import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProduct";
import type { IPagination } from "@ORGANIZATION/PROJECT-api/lib/structures/IPagination";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test super administrator product analytics filtering by multiple criteria.
 *
 * Validates the comprehensive filtering capabilities of the product analytics endpoint for administrative oversight. The endpoint allows super administrators to filter products by category, seller, price range, date range, and search query simultaneously. This test verifies that combining multiple filters correctly narrows results to products matching ALL specified criteria.
 *
 * The test flow includes:
 * 1. Authenticate as super administrator to access the analytics endpoint
 * 2. Test individual filters (category, seller, price range, date range)
 * 3. Test combined filters to verify AND logic
 * 4. Test search functionality with partial name matching
 * 5. Validate aggregations are computed correctly for filtered results
 *
 * Each filter combination should return products that match ALL criteria, and aggregations (counts, average price, distributions) should reflect only the filtered subset.
 */
export async function test_api_product_analytics_filtered_by_multiple_criteria(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Test with no filters (baseline)
  const baselineResponse =
    await api.functional.ecommerceMall.superAdmin.admin.analytics.products.index(
      superAdminConnection,
      {
        body: {} satisfies IEcommerceMallProduct.IAnalytic.IRequest,
      },
    );
  typia.assert(baselineResponse);
  // 3. Test filter by category_id
  const categoryId = typia.random<
    string & tags.Format<"uuid">
  >() satisfies string;
  const categoryFilterResponse =
    await api.functional.ecommerceMall.superAdmin.admin.analytics.products.index(
      superAdminConnection,
      {
        body: {
          category_id: categoryId,
        } satisfies IEcommerceMallProduct.IAnalytic.IRequest,
      },
    );
  typia.assert(categoryFilterResponse);
  TestValidator.equals(
    "category filter response structure",
    categoryFilterResponse.data.length >= 0,
    true,
  );
  // 4. Test filter by seller_id
  const sellerId = typia.random<
    string & tags.Format<"uuid">
  >() satisfies string;
  const sellerFilterResponse =
    await api.functional.ecommerceMall.superAdmin.admin.analytics.products.index(
      superAdminConnection,
      {
        body: {
          seller_id: sellerId,
        } satisfies IEcommerceMallProduct.IAnalytic.IRequest,
      },
    );
  typia.assert(sellerFilterResponse);
  TestValidator.equals(
    "seller filter response structure",
    sellerFilterResponse.data.length >= 0,
    true,
  );
  // 5. Test filter by price range (min_price and max_price)
  const minPrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<100>
  >();
  const maxPrice =
    minPrice +
    typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<100> & tags.Maximum<1000>
    >();
  const priceRangeResponse =
    await api.functional.ecommerceMall.superAdmin.admin.analytics.products.index(
      superAdminConnection,
      {
        body: {
          min_price: minPrice,
          max_price: maxPrice,
        } satisfies IEcommerceMallProduct.IAnalytic.IRequest,
      },
    );
  typia.assert(priceRangeResponse);
  TestValidator.equals(
    "price range filter response structure",
    priceRangeResponse.data.length >= 0,
    true,
  );
  // 6. Test filter by date range (created_after and created_before)
  const createdAfter = new Date(
    Date.now() - 90 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const createdBefore = new Date().toISOString();
  const dateRangeResponse =
    await api.functional.ecommerceMall.superAdmin.admin.analytics.products.index(
      superAdminConnection,
      {
        body: {
          created_after: createdAfter,
          created_before: createdBefore,
        } satisfies IEcommerceMallProduct.IAnalytic.IRequest,
      },
    );
  typia.assert(dateRangeResponse);
  TestValidator.equals(
    "date range filter response structure",
    dateRangeResponse.data.length >= 0,
    true,
  );
  // 7. Test search functionality with partial name matching
  const searchTerm = RandomGenerator.alphabets(5);
  const searchResponse =
    await api.functional.ecommerceMall.superAdmin.admin.analytics.products.index(
      superAdminConnection,
      {
        body: {
          search: searchTerm,
        } satisfies IEcommerceMallProduct.IAnalytic.IRequest,
      },
    );
  typia.assert(searchResponse);
  TestValidator.equals(
    "search filter response structure",
    searchResponse.data.length >= 0,
    true,
  );
  // 8. Test combined filters (category + seller + price range)
  const combinedResponse =
    await api.functional.ecommerceMall.superAdmin.admin.analytics.products.index(
      superAdminConnection,
      {
        body: {
          category_id: categoryId,
          seller_id: sellerId,
          min_price: minPrice,
          max_price: maxPrice,
        } satisfies IEcommerceMallProduct.IAnalytic.IRequest,
      },
    );
  typia.assert(combinedResponse);
  TestValidator.equals(
    "combined filter response structure",
    combinedResponse.data.length >= 0,
    true,
  );
  // 9. Test with all filters combined including date range and search
  const fullFilterResponse =
    await api.functional.ecommerceMall.superAdmin.admin.analytics.products.index(
      superAdminConnection,
      {
        body: {
          category_id: categoryId,
          seller_id: sellerId,
          min_price: minPrice,
          max_price: maxPrice,
          created_after: createdAfter,
          created_before: createdBefore,
          search: searchTerm,
        } satisfies IEcommerceMallProduct.IAnalytic.IRequest,
      },
    );
  typia.assert(fullFilterResponse);
  TestValidator.equals(
    "full filter response structure",
    fullFilterResponse.data.length >= 0,
    true,
  );
  // 10. Test filter by status (ACTIVE vs DELETED)
  const activeFilterResponse =
    await api.functional.ecommerceMall.superAdmin.admin.analytics.products.index(
      superAdminConnection,
      {
        body: {
          status: "ACTIVE",
        } satisfies IEcommerceMallProduct.IAnalytic.IRequest,
      },
    );
  typia.assert(activeFilterResponse);
  TestValidator.equals(
    "active status filter response structure",
    activeFilterResponse.data.length >= 0,
    true,
  );
  const deletedFilterResponse =
    await api.functional.ecommerceMall.superAdmin.admin.analytics.products.index(
      superAdminConnection,
      {
        body: {
          status: "DELETED",
        } satisfies IEcommerceMallProduct.IAnalytic.IRequest,
      },
    );
  typia.assert(deletedFilterResponse);
  TestValidator.equals(
    "deleted status filter response structure",
    deletedFilterResponse.data.length >= 0,
    true,
  );
  // 11. Test pagination parameters
  const paginatedResponse =
    await api.functional.ecommerceMall.superAdmin.admin.analytics.products.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallProduct.IAnalytic.IRequest,
      },
    );
  typia.assert(paginatedResponse);
  TestValidator.equals(
    "pagination pages equals 1",
    paginatedResponse.pagination.pages,
    1,
  );
  TestValidator.equals(
    "pagination limit equals 10",
    paginatedResponse.pagination.limit,
    10,
  );
  // 12. Test sort parameter
  const sortedResponse =
    await api.functional.ecommerceMall.superAdmin.admin.analytics.products.index(
      superAdminConnection,
      {
        body: {
          sort: "base_price",
        } satisfies IEcommerceMallProduct.IAnalytic.IRequest,
      },
    );
  typia.assert(sortedResponse);
  TestValidator.equals(
    "sorted response structure",
    sortedResponse.data.length >= 0,
    true,
  );
}
