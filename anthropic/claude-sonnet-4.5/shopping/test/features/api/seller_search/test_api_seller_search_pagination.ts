import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test seller account search pagination capabilities.
 *
 * This test validates the admin seller search API's pagination functionality
 * by:
 *
 * 1. Authenticating as an admin user
 * 2. Testing multiple page sizes (10, 20, 50)
 * 3. Navigating through pages and validating metadata
 * 4. Ensuring all sellers appear exactly once without duplication
 * 5. Verifying total count accuracy and sorting consistency
 *
 * The test assumes multiple seller accounts exist in the system to enable
 * meaningful pagination testing.
 */
export async function test_api_seller_search_pagination(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    name: RandomGenerator.name(),
    role_level: "super_admin",
  } satisfies IShoppingMallAdmin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCredentials,
    });
  typia.assert(admin);

  // Step 2: Test pagination with different page sizes
  const pageSizes = [10, 20, 50] as const;

  for (const pageSize of pageSizes) {
    // Fetch first page to get total count
    const firstPage: IPageIShoppingMallSeller.ISummary =
      await api.functional.shoppingMall.admin.sellers.index(connection, {
        body: {
          page: 0,
          limit: pageSize,
        } satisfies IShoppingMallSeller.IRequest,
      });
    typia.assert(firstPage);

    // Validate pagination metadata structure
    TestValidator.predicate(
      "pagination metadata exists",
      firstPage.pagination !== null && firstPage.pagination !== undefined,
    );

    const pagination: IPage.IPagination = firstPage.pagination;
    typia.assert(pagination);

    // Validate first page metadata
    TestValidator.equals("current page is 0", pagination.current, 0);

    TestValidator.equals(
      "limit matches requested page size",
      pagination.limit,
      pageSize,
    );

    TestValidator.predicate(
      "total records is non-negative",
      pagination.records >= 0,
    );

    TestValidator.predicate(
      "total pages calculation is correct",
      pagination.pages === Math.ceil(pagination.records / pagination.limit),
    );

    // Step 3: Collect all sellers across pages to verify uniqueness
    const allSellerIds: string[] = [];
    const totalPages = pagination.pages;

    for (let currentPage = 0; currentPage < totalPages; currentPage++) {
      const pageResult: IPageIShoppingMallSeller.ISummary =
        await api.functional.shoppingMall.admin.sellers.index(connection, {
          body: {
            page: currentPage,
            limit: pageSize,
          } satisfies IShoppingMallSeller.IRequest,
        });
      typia.assert(pageResult);

      // Validate page metadata
      TestValidator.equals(
        `page ${currentPage} current page matches`,
        pageResult.pagination.current,
        currentPage,
      );

      TestValidator.equals(
        `page ${currentPage} total records consistent`,
        pageResult.pagination.records,
        pagination.records,
      );

      TestValidator.equals(
        `page ${currentPage} total pages consistent`,
        pageResult.pagination.pages,
        totalPages,
      );

      // Collect seller IDs from this page
      for (const seller of pageResult.data) {
        typia.assert(seller);
        allSellerIds.push(seller.id);
      }

      // Validate page size (last page may be smaller)
      const expectedPageSize =
        currentPage === totalPages - 1
          ? pagination.records - currentPage * pageSize
          : Math.min(pageSize, pagination.records - currentPage * pageSize);

      TestValidator.equals(
        `page ${currentPage} has correct number of items`,
        pageResult.data.length,
        expectedPageSize,
      );
    }

    // Step 4: Validate uniqueness - no duplicates
    const uniqueSellerIds = Array.from(new Set(allSellerIds));
    TestValidator.equals(
      `no duplicate sellers across pages with page size ${pageSize}`,
      allSellerIds.length,
      uniqueSellerIds.length,
    );

    // Step 5: Validate total count accuracy
    TestValidator.equals(
      `total sellers collected matches reported count for page size ${pageSize}`,
      allSellerIds.length,
      pagination.records,
    );
  }

  // Step 6: Test edge cases - empty results with high page number
  const emptyPage: IPageIShoppingMallSeller.ISummary =
    await api.functional.shoppingMall.admin.sellers.index(connection, {
      body: {
        page: 999999,
        limit: 10,
      } satisfies IShoppingMallSeller.IRequest,
    });
  typia.assert(emptyPage);

  TestValidator.equals(
    "high page number returns empty data array",
    emptyPage.data.length,
    0,
  );
}
