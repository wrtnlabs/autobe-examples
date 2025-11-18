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

export async function test_api_seller_warehouse_search_multi_seller_isolation(
  connection: api.IConnection,
) {
  // 1. Register Seller A (authorization handled by SDK via join)
  const sellerAJoinRequest = {
    email: `${RandomGenerator.alphabets(8)}@seller-a.example.com`,
    password: RandomGenerator.alphabets(12),
    href: "https://seller-a.example.com/join",
    referrer: "https://seller-a.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerA: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerAJoinRequest,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerA);

  // 2. Under Seller A, create several warehouses with codes prefixed by "A-"
  const sellerAWarehouseCount = 3;

  for (let i = 0; i < sellerAWarehouseCount; i++) {
    const warehouseBody = {
      code: `A-${RandomGenerator.alphaNumeric(8)}`,
      name: `Seller A Warehouse ${i + 1}`,
      description: RandomGenerator.paragraph({ sentences: 3 }),
      is_default_origin: i === 0,
      status: "active",
    } satisfies IShoppingMallSellerWarehouse.ICreate;

    const created =
      await api.functional.shoppingMall.seller.sellerWarehouses.create(
        connection,
        { body: warehouseBody },
      );
    typia.assert<IShoppingMallSellerWarehouse>(created);
  }

  // Helper: list warehouses for the currently authenticated seller
  const listWarehousesForCurrentSeller = async () => {
    const requestBody = {
      page: 1,
      limit: 50,
      sortBy: "created_at",
      sortDirection: "asc",
    } satisfies IShoppingMallSellerWarehouse.IRequest;

    const pageResult =
      await api.functional.shoppingMall.seller.sellerWarehouses.index(
        connection,
        { body: requestBody },
      );
    typia.assert<IPageIShoppingMallSellerWarehouse.ISummary>(pageResult);
    return pageResult;
  };

  // 3. List as Seller A and verify isolation (no B-prefixed codes, all seller ids match)
  const pageForSellerA = await listWarehousesForCurrentSeller();

  for (const summary of pageForSellerA.data) {
    TestValidator.equals(
      "all listed warehouses for Seller A belong to Seller A",
      summary.seller.id,
      sellerA.id,
    );

    TestValidator.predicate(
      "Seller A listing must not contain B-prefixed warehouse codes",
      !summary.code.startsWith("B-"),
    );
  }

  TestValidator.predicate(
    "Seller A pagination.records is at least the number of created A warehouses",
    pageForSellerA.pagination.records >= sellerAWarehouseCount,
  );

  // 4. Register Seller B (switches Authorization to Seller B)
  const sellerBJoinRequest = {
    email: `${RandomGenerator.alphabets(8)}@seller-b.example.com`,
    password: RandomGenerator.alphabets(12),
    href: "https://seller-b.example.com/join",
    referrer: "https://seller-b.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerB: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerBJoinRequest,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerB);

  // 5. Under Seller B, create several warehouses with codes prefixed by "B-"
  const sellerBWarehouseCount = 3;

  for (let i = 0; i < sellerBWarehouseCount; i++) {
    const warehouseBody = {
      code: `B-${RandomGenerator.alphaNumeric(8)}`,
      name: `Seller B Warehouse ${i + 1}`,
      description: RandomGenerator.paragraph({ sentences: 3 }),
      is_default_origin: i === 0,
      status: "active",
    } satisfies IShoppingMallSellerWarehouse.ICreate;

    const created =
      await api.functional.shoppingMall.seller.sellerWarehouses.create(
        connection,
        { body: warehouseBody },
      );
    typia.assert<IShoppingMallSellerWarehouse>(created);
  }

  // 6. List as Seller B and verify isolation (no A-prefixed codes, all seller ids match)
  const pageForSellerB = await listWarehousesForCurrentSeller();

  for (const summary of pageForSellerB.data) {
    TestValidator.equals(
      "all listed warehouses for Seller B belong to Seller B",
      summary.seller.id,
      sellerB.id,
    );

    TestValidator.predicate(
      "Seller B listing must not contain A-prefixed warehouse codes",
      !summary.code.startsWith("A-"),
    );
  }

  TestValidator.predicate(
    "Seller B pagination.records is at least the number of created B warehouses",
    pageForSellerB.pagination.records >= sellerBWarehouseCount,
  );
}
