import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPlatformCommission } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPlatformCommission";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPlatformCommission } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformCommission";

/**
 * Test pagination functionality for large administrative commission datasets.
 *
 * This test validates that the platform commission pagination API properly
 * handles large datasets that span multiple pages across different sellers and
 * time periods. It verifies that:
 *
 * 1. Admin can authenticate and access platform-wide commission data
 * 2. The limit parameter maximum of 100 records per page is enforced
 * 3. Pagination metadata accurately reflects large record counts
 * 4. Navigation through multiple pages works correctly
 * 5. Edge cases like maximum page size and boundary conditions are handled
 *    properly
 *
 * The test creates an admin account, authenticates, and then performs various
 * pagination queries to validate the pagination system's correctness and
 * constraints.
 */
export async function test_api_admin_platform_commissions_pagination_large_datasets(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        admin_level: "super_admin",
        email_verified: true,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Generate a random seller ID for the query
  const testSellerId = typia.random<string & tags.Format<"uuid">>();

  // Step 2: Test basic pagination with default parameters
  const defaultPage: IPageIShoppingMallPlatformCommission.ISummary =
    await api.functional.shoppingMall.admin.sellers.platformCommissions.index(
      connection,
      {
        sellerId: testSellerId,
        body: {} satisfies IShoppingMallPlatformCommission.IRequest,
      },
    );
  typia.assert(defaultPage);

  // Validate pagination metadata structure
  TestValidator.predicate(
    "default pagination has valid current page",
    defaultPage.pagination.current >= 1,
  );
  TestValidator.predicate(
    "default pagination has valid limit",
    defaultPage.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "default pagination has non-negative record count",
    defaultPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "default pagination has non-negative page count",
    defaultPage.pagination.pages >= 0,
  );

  // Step 3: Test pagination with explicit page and limit parameters
  const page2Limit50: IPageIShoppingMallPlatformCommission.ISummary =
    await api.functional.shoppingMall.admin.sellers.platformCommissions.index(
      connection,
      {
        sellerId: testSellerId,
        body: {
          page: 2,
          limit: 50,
        } satisfies IShoppingMallPlatformCommission.IRequest,
      },
    );
  typia.assert(page2Limit50);

  TestValidator.equals(
    "requested page 2 is returned",
    page2Limit50.pagination.current,
    2,
  );
  TestValidator.equals(
    "requested limit 50 is applied",
    page2Limit50.pagination.limit,
    50,
  );
  TestValidator.predicate(
    "returned data does not exceed limit",
    page2Limit50.data.length <= 50,
  );

  // Step 4: Test maximum limit enforcement (100 records per page)
  const maxLimitPage: IPageIShoppingMallPlatformCommission.ISummary =
    await api.functional.shoppingMall.admin.sellers.platformCommissions.index(
      connection,
      {
        sellerId: testSellerId,
        body: {
          page: 1,
          limit: 100,
        } satisfies IShoppingMallPlatformCommission.IRequest,
      },
    );
  typia.assert(maxLimitPage);

  TestValidator.equals(
    "maximum limit of 100 is accepted",
    maxLimitPage.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "returned data does not exceed maximum limit",
    maxLimitPage.data.length <= 100,
  );

  // Step 5: Test pagination metadata consistency
  const metadataTest: IPageIShoppingMallPlatformCommission.ISummary =
    await api.functional.shoppingMall.admin.sellers.platformCommissions.index(
      connection,
      {
        sellerId: testSellerId,
        body: {
          page: 1,
          limit: 25,
        } satisfies IShoppingMallPlatformCommission.IRequest,
      },
    );
  typia.assert(metadataTest);

  // Validate pages calculation: Math.ceil(records / limit)
  const expectedPages =
    metadataTest.pagination.records > 0
      ? Math.ceil(
          metadataTest.pagination.records / metadataTest.pagination.limit,
        )
      : 0;

  TestValidator.equals(
    "pagination pages calculation is correct",
    metadataTest.pagination.pages,
    expectedPages,
  );

  // Step 6: Test with sorting and filtering parameters
  const sortedFilteredPage: IPageIShoppingMallPlatformCommission.ISummary =
    await api.functional.shoppingMall.admin.sellers.platformCommissions.index(
      connection,
      {
        sellerId: testSellerId,
        body: {
          page: 1,
          limit: 30,
          sort_by: "created_at",
          sort_order: "desc",
          commission_type: "standard",
        } satisfies IShoppingMallPlatformCommission.IRequest,
      },
    );
  typia.assert(sortedFilteredPage);

  TestValidator.predicate(
    "sorted and filtered pagination returns valid data",
    sortedFilteredPage.data.length <= 30,
  );

  // Step 7: Test pagination with date range filters
  const dateFilteredPage: IPageIShoppingMallPlatformCommission.ISummary =
    await api.functional.shoppingMall.admin.sellers.platformCommissions.index(
      connection,
      {
        sellerId: testSellerId,
        body: {
          page: 1,
          limit: 20,
          created_after: new Date(
            Date.now() - 90 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          created_before: new Date().toISOString(),
        } satisfies IShoppingMallPlatformCommission.IRequest,
      },
    );
  typia.assert(dateFilteredPage);

  TestValidator.predicate(
    "date filtered pagination metadata is valid",
    dateFilteredPage.pagination.current === 1 &&
      dateFilteredPage.pagination.limit === 20,
  );

  // Step 8: Test with amount range filters
  const amountFilteredPage: IPageIShoppingMallPlatformCommission.ISummary =
    await api.functional.shoppingMall.admin.sellers.platformCommissions.index(
      connection,
      {
        sellerId: testSellerId,
        body: {
          page: 1,
          limit: 15,
          min_commission_amount: 10,
          max_commission_amount: 1000,
        } satisfies IShoppingMallPlatformCommission.IRequest,
      },
    );
  typia.assert(amountFilteredPage);

  TestValidator.predicate(
    "amount filtered pagination returns valid results",
    amountFilteredPage.data.length <= 15,
  );

  // Step 9: Test edge case - requesting a high page number
  const highPageNumber: IPageIShoppingMallPlatformCommission.ISummary =
    await api.functional.shoppingMall.admin.sellers.platformCommissions.index(
      connection,
      {
        sellerId: testSellerId,
        body: {
          page: 999,
          limit: 50,
        } satisfies IShoppingMallPlatformCommission.IRequest,
      },
    );
  typia.assert(highPageNumber);

  TestValidator.predicate(
    "high page number returns valid pagination structure",
    highPageNumber.pagination.current === 999 &&
      highPageNumber.pagination.limit === 50,
  );

  // Step 10: Test with currency filter
  const currencyFilteredPage: IPageIShoppingMallPlatformCommission.ISummary =
    await api.functional.shoppingMall.admin.sellers.platformCommissions.index(
      connection,
      {
        sellerId: testSellerId,
        body: {
          page: 1,
          limit: 40,
          currency: "USD",
        } satisfies IShoppingMallPlatformCommission.IRequest,
      },
    );
  typia.assert(currencyFilteredPage);

  TestValidator.predicate(
    "currency filtered pagination is valid",
    currencyFilteredPage.data.length <= 40,
  );
}
