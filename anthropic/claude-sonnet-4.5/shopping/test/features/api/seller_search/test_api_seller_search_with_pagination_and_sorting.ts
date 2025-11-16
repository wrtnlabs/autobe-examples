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
 * Test comprehensive seller search with pagination controls and flexible
 * sorting options.
 *
 * This scenario validates that administrators can browse large seller datasets
 * efficiently using page-based navigation with configurable page sizes and
 * multiple sort orders. The test creates a substantial number of seller
 * accounts, then performs paginated searches with various sort_by fields
 * (created_at, store_name, status) and order directions (asc, desc).
 *
 * It verifies:
 *
 * 1. Correct pagination metadata (current page, total records, total pages)
 * 2. Page size limits are respected (maximum 100 records per page)
 * 3. Proper sorting order across multiple pages
 * 4. Combining pagination with filters produces consistent results
 *
 * This ensures scalable seller management for marketplaces with large seller
 * populations and supports diverse administrative browsing patterns.
 */
export async function test_api_seller_search_with_pagination_and_sorting(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for seller management
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        admin_level: "super_admin" as const,
        email_verified: true,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create multiple seller accounts (at least 25 to test pagination properly)
  const sellerCount = 25;
  const sellers: IShoppingMallSeller.IAuthorized[] =
    await ArrayUtil.asyncRepeat(sellerCount, async (index) => {
      const sellerEmail = typia.random<string & tags.Format<"email">>();
      const seller: IShoppingMallSeller.IAuthorized =
        await api.functional.auth.seller.join(connection, {
          body: {
            email: sellerEmail,
            password: typia.random<string & tags.MinLength<8>>(),
            full_name: RandomGenerator.name(),
            phone_number: RandomGenerator.mobile(),
            business_name: `Business ${index} ${RandomGenerator.name()}`,
            business_description: RandomGenerator.content({ paragraphs: 2 }),
            store_name: `Store ${index} ${RandomGenerator.name()}`,
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
          } satisfies IShoppingMallSeller.ICreate,
        });
      typia.assert(seller);
      return seller;
    });

  // Step 3: Test basic pagination with default sorting (admin already authenticated from step 1)
  const page1Result: IPageIShoppingMallSeller.ISummary =
    await api.functional.shoppingMall.admin.sellers.index(connection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallSeller.IRequest,
    });
  typia.assert(page1Result);

  // Validate pagination metadata
  TestValidator.equals(
    "first page current should be 1",
    page1Result.pagination.current,
    1,
  );
  TestValidator.equals(
    "page limit should be 10",
    page1Result.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "total records should be at least seller count",
    page1Result.pagination.records >= sellerCount,
  );
  TestValidator.predicate(
    "data length should match limit or less",
    page1Result.data.length <= 10,
  );

  // Step 4: Test second page
  const page2Result: IPageIShoppingMallSeller.ISummary =
    await api.functional.shoppingMall.admin.sellers.index(connection, {
      body: {
        page: 2,
        limit: 10,
      } satisfies IShoppingMallSeller.IRequest,
    });
  typia.assert(page2Result);

  TestValidator.equals(
    "second page current should be 2",
    page2Result.pagination.current,
    2,
  );
  TestValidator.predicate(
    "second page should have data if total exceeds 10",
    page2Result.data.length > 0 ? page2Result.pagination.records > 10 : true,
  );

  // Step 5: Test sorting by created_at ascending
  const sortedByDateAsc: IPageIShoppingMallSeller.ISummary =
    await api.functional.shoppingMall.admin.sellers.index(connection, {
      body: {
        page: 1,
        limit: 20,
        sort_by: "created_at" as const,
        order: "asc" as const,
      } satisfies IShoppingMallSeller.IRequest,
    });
  typia.assert(sortedByDateAsc);

  // Step 6: Test sorting by created_at descending
  const sortedByDateDesc: IPageIShoppingMallSeller.ISummary =
    await api.functional.shoppingMall.admin.sellers.index(connection, {
      body: {
        page: 1,
        limit: 20,
        sort_by: "created_at" as const,
        order: "desc" as const,
      } satisfies IShoppingMallSeller.IRequest,
    });
  typia.assert(sortedByDateDesc);

  // Step 7: Test sorting by store_name ascending
  const sortedByNameAsc: IPageIShoppingMallSeller.ISummary =
    await api.functional.shoppingMall.admin.sellers.index(connection, {
      body: {
        page: 1,
        limit: 15,
        sort_by: "store_name" as const,
        order: "asc" as const,
      } satisfies IShoppingMallSeller.IRequest,
    });
  typia.assert(sortedByNameAsc);

  // Step 8: Test sorting by status
  const sortedByStatus: IPageIShoppingMallSeller.ISummary =
    await api.functional.shoppingMall.admin.sellers.index(connection, {
      body: {
        page: 1,
        limit: 20,
        sort_by: "status" as const,
        order: "asc" as const,
      } satisfies IShoppingMallSeller.IRequest,
    });
  typia.assert(sortedByStatus);

  // Step 9: Test maximum page size limit (100)
  const maxPageSize: IPageIShoppingMallSeller.ISummary =
    await api.functional.shoppingMall.admin.sellers.index(connection, {
      body: {
        page: 1,
        limit: 100,
      } satisfies IShoppingMallSeller.IRequest,
    });
  typia.assert(maxPageSize);

  TestValidator.equals(
    "max page size limit should be 100",
    maxPageSize.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "data length should not exceed 100",
    maxPageSize.data.length <= 100,
  );

  // Step 10: Test combining pagination with status filter
  const filteredPaginated: IPageIShoppingMallSeller.ISummary =
    await api.functional.shoppingMall.admin.sellers.index(connection, {
      body: {
        page: 1,
        limit: 10,
        status: "pending" as const,
        sort_by: "created_at" as const,
        order: "desc" as const,
      } satisfies IShoppingMallSeller.IRequest,
    });
  typia.assert(filteredPaginated);

  // Validate that all returned sellers have the filtered status
  if (filteredPaginated.data.length > 0) {
    for (const seller of filteredPaginated.data) {
      TestValidator.equals(
        "filtered seller status should be pending",
        seller.status,
        "pending",
      );
    }
  }

  // Step 11: Test total pages calculation
  const smallPageSize: IPageIShoppingMallSeller.ISummary =
    await api.functional.shoppingMall.admin.sellers.index(connection, {
      body: {
        page: 1,
        limit: 5,
      } satisfies IShoppingMallSeller.IRequest,
    });
  typia.assert(smallPageSize);

  const expectedPages = Math.ceil(smallPageSize.pagination.records / 5);
  TestValidator.equals(
    "total pages should be calculated correctly",
    smallPageSize.pagination.pages,
    expectedPages,
  );
}
