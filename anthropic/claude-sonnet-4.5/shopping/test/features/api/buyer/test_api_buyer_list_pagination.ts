import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallBuyer";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";

/**
 * Test pagination controls for buyer listing with comprehensive validation.
 *
 * This test validates that administrators can efficiently navigate through
 * buyer account lists using pagination controls. It creates a sufficient
 * dataset (25 buyers) to span multiple pages and tests various pagination
 * scenarios including different page numbers, custom limit values, and boundary
 * conditions.
 *
 * The test ensures:
 *
 * 1. Admin authentication and authorization for buyer list access
 * 2. Creation of 25 buyer accounts for multi-page testing
 * 3. Pagination metadata accuracy (current, limit, records, pages)
 * 4. Different pages return distinct buyer sets without duplicates
 * 5. Edge cases with minimum and maximum limit values
 * 6. Complete data retrieval across all pages
 */
export async function test_api_buyer_list_pagination(
  connection: api.IConnection,
) {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { ...connection };
  const adminEmail = typia.random<string & tags.Format<"email">>();

  const admin = await api.functional.auth.admin.join(adminConnection, {
    body: {
      email: adminEmail,
      password: typia.random<string & tags.Format<"password">>(),
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: "super_admin",
      email_verified: true,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create 25 buyer accounts using separate connections
  const buyerCount = 25;
  const createdBuyerIds: string[] = [];

  for (let i = 0; i < buyerCount; i++) {
    const buyerConnection: api.IConnection = { ...connection };
    const buyerEmail = typia.random<string & tags.Format<"email">>();

    const buyer = await api.functional.auth.buyer.join(buyerConnection, {
      body: {
        email: buyerEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallBuyer.ICreate,
    });
    typia.assert(buyer);
    createdBuyerIds.push(buyer.id);
  }

  // Step 3: Test Case 1 - Default pagination (first page) using admin connection
  const defaultPage = await api.functional.shoppingMall.admin.buyers.index(
    adminConnection,
    {
      body: {} satisfies IShoppingMallBuyer.IRequest,
    },
  );
  typia.assert(defaultPage);

  TestValidator.predicate(
    "default pagination returns data",
    defaultPage.data.length > 0,
  );
  TestValidator.predicate(
    "pagination metadata exists",
    defaultPage.pagination !== null && defaultPage.pagination !== undefined,
  );

  // Step 4: Test Case 2 - Custom page size with limit=10
  const limit = 10;
  const page1 = await api.functional.shoppingMall.admin.buyers.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: limit,
      } satisfies IShoppingMallBuyer.IRequest,
    },
  );
  typia.assert(page1);

  TestValidator.equals("page 1 current is 1", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit is 10", page1.pagination.limit, limit);
  TestValidator.predicate(
    "page 1 records count is at least buyer count",
    page1.pagination.records >= buyerCount,
  );
  TestValidator.predicate(
    "page 1 data length does not exceed limit",
    page1.data.length <= limit,
  );

  const expectedPages = Math.ceil(page1.pagination.records / limit);
  TestValidator.equals(
    "page count calculation correct",
    page1.pagination.pages,
    expectedPages,
  );

  // Step 5: Test Case 3 - Navigate to second page
  const page2 = await api.functional.shoppingMall.admin.buyers.index(
    adminConnection,
    {
      body: {
        page: 2,
        limit: limit,
      } satisfies IShoppingMallBuyer.IRequest,
    },
  );
  typia.assert(page2);

  TestValidator.equals("page 2 current is 2", page2.pagination.current, 2);
  TestValidator.equals("page 2 limit is 10", page2.pagination.limit, limit);
  TestValidator.equals(
    "page 2 total records match page 1",
    page2.pagination.records,
    page1.pagination.records,
  );

  // Verify no duplicates between page 1 and page 2
  const page1Ids = page1.data.map((b) => b.id);
  const page2Ids = page2.data.map((b) => b.id);
  const duplicates = page1Ids.filter((id) => page2Ids.includes(id));
  TestValidator.equals(
    "no duplicates between page 1 and page 2",
    duplicates.length,
    0,
  );

  // Step 6: Test Case 4 - Navigate to last page
  const lastPageNumber = page1.pagination.pages;
  if (lastPageNumber > 0) {
    const lastPage = await api.functional.shoppingMall.admin.buyers.index(
      adminConnection,
      {
        body: {
          page: lastPageNumber,
          limit: limit,
        } satisfies IShoppingMallBuyer.IRequest,
      },
    );
    typia.assert(lastPage);

    TestValidator.equals(
      "last page current matches request",
      lastPage.pagination.current,
      lastPageNumber,
    );
    TestValidator.predicate(
      "last page may have fewer items than limit",
      lastPage.data.length <= limit,
    );
  }

  // Step 7: Test Case 5 - Edge cases with boundary limits

  // Test minimum limit (1)
  const minLimitPage = await api.functional.shoppingMall.admin.buyers.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 1,
      } satisfies IShoppingMallBuyer.IRequest,
    },
  );
  typia.assert(minLimitPage);
  TestValidator.equals("min limit is 1", minLimitPage.pagination.limit, 1);
  TestValidator.predicate(
    "min limit page returns at most 1 item",
    minLimitPage.data.length <= 1,
  );

  // Test maximum limit (100)
  const maxLimitPage = await api.functional.shoppingMall.admin.buyers.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IShoppingMallBuyer.IRequest,
    },
  );
  typia.assert(maxLimitPage);
  TestValidator.equals("max limit is 100", maxLimitPage.pagination.limit, 100);
  TestValidator.predicate(
    "max limit page returns at most 100 items",
    maxLimitPage.data.length <= 100,
  );

  // Step 8: Data integrity validation - collect all buyers across pages
  const allBuyerIds: string[] = [];
  const totalPages = Math.ceil(page1.pagination.records / 10);

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const currentPage = await api.functional.shoppingMall.admin.buyers.index(
      adminConnection,
      {
        body: {
          page: pageNum,
          limit: 10,
        } satisfies IShoppingMallBuyer.IRequest,
      },
    );
    typia.assert(currentPage);

    currentPage.data.forEach((buyer) => {
      allBuyerIds.push(buyer.id);
    });
  }

  // Verify no duplicate IDs across all pages
  const uniqueBuyerIds = [...new Set(allBuyerIds)];
  TestValidator.equals(
    "no duplicate buyers across all pages",
    allBuyerIds.length,
    uniqueBuyerIds.length,
  );

  // Verify all created buyers are retrievable through pagination
  TestValidator.predicate(
    "pagination returns at least all created buyers",
    uniqueBuyerIds.length >= buyerCount,
  );
}
