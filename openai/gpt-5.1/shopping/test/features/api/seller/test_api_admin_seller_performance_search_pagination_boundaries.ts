import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerPerformanceSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerPerformanceSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerPerformanceSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPerformanceSnapshot";

export async function test_api_admin_seller_performance_search_pagination_boundaries(
  connection: api.IConnection,
) {
  // 1. Admin join & authentication
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://admin.test.example.com/join",
    referrer: "https://admin.test.example.com/login",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. First page request: page = 1, small limit
  const limit = 5;
  const page1Number = 1;

  const page1RequestBody = {
    // broad filter: omit sellerId/sellerIds to hit as many rows as possible
    timezone: "Asia/Seoul",
    page: page1Number as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: limit as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallSellerPerformanceSnapshot.IRequest;

  const page1: IPageIShoppingMallSellerPerformanceSnapshot.ISummary =
    await api.functional.shoppingMall.admin.analytics.sellerPerformance.index(
      connection,
      {
        body: page1RequestBody,
      },
    );
  typia.assert<IPageIShoppingMallSellerPerformanceSnapshot.ISummary>(page1);

  const page1Pagination = page1.pagination;
  const page1Data = page1.data;

  // Basic assertions for page 1
  TestValidator.equals(
    "page 1: current page should be 1",
    page1Number,
    page1Pagination.current,
  );
  TestValidator.equals(
    "page 1: limit should equal requested limit",
    limit,
    page1Pagination.limit,
  );

  // If there are no records at all, assert empty data and stop
  if (page1Pagination.records === 0) {
    TestValidator.equals(
      "page 1: no records implies empty data array",
      0,
      page1Data.length,
    );
    return;
  }

  // If only a single page exists, we cannot test cross-page behavior
  if (page1Pagination.pages <= 1) {
    TestValidator.predicate(
      "single page: data length should be <= limit",
      page1Data.length <= page1Pagination.limit,
    );
    return;
  }

  // Capture IDs on first page for cross-page distinctness checks
  const page1Ids: string[] = page1Data.map((row) => row.id);

  // 3. Second page request: page = 2
  const page2Number = 2;

  const page2RequestBody = {
    timezone: page1RequestBody.timezone,
    page: page2Number as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: limit as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallSellerPerformanceSnapshot.IRequest;

  const page2: IPageIShoppingMallSellerPerformanceSnapshot.ISummary =
    await api.functional.shoppingMall.admin.analytics.sellerPerformance.index(
      connection,
      {
        body: page2RequestBody,
      },
    );
  typia.assert<IPageIShoppingMallSellerPerformanceSnapshot.ISummary>(page2);

  const page2Pagination = page2.pagination;
  const page2Data = page2.data;

  // Pagination metadata should be consistent across pages 1 and 2
  TestValidator.equals(
    "page 2: records should be identical to page 1",
    page1Pagination.records,
    page2Pagination.records,
  );
  TestValidator.equals(
    "page 2: pages should be identical to page 1",
    page1Pagination.pages,
    page2Pagination.pages,
  );
  TestValidator.equals(
    "page 2: limit should equal requested limit",
    limit,
    page2Pagination.limit,
  );
  TestValidator.equals(
    "page 2: current page should be 2",
    page2Number,
    page2Pagination.current,
  );

  // Cross-page data distinctness: IDs from page 1 should not appear on page 2
  if (page2Data.length > 0) {
    const page2Ids: string[] = page2Data.map((row) => row.id);
    for (const id of page2Ids) {
      TestValidator.predicate(
        "snapshot IDs on page 2 should not repeat any ID from page 1",
        page1Ids.includes(id) === false,
      );
    }
  }

  // 4. Request a page beyond the last: pages + 1
  const beyondPageNumber = page1Pagination.pages + 1;

  const beyondRequestBody = {
    timezone: page1RequestBody.timezone,
    page: beyondPageNumber as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: limit as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallSellerPerformanceSnapshot.IRequest;

  const beyond: IPageIShoppingMallSellerPerformanceSnapshot.ISummary =
    await api.functional.shoppingMall.admin.analytics.sellerPerformance.index(
      connection,
      {
        body: beyondRequestBody,
      },
    );
  typia.assert<IPageIShoppingMallSellerPerformanceSnapshot.ISummary>(beyond);

  const beyondPagination = beyond.pagination;
  const beyondData = beyond.data;

  // Pagination metadata stability at boundary
  TestValidator.equals(
    "beyond-last: records should be identical to initial pagination.records",
    page1Pagination.records,
    beyondPagination.records,
  );
  TestValidator.equals(
    "beyond-last: pages should be identical to initial pagination.pages",
    page1Pagination.pages,
    beyondPagination.pages,
  );
  TestValidator.equals(
    "beyond-last: current should equal requested beyondPageNumber",
    beyondPageNumber,
    beyondPagination.current,
  );
  TestValidator.equals(
    "beyond-last: limit should equal requested limit",
    limit,
    beyondPagination.limit,
  );

  // Boundary behavior assumption: beyond-last page returns empty data
  TestValidator.equals(
    "beyond-last: data array should be empty for out-of-range page",
    0,
    beyondData.length,
  );
}
