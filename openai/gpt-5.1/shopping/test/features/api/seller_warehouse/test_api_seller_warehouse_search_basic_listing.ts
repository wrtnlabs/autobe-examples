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
 * Basic listing of seller warehouses with default pagination-only filters.
 *
 * This E2E test verifies that:
 *
 * - An authenticated seller can retrieve a paginated list of _their own_
 *   warehouses using PATCH /shoppingMall/seller/sellerWarehouses with only
 *   `page` and `limit` populated in IShoppingMallSellerWarehouse.IRequest.
 * - The result set is properly scoped so that it only contains warehouses that
 *   belong to the authenticated seller.
 * - Pagination metadata (current, limit, records, pages) is coherent with the
 *   number of created warehouses and the requested limit.
 * - Warehouses from other sellers never appear in the listing.
 *
 * High level steps:
 *
 * 1. Join seller A and let the SDK attach its token to the connection.
 * 2. Create multiple warehouses for seller A with distinct codes and attributes.
 * 3. List warehouses with minimal request body (page + limit only) and validate
 *    pagination metadata and seller scoping.
 * 4. Join seller B and create separate warehouses.
 * 5. List again as seller B and ensure no seller A warehouses appear and all
 *    entries belong to seller B.
 */
export async function test_api_seller_warehouse_search_basic_listing(
  connection: api.IConnection,
) {
  // 1. Join seller A
  const sellerAJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://seller-a.example.com/join",
    referrer: "https://seller-a.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerA: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerAJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerA);

  const sellerAId = sellerA.id;

  // 2. Create multiple warehouses for seller A
  const sellerAWarehouseCount = 5;
  const sellerAWarehouses: IShoppingMallSellerWarehouse[] = [];

  for (let i = 0; i < sellerAWarehouseCount; i++) {
    const createBody = {
      code: `A-WH-${i + 1}`,
      name: `SellerA Warehouse ${i + 1}`,
      description: RandomGenerator.paragraph({ sentences: 3 }),
      is_default_origin: i === 0,
      status: "active",
    } satisfies IShoppingMallSellerWarehouse.ICreate;

    const created: IShoppingMallSellerWarehouse =
      await api.functional.shoppingMall.seller.sellerWarehouses.create(
        connection,
        { body: createBody },
      );
    typia.assert<IShoppingMallSellerWarehouse>(created);
    sellerAWarehouses.push(created);
  }

  const sellerAWarehouseCodes = sellerAWarehouses.map((w) => w.code);

  // 3. List warehouses as seller A with minimal request (page + limit only)
  const page = 1;
  const limit = 3;

  const listRequestA = {
    page,
    limit,
  } satisfies IShoppingMallSellerWarehouse.IRequest;

  const pageA: IPageIShoppingMallSellerWarehouse.ISummary =
    await api.functional.shoppingMall.seller.sellerWarehouses.index(
      connection,
      {
        body: listRequestA,
      },
    );
  typia.assert<IPageIShoppingMallSellerWarehouse.ISummary>(pageA);

  // 4. Validate pagination metadata for seller A
  const paginationA = pageA.pagination;
  TestValidator.equals(
    "seller A - current page should equal requested page",
    page,
    paginationA.current,
  );
  TestValidator.equals(
    "seller A - limit should equal requested limit",
    limit,
    paginationA.limit,
  );

  // records must be at least the number of warehouses we just created
  TestValidator.predicate(
    "seller A - records should be at least created warehouse count",
    paginationA.records >= sellerAWarehouseCount,
  );

  TestValidator.predicate(
    "seller A - pages should equal ceil(records / limit)",
    paginationA.pages === Math.ceil(paginationA.records / paginationA.limit),
  );

  // 5. Ensure all returned entries belong to seller A and contain only seller A codes
  const dataA = pageA.data;

  for (const summary of dataA) {
    // seller scoping
    TestValidator.equals(
      "seller A - summary.seller.id must equal sellerA.id",
      sellerAId,
      summary.seller.id,
    );

    // Ensure that the code is one of seller A's created codes
    TestValidator.predicate(
      "seller A - summary.code must be one of seller A's warehouse codes",
      sellerAWarehouseCodes.includes(summary.code),
    );
  }

  // Capture seller A codes for later cross-seller contamination check
  const sellerACodeSet = new Set<string>(sellerAWarehouseCodes);

  // 6. Join seller B (this overwrites connection Authorization to seller B)
  const sellerBJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://seller-b.example.com/join",
    referrer: "https://seller-b.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerB: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerBJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerB);

  const sellerBId = sellerB.id;

  // 7. Create a few warehouses for seller B
  const sellerBWarehouseCount = 3;
  const sellerBWarehouses: IShoppingMallSellerWarehouse[] = [];

  for (let i = 0; i < sellerBWarehouseCount; i++) {
    const createBody = {
      code: `B-WH-${i + 1}`,
      name: `SellerB Warehouse ${i + 1}`,
      description: RandomGenerator.paragraph({ sentences: 2 }),
      is_default_origin: i === 0,
      status: "active",
    } satisfies IShoppingMallSellerWarehouse.ICreate;

    const created: IShoppingMallSellerWarehouse =
      await api.functional.shoppingMall.seller.sellerWarehouses.create(
        connection,
        { body: createBody },
      );
    typia.assert<IShoppingMallSellerWarehouse>(created);
    sellerBWarehouses.push(created);
  }

  const sellerBWarehouseCodes = sellerBWarehouses.map((w) => w.code);

  // 8. List warehouses as seller B with the same minimal request
  const listRequestB = {
    page,
    limit,
  } satisfies IShoppingMallSellerWarehouse.IRequest;

  const pageB: IPageIShoppingMallSellerWarehouse.ISummary =
    await api.functional.shoppingMall.seller.sellerWarehouses.index(
      connection,
      {
        body: listRequestB,
      },
    );
  typia.assert<IPageIShoppingMallSellerWarehouse.ISummary>(pageB);

  const paginationB = pageB.pagination;
  TestValidator.equals(
    "seller B - current page should equal requested page",
    page,
    paginationB.current,
  );
  TestValidator.equals(
    "seller B - limit should equal requested limit",
    limit,
    paginationB.limit,
  );

  TestValidator.predicate(
    "seller B - records should be at least created warehouse count",
    paginationB.records >= sellerBWarehouseCount,
  );

  TestValidator.predicate(
    "seller B - pages should equal ceil(records / limit)",
    paginationB.pages === Math.ceil(paginationB.records / paginationB.limit),
  );

  const dataB = pageB.data;

  for (const summary of dataB) {
    // Ensure all belong to seller B
    TestValidator.equals(
      "seller B - summary.seller.id must equal sellerB.id",
      sellerBId,
      summary.seller.id,
    );

    // Ensure none of seller A's codes appear in seller B listing
    TestValidator.predicate(
      "seller B - summary.code must not be one of seller A's codes",
      !sellerACodeSet.has(summary.code),
    );

    // Additionally, in a clean test DB, codes should match those we created for B
    TestValidator.predicate(
      "seller B - summary.code should be one of seller B's warehouse codes",
      sellerBWarehouseCodes.includes(summary.code),
    );
  }
}
