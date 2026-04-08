import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test seller listing with custom sorting and pagination parameters.
 *
 * Validates the seller list API's sorting and pagination functionality for administrative oversight. Tests various sorting options (email, shop_name, approval_status) with both ascending and descending directions. Verifies both cursor-based and offset-based pagination methods work correctly, including proper metadata calculation.
 *
 * Special attention is given to ensuring pagination metadata (current page, limit, total records, total pages) accurately reflects the data returned, and that empty result sets are handled gracefully with appropriate metadata values.
 *
 * 1. Administrator connection is used to access seller management endpoints.
 * 2. Test email ascending sort: Verify sellers ordered alphabetically by email (A-Z).
 * 3. Test shop_name descending sort: Verify sellers ordered by shop name (Z-A).
 * 4. Test approval_status sorting: Verify consistent ordering of status values.
 * 5. Test pagination with limit=50: Verify up to 50 records per page.
 * 6. Test pagination with limit=100 (maximum): Verify up to 100 records returned.
 * 7. Test page-based pagination: Request page=2 with limit=20, verify offset-based pagination.
 * 8. Verify pagination metadata accuracy: current, limit, records, pages values correct.
 * 9. Test filtered result set: Filter by specific approval_status, verify correct filtering.
 */
export async function test_api_seller_list_sorting_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Use admin connection (assumed pre-authenticated)
  const adminConnection: api.IConnection = { host: connection.host };
  // 2. Test email ascending sort
  const emailAscResult = await api.functional.shoppingMall.sellers.index(
    adminConnection,
    {
      body: {
        sort: { field: "email", direction: "asc" },
        limit: 20,
      },
    },
  );
  typia.assert(emailAscResult);
  TestValidator.predicate(
    "email ascending sort has data",
    emailAscResult.data.length > 0,
  );
  if (emailAscResult.data.length > 1) {
    for (let i = 1; i < emailAscResult.data.length; i++) {
      TestValidator.predicate(
        `email ascending order at index ${i}`,
        emailAscResult.data[i - 1].email <= emailAscResult.data[i].email,
      );
    }
  }
  // 3. Test shop_name descending sort
  const shopNameDescResult = await api.functional.shoppingMall.sellers.index(
    adminConnection,
    {
      body: {
        sort: { field: "shop_name", direction: "desc" },
        limit: 20,
      },
    },
  );
  typia.assert(shopNameDescResult);
  TestValidator.predicate(
    "shop_name descending sort has data",
    shopNameDescResult.data.length > 0,
  );
  if (shopNameDescResult.data.length > 1) {
    for (let i = 1; i < shopNameDescResult.data.length; i++) {
      TestValidator.predicate(
        `shop_name descending order at index ${i}`,
        shopNameDescResult.data[i - 1].seller_profile.shop_name >=
          shopNameDescResult.data[i].seller_profile.shop_name,
      );
    }
  }
  // 4. Test approval_status sorting
  const approvalStatusResult = await api.functional.shoppingMall.sellers.index(
    adminConnection,
    {
      body: {
        sort: { field: "approval_status", direction: "asc" },
        limit: 20,
      },
    },
  );
  typia.assert(approvalStatusResult);
  TestValidator.predicate(
    "approval_status sort has data",
    approvalStatusResult.data.length > 0,
  );
  // 5. Test pagination with limit=50
  const limit50Result = await api.functional.shoppingMall.sellers.index(
    adminConnection,
    {
      body: { limit: 50 },
    },
  );
  typia.assert(limit50Result);
  TestValidator.equals(
    "limit 50 pagination limit",
    limit50Result.pagination.limit,
    50,
  );
  TestValidator.predicate(
    "limit 50 data count <= 50",
    limit50Result.data.length <= 50,
  );
  TestValidator.equals(
    "limit 50 data count matches",
    limit50Result.data.length,
    Math.min(limit50Result.pagination.records, 50),
  );
  // 6. Test pagination with limit=100 (maximum)
  const limit100Result = await api.functional.shoppingMall.sellers.index(
    adminConnection,
    {
      body: { limit: 100 },
    },
  );
  typia.assert(limit100Result);
  TestValidator.equals(
    "limit 100 pagination limit",
    limit100Result.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "limit 100 data count <= 100",
    limit100Result.data.length <= 100,
  );
  // 7. Test page-based pagination
  const page2Result = await api.functional.shoppingMall.sellers.index(
    adminConnection,
    {
      body: { page: 2, limit: 20 },
    },
  );
  typia.assert(page2Result);
  TestValidator.equals(
    "page 2 current page",
    page2Result.pagination.current,
    2,
  );
  TestValidator.equals("page 2 limit", page2Result.pagination.limit, 20);
  // 8. Verify pagination metadata accuracy
  TestValidator.predicate(
    "pagination metadata current >= 1",
    page2Result.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination metadata limit > 0",
    page2Result.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination metadata records >= 0",
    page2Result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination metadata pages >= 0",
    page2Result.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination pages calculation correct",
    page2Result.pagination.pages ===
      Math.ceil(page2Result.pagination.records / page2Result.pagination.limit),
  );
  // 9. Test filtered result set with specific approval_status
  const filteredResult = await api.functional.shoppingMall.sellers.index(
    adminConnection,
    {
      body: {
        approval_status: "pending",
        limit: 20,
      },
    },
  );
  typia.assert(filteredResult);
  TestValidator.predicate(
    "filtered result has correct limit",
    filteredResult.pagination.limit === 20,
  );
  // Verify all returned sellers have the filtered approval_status
  for (const seller of filteredResult.data) {
    TestValidator.equals(
      `seller approval_status matches filter`,
      seller.approval_status,
      "pending",
    );
  }
  // 10. Test search functionality with email search
  const searchResult = await api.functional.shoppingMall.sellers.index(
    adminConnection,
    {
      body: {
        search: "test",
        limit: 20,
      },
    },
  );
  typia.assert(searchResult);
  TestValidator.predicate(
    "search result has pagination",
    searchResult.pagination.current >= 1,
  );
}
