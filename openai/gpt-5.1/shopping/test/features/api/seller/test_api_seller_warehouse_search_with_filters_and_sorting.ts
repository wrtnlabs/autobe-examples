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
 * Verify seller warehouse search with filters and sorting.
 *
 * Business workflow:
 *
 * 1. Register a seller (join) to obtain an authenticated seller context.
 * 2. Seed multiple warehouses with various statuses, default-origin flags, and
 *    location-related codes/names.
 * 3. Search warehouses with combined filters (status, isDefaultOrigin, search) and
 *    validate that only matching warehouses are returned and sorted by name
 *    ascending.
 * 4. Re-run the search sorted by created_at descending (via sortBy option) and
 *    ensure the result shape and filters remain consistent.
 * 5. Run a search with a keyword that matches no warehouse and assert that an
 *    empty result set is returned with consistent pagination metadata.
 */
export async function test_api_seller_warehouse_search_with_filters_and_sorting(
  connection: api.IConnection,
) {
  // 1. Register a seller and obtain authorized context
  const joinBody: IShoppingMallSellerAuthJoin.IRequest =
    typia.random<IShoppingMallSellerAuthJoin.IRequest>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(seller);

  // 2. Seed warehouses with controlled data so that we can assert filters
  const baseStatusActive = "active";
  const baseStatusInactive = "inactive";

  const seoulDefault1: IShoppingMallSellerWarehouse =
    await api.functional.shoppingMall.seller.sellerWarehouses.create(
      connection,
      {
        body: {
          code: "WH-SEOUL-01",
          name: "Seoul Main Warehouse",
          description: RandomGenerator.paragraph({ sentences: 3 }),
          is_default_origin: true,
          status: baseStatusActive,
        } satisfies IShoppingMallSellerWarehouse.ICreate,
      },
    );
  typia.assert<IShoppingMallSellerWarehouse>(seoulDefault1);

  const seoulDefault2: IShoppingMallSellerWarehouse =
    await api.functional.shoppingMall.seller.sellerWarehouses.create(
      connection,
      {
        body: {
          code: "WH-SEOUL-02",
          name: "Seoul Secondary Warehouse",
          description: RandomGenerator.paragraph({ sentences: 3 }),
          is_default_origin: true,
          status: baseStatusActive,
        } satisfies IShoppingMallSellerWarehouse.ICreate,
      },
    );
  typia.assert<IShoppingMallSellerWarehouse>(seoulDefault2);

  const seoulNonDefault: IShoppingMallSellerWarehouse =
    await api.functional.shoppingMall.seller.sellerWarehouses.create(
      connection,
      {
        body: {
          code: "WH-SEOUL-03",
          name: "Seoul Nondefault Warehouse",
          description: RandomGenerator.paragraph({ sentences: 3 }),
          is_default_origin: false,
          status: baseStatusActive,
        } satisfies IShoppingMallSellerWarehouse.ICreate,
      },
    );
  typia.assert<IShoppingMallSellerWarehouse>(seoulNonDefault);

  const busanDefaultInactive: IShoppingMallSellerWarehouse =
    await api.functional.shoppingMall.seller.sellerWarehouses.create(
      connection,
      {
        body: {
          code: "WH-BUSAN-01",
          name: "Busan Main Warehouse",
          description: RandomGenerator.paragraph({ sentences: 3 }),
          is_default_origin: true,
          status: baseStatusInactive,
        } satisfies IShoppingMallSellerWarehouse.ICreate,
      },
    );
  typia.assert<IShoppingMallSellerWarehouse>(busanDefaultInactive);

  // 3. Search with filters: status=active, isDefaultOrigin=true, search="Seoul",
  //    sortBy=name asc, with large page/limit
  const searchKeyword = "Seoul";
  const firstSearch: IPageIShoppingMallSellerWarehouse.ISummary =
    await api.functional.shoppingMall.seller.sellerWarehouses.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          search: searchKeyword,
          status: baseStatusActive,
          isDefaultOrigin: true,
          sortBy: "name",
          sortDirection: "asc",
        },
      },
    );
  typia.assert<IPageIShoppingMallSellerWarehouse.ISummary>(firstSearch);

  const firstData = firstSearch.data;

  // 4-a. All warehouses belong to this seller and match filters
  for (const summary of firstData) {
    // Seller scoping: seller.id must match the joined seller id
    TestValidator.equals(
      "warehouse belongs to authenticated seller",
      summary.seller.id,
      seller.id,
    );

    // Status filter
    TestValidator.equals(
      "warehouse status matches filter",
      summary.status,
      baseStatusActive,
    );

    // isDefaultOrigin filter
    TestValidator.equals(
      "warehouse is default origin",
      summary.isDefaultOrigin,
      true,
    );

    // Search keyword must appear in code or name
    const containsKeyword =
      summary.code.includes(searchKeyword) ||
      summary.name.includes(searchKeyword);
    TestValidator.predicate(
      "warehouse code or name contains search keyword",
      containsKeyword,
    );
  }

  // 4-b. Ensure results are ordered by name ascending
  for (let i = 1; i < firstData.length; ++i) {
    const prev = firstData[i - 1];
    const curr = firstData[i];
    TestValidator.predicate(
      "warehouses sorted by name ascending",
      prev.name.localeCompare(curr.name) <= 0,
    );
  }

  // 5. Second search: same filters, sortBy=created_at desc. We cannot
  // inspect warehouse created_at from the summary DTO, but we still call the
  // endpoint to ensure it accepts the sort options and returns consistent
  // filtered data.
  const secondSearch: IPageIShoppingMallSellerWarehouse.ISummary =
    await api.functional.shoppingMall.seller.sellerWarehouses.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          search: searchKeyword,
          status: baseStatusActive,
          isDefaultOrigin: true,
          sortBy: "created_at",
          sortDirection: "desc",
        },
      },
    );
  typia.assert<IPageIShoppingMallSellerWarehouse.ISummary>(secondSearch);

  const secondData = secondSearch.data;

  for (const summary of secondData) {
    TestValidator.equals(
      "second search warehouse belongs to authenticated seller",
      summary.seller.id,
      seller.id,
    );
    TestValidator.equals(
      "second search warehouse status matches filter",
      summary.status,
      baseStatusActive,
    );
    TestValidator.equals(
      "second search warehouse is default origin",
      summary.isDefaultOrigin,
      true,
    );
    const containsKeyword =
      summary.code.includes(searchKeyword) ||
      summary.name.includes(searchKeyword);
    TestValidator.predicate(
      "second search warehouse code or name contains search keyword",
      containsKeyword,
    );
  }

  // 6. Third search: keyword that matches no warehouse
  const noMatchKeyword = "NoSuchWarehouseKeyword";
  const thirdSearch: IPageIShoppingMallSellerWarehouse.ISummary =
    await api.functional.shoppingMall.seller.sellerWarehouses.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          search: noMatchKeyword,
          status: baseStatusActive,
          isDefaultOrigin: true,
        },
      },
    );
  typia.assert<IPageIShoppingMallSellerWarehouse.ISummary>(thirdSearch);

  TestValidator.equals(
    "no-match search returns empty data array",
    thirdSearch.data.length,
    0,
  );

  TestValidator.equals(
    "no-match search has zero records in pagination",
    thirdSearch.pagination.records,
    0,
  );
}
