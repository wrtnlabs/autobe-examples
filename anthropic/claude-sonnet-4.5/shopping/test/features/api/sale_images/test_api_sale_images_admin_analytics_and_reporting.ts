import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSaleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleImage";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallSaleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleImage";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test administrative image search API filtering and pagination capabilities.
 *
 * This test validates that the admin image search endpoint correctly handles
 * various filtering criteria and pagination parameters. Since actual sale
 * creation is not available in the provided APIs, this test focuses on
 * verifying the API's request handling, parameter validation, and response
 * structure correctness.
 *
 * The test exercises different combinations of filters including:
 *
 * - Date range filtering (created_at_min/max)
 * - Primary image status filtering (is_primary)
 * - Display order range filtering (display_order_min/max)
 * - SKU association filtering (shopping_mall_sale_sku_id)
 * - Text search capabilities
 * - Pagination with various page sizes
 * - Multiple sorting criteria
 *
 * Test Flow:
 *
 * 1. Authenticate as admin for search access
 * 2. Test date range filtering for temporal analysis
 * 3. Test primary image filtering for data quality checks
 * 4. Test pagination with various limits
 * 5. Test display order range filtering
 * 6. Test text search functionality
 * 7. Test SKU association filtering
 * 8. Test combined filter scenarios
 */
export async function test_api_sale_images_admin_analytics_and_reporting(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin for analytics access
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    admin_level: "super_admin" as const,
    email_verified: true,
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdmin.ICreate;

  const admin = await api.functional.auth.admin.join(connection, {
    body: adminData,
  });
  typia.assert(admin);

  // Use a consistent test sale code for all searches
  const testSaleCode = RandomGenerator.alphaNumeric(12);

  // Step 2: Test date range filtering for temporal analysis
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const dateRangeSearchRequest = {
    page: 1,
    limit: 20,
    created_at_min: thirtyDaysAgo.toISOString(),
    created_at_max: now.toISOString(),
    sort: ["created_at:desc"],
  } satisfies IShoppingMallSaleImage.IRequest;

  const dateRangeResult =
    await api.functional.shoppingMall.admin.sales.images.index(connection, {
      saleCode: testSaleCode,
      body: dateRangeSearchRequest,
    });
  typia.assert(dateRangeResult);

  TestValidator.equals(
    "date range search current page",
    dateRangeResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "date range search limit",
    dateRangeResult.pagination.limit,
    20,
  );

  // Step 3: Test primary image filtering for data quality checks
  const primaryImageSearchRequest = {
    page: 1,
    limit: 50,
    is_primary: false,
    sort: ["display_order:asc"],
  } satisfies IShoppingMallSaleImage.IRequest;

  const primaryImageResult =
    await api.functional.shoppingMall.admin.sales.images.index(connection, {
      saleCode: testSaleCode,
      body: primaryImageSearchRequest,
    });
  typia.assert(primaryImageResult);

  TestValidator.equals(
    "primary image filter current page",
    primaryImageResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "primary image filter limit",
    primaryImageResult.pagination.limit,
    50,
  );

  // Step 4: Test pagination with maximum allowed limit
  const paginationTestRequest = {
    page: 1,
    limit: 100,
    sort: ["created_at:desc", "display_order:asc"],
  } satisfies IShoppingMallSaleImage.IRequest;

  const paginationResult =
    await api.functional.shoppingMall.admin.sales.images.index(connection, {
      saleCode: testSaleCode,
      body: paginationTestRequest,
    });
  typia.assert(paginationResult);

  TestValidator.equals(
    "pagination test current page",
    paginationResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination test limit",
    paginationResult.pagination.limit,
    100,
  );

  // Step 5: Test display order range filtering
  const displayOrderSearchRequest = {
    page: 1,
    limit: 25,
    display_order_min: 0,
    display_order_max: 10,
    sort: ["display_order:asc"],
  } satisfies IShoppingMallSaleImage.IRequest;

  const displayOrderResult =
    await api.functional.shoppingMall.admin.sales.images.index(connection, {
      saleCode: testSaleCode,
      body: displayOrderSearchRequest,
    });
  typia.assert(displayOrderResult);

  TestValidator.equals(
    "display order filter current page",
    displayOrderResult.pagination.current,
    1,
  );

  // Step 6: Test text search functionality
  const textSearchRequest = {
    page: 1,
    limit: 30,
    search: RandomGenerator.name(),
    sort: ["created_at:desc"],
  } satisfies IShoppingMallSaleImage.IRequest;

  const textSearchResult =
    await api.functional.shoppingMall.admin.sales.images.index(connection, {
      saleCode: testSaleCode,
      body: textSearchRequest,
    });
  typia.assert(textSearchResult);

  TestValidator.equals(
    "text search current page",
    textSearchResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "text search returns data array",
    Array.isArray(textSearchResult.data),
  );

  // Step 7: Test SKU association filtering (null for product-level images)
  const skuFilterRequest = {
    page: 1,
    limit: 20,
    shopping_mall_sale_sku_id: null,
    sort: ["created_at:desc"],
  } satisfies IShoppingMallSaleImage.IRequest;

  const skuFilterResult =
    await api.functional.shoppingMall.admin.sales.images.index(connection, {
      saleCode: testSaleCode,
      body: skuFilterRequest,
    });
  typia.assert(skuFilterResult);

  TestValidator.equals(
    "SKU filter current page",
    skuFilterResult.pagination.current,
    1,
  );

  // Step 8: Test combined filters for complex queries
  const combinedFiltersRequest = {
    page: 1,
    limit: 50,
    created_at_min: thirtyDaysAgo.toISOString(),
    created_at_max: now.toISOString(),
    is_primary: true,
    display_order_min: 0,
    display_order_max: 5,
    sort: ["created_at:desc", "display_order:asc"],
  } satisfies IShoppingMallSaleImage.IRequest;

  const combinedFiltersResult =
    await api.functional.shoppingMall.admin.sales.images.index(connection, {
      saleCode: testSaleCode,
      body: combinedFiltersRequest,
    });
  typia.assert(combinedFiltersResult);

  TestValidator.equals(
    "combined filters current page",
    combinedFiltersResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "combined filters returns valid pagination structure",
    combinedFiltersResult.pagination.records >= 0 &&
      combinedFiltersResult.pagination.pages >= 0,
  );
}
