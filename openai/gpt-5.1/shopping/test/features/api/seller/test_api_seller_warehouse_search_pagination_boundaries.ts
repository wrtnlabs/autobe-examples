import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerWarehouse } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerWarehouse";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerWarehouse } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerWarehouse";

/**
 * Validate pagination boundaries and tenant scoping for seller warehouse
 * search.
 *
 * Business goals:
 *
 * - Ensure PATCH /shoppingMall/seller/sellerWarehouses correctly slices data
 *   across pages with deterministic ordering.
 * - Verify pagination metadata (current, limit, records, pages) is
 *   self-consistent and stable across repeated calls.
 * - Confirm that requesting a page index greater than `pages` yields an empty
 *   data array while preserving correct pagination metadata.
 * - Validate that seller-specific scoping is enforced: warehouses of one seller
 *   never appear in another seller's listing results.
 *
 * Scenario steps:
 *
 * 1. Register seller A via /auth/seller/join and obtain authenticated context.
 * 2. For seller A, create 25 warehouses with deterministic sequential codes and
 *    names so that sorting by `code` ascending yields a predictable order.
 * 3. Call PATCH /shoppingMall/seller/sellerWarehouses with { page: 1, limit: 10,
 *    sortBy: "code", sortDirection: "asc" }.
 *
 *    - Expect: 10 warehouses in `data`.
 *    - Validate pagination.current === 1, limit === 10.
 *    - Validate records >= 25 and pages === ceil(records / limit).
 *    - Validate that the 10 warehouses correspond to the first 10 created codes for
 *         seller A.
 * 4. Call PATCH again with page=2, same limit and sort.
 *
 *    - Expect: 10 warehouses in `data`.
 *    - Validate pagination.current === 2.
 *    - Validate that none of page 2 ids overlap with page 1 ids.
 *    - Validate that the warehouses correspond to the next 10 codes.
 * 5. Call PATCH with page set to a value greater than `pages` (e.g., pages + 10).
 *
 *    - Expect: data.length === 0.
 *    - Pagination metadata: current equals requested page, limit unchanged,
 *         records/pages same as earlier.
 * 6. Register seller B via /auth/seller/join.
 *
 *    - Create a few warehouses for seller B.
 * 7. Re-run listing for seller A (page 1, limit 50, sort by code asc) and assert
 *    that none of seller B's warehouse ids appear in the result.
 */
export async function test_api_seller_warehouse_search_pagination_boundaries(
  connection: api.IConnection,
) {
  // 1. Register seller A
  const sellerAJoinRequest = {
    email: `sellerA+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://seller-portal.example.com/join",
    referrer: "https://seller-portal.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerA: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerAJoinRequest,
    });
  typia.assert(sellerA);

  // 2. Create 25 warehouses for seller A with deterministic codes/names
  const totalWarehousesForA = 25;
  const sellerAWarehouseIds: string[] = [];

  for (let i = 1; i <= totalWarehousesForA; i++) {
    const indexStr = i.toString().padStart(3, "0");
    const createBody = {
      code: `WH-A-${indexStr}`,
      name: `Warehouse A ${i}`,
      description: null,
      is_default_origin: i === 1,
      status: "active",
    } satisfies IShoppingMallSellerWarehouse.ICreate;

    const created: IShoppingMallSellerWarehouse =
      await api.functional.shoppingMall.seller.sellerWarehouses.create(
        connection,
        { body: createBody },
      );
    typia.assert(created);
    sellerAWarehouseIds.push(created.id);
  }

  // 3. Page 1 listing (page=1, limit=10, sort by code asc)
  const page1Request = {
    page: 1,
    limit: 10,
    sortBy: "code",
    sortDirection: "asc",
  } satisfies IShoppingMallSellerWarehouse.IRequest;

  const page1: IPageIShoppingMallSellerWarehouse.ISummary =
    await api.functional.shoppingMall.seller.sellerWarehouses.index(
      connection,
      { body: page1Request },
    );
  typia.assert(page1);

  const page1Pagination = page1.pagination;
  const page1Data = page1.data;

  TestValidator.equals(
    "page 1: current page should be 1",
    page1Pagination.current,
    1,
  );
  TestValidator.equals("page 1: limit should be 10", page1Pagination.limit, 10);
  TestValidator.predicate(
    "page 1: records should be at least number of created warehouses",
    page1Pagination.records >= totalWarehousesForA,
  );

  const expectedPages = Math.ceil(
    page1Pagination.records / page1Pagination.limit,
  );
  TestValidator.equals(
    "page 1: pages should equal ceil(records/limit)",
    page1Pagination.pages,
    expectedPages,
  );

  TestValidator.equals(
    "page 1: data length should equal limit",
    page1Data.length,
    page1Pagination.limit,
  );

  // 4. Page 2 listing (page=2, limit=10, same sort)
  const page2Request = {
    page: 2,
    limit: 10,
    sortBy: "code",
    sortDirection: "asc",
  } satisfies IShoppingMallSellerWarehouse.IRequest;

  const page2: IPageIShoppingMallSellerWarehouse.ISummary =
    await api.functional.shoppingMall.seller.sellerWarehouses.index(
      connection,
      { body: page2Request },
    );
  typia.assert(page2);

  const page2Pagination = page2.pagination;
  const page2Data = page2.data;

  TestValidator.equals(
    "page 2: current page should be 2",
    page2Pagination.current,
    2,
  );
  TestValidator.equals("page 2: limit should be 10", page2Pagination.limit, 10);
  TestValidator.equals(
    "page 2: records should equal page1.records",
    page2Pagination.records,
    page1Pagination.records,
  );
  TestValidator.equals(
    "page 2: pages should equal page1.pages",
    page2Pagination.pages,
    page1Pagination.pages,
  );
  TestValidator.equals(
    "page 2: data length should equal limit",
    page2Data.length,
    page2Pagination.limit,
  );

  // Ensure no overlap between page1 and page2 ids
  const page1Ids = page1Data.map((w) => w.id);
  const page2Ids = page2Data.map((w) => w.id);
  const overlappingIds = page1Ids.filter((id) => page2Ids.includes(id));

  TestValidator.equals(
    "page 1 and page 2 should have no overlapping warehouse ids",
    overlappingIds.length,
    0,
  );

  // 5. Beyond-last-page listing
  const beyondPage = page1Pagination.pages + 10;
  const beyondRequest = {
    page: beyondPage,
    limit: 10,
    sortBy: "code",
    sortDirection: "asc",
  } satisfies IShoppingMallSellerWarehouse.IRequest;

  const beyond: IPageIShoppingMallSellerWarehouse.ISummary =
    await api.functional.shoppingMall.seller.sellerWarehouses.index(
      connection,
      { body: beyondRequest },
    );
  typia.assert(beyond);

  const beyondPagination = beyond.pagination;
  const beyondData = beyond.data;

  TestValidator.equals(
    "beyond-last-page: current should equal requested page",
    beyondPagination.current,
    beyondPage,
  );
  TestValidator.equals(
    "beyond-last-page: limit should equal requested limit",
    beyondPagination.limit,
    10,
  );
  TestValidator.equals(
    "beyond-last-page: records should remain stable",
    beyondPagination.records,
    page1Pagination.records,
  );
  TestValidator.equals(
    "beyond-last-page: pages should remain stable",
    beyondPagination.pages,
    page1Pagination.pages,
  );
  TestValidator.equals(
    "beyond-last-page: data array should be empty",
    beyondData.length,
    0,
  );

  // 6. Register seller B and create warehouses
  const sellerBJoinRequest = {
    email: `sellerB+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://seller-portal.example.com/join",
    referrer: "https://seller-portal.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerB: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerBJoinRequest,
    });
  typia.assert(sellerB);

  const sellerBWarehouseIds: string[] = [];
  const warehousesForB = 5;
  for (let i = 1; i <= warehousesForB; i++) {
    const indexStr = i.toString().padStart(3, "0");
    const createBodyB = {
      code: `WH-B-${indexStr}`,
      name: `Warehouse B ${i}`,
      description: null,
      is_default_origin: i === 1,
      status: "active",
    } satisfies IShoppingMallSellerWarehouse.ICreate;

    const createdB: IShoppingMallSellerWarehouse =
      await api.functional.shoppingMall.seller.sellerWarehouses.create(
        connection,
        { body: createBodyB },
      );
    typia.assert(createdB);
    sellerBWarehouseIds.push(createdB.id);
  }

  // 7. Re-authenticate as seller A and verify isolation in listing
  const sellerARejoinRequest = sellerAJoinRequest;
  const sellerAAgain: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerARejoinRequest,
    });
  typia.assert(sellerAAgain);

  const isolationRequest = {
    page: 1,
    limit: 50,
    sortBy: "code",
    sortDirection: "asc",
  } satisfies IShoppingMallSellerWarehouse.IRequest;

  const sellerAListAfterB: IPageIShoppingMallSellerWarehouse.ISummary =
    await api.functional.shoppingMall.seller.sellerWarehouses.index(
      connection,
      { body: isolationRequest },
    );
  typia.assert(sellerAListAfterB);

  const allIdsForAAfterB = sellerAListAfterB.data.map((w) => w.id);
  const leakedIds = sellerBWarehouseIds.filter((id) =>
    allIdsForAAfterB.includes(id),
  );

  TestValidator.equals(
    "warehouses of seller B must not appear in seller A's listing",
    leakedIds.length,
    0,
  );
}
