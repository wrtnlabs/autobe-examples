import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSaleUnitSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleUnitSnapshot";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleUnit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleUnit";
import type { IShoppingMallSaleUnitSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleUnitSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_sales_create } from "../../../generate/generate_random_shopping_mall_seller_sales_create";
import { generate_random_shopping_mall_seller_sales_units_create_unit } from "../../../generate/generate_random_shopping_mall_seller_sales_units_create_unit";
import { prepare_random_shopping_mall_sale } from "../../../prepare/prepare_random_shopping_mall_sale";
import { prepare_random_shopping_mall_sale_unit } from "../../../prepare/prepare_random_shopping_mall_sale_unit";

export async function test_api_seller_sales_unit_snapshots_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Test retrieving paginated sale unit snapshots with filtering, pagination, and data validation as authorized seller
  // 1. Seller registration and login
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: `seller${RandomGenerator.alphaNumeric(8)}@test.com`,
      password: "StrongPass123!",
      shopName: `Shop_${RandomGenerator.alphabets(5)}`,
      shopDescription: "Test shop description",
      logoUri: null,
    },
  });
  const sellerConnection: api.IConnection = { host: connection.host };
  sellerConnection.headers = { Authorization: sellerAuth.token.access };
  // 2. Create a new sale listing for this seller
  const sale = await generate_random_shopping_mall_seller_sales_create(
    sellerConnection,
    {
      body: {
        name: `Product_${RandomGenerator.alphabets(6)}`,
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<number & tags.Type<"float">>(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
      },
    },
  );
  typia.assert(sale);
  // 3. Create a new sale unit for the sale
  const saleUnit =
    await generate_random_shopping_mall_seller_sales_units_create_unit(
      sellerConnection,
      {
        params: { saleId: sale.id },
        body: {
          sku_code: `SKU_${RandomGenerator.alphabets(8)}`,
          option_values: JSON.stringify({ color: "red", size: "M" }),
          price_override: null,
        },
      },
    );
  typia.assert(saleUnit);
  // 4. Retrieve snapshots with no entries (edge case)
  let snapshotsPage =
    await api.functional.shoppingMall.seller.sales.units.snapshots.indexSnapshots(
      sellerConnection,
      {
        saleId: sale.id,
        unitId: saleUnit.id,
        body: {
          search: undefined,
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(snapshotsPage);
  TestValidator.equals("empty data list", snapshotsPage.data.length, 0);
  TestValidator.equals(
    "pagination current page",
    snapshotsPage.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", snapshotsPage.pagination.limit, 10);
  // Since no snapshots, records and pages should be 0
  TestValidator.equals(
    "pagination records",
    snapshotsPage.pagination.records,
    0,
  );
  TestValidator.equals("pagination pages", snapshotsPage.pagination.pages, 0);
  // 5. Simulate snapshots creation: We do not have API to create snapshots directly,
  // so we will assume snapshots exist or test only that retrieval works.
  // As per instructions, we rely on existing snapshots for testing retrieval.
  // We expect snapshots to be created by the system asynchronously or via other admin processes.
  // 6. Retrieve snapshots with search filter and pagination tests
  // For purpose of test, do a basic call with parameters and validate structure
  // Testing with some search term that should be allowed
  const searchTerm = "red";
  snapshotsPage =
    await api.functional.shoppingMall.seller.sales.units.snapshots.indexSnapshots(
      sellerConnection,
      {
        saleId: sale.id,
        unitId: saleUnit.id,
        body: {
          search: searchTerm,
          page: 1,
          limit: 5,
        },
      },
    );
  typia.assert(snapshotsPage);
  // Validate data consistency for each snapshot entry
  for (const snapshot of snapshotsPage.data) {
    typia.assert(snapshot);
    // Validate SKU code is string and non-empty
    TestValidator.predicate(
      `valid SKU code: ${snapshot.skuCode}`,
      typeof snapshot.skuCode === "string" && snapshot.skuCode.length > 0,
    );
    // Validate option values parse as JSON
    const optionValues = JSON.parse(snapshot.optionValues);
    TestValidator.predicate(
      `option values is object: ${snapshot.optionValues}`,
      optionValues !== null && typeof optionValues === "object",
    );
    // Validate stock quantity is non-negative integer
    TestValidator.predicate(
      `stock quantity non-negative: ${snapshot.stockQuantity}`,
      Number.isInteger(snapshot.stockQuantity) && snapshot.stockQuantity >= 0,
    );
    // Validate isActive is boolean
    TestValidator.predicate(
      `isActive boolean: ${snapshot.isActive}`,
      typeof snapshot.isActive === "boolean",
    );
  }
  // 7. Test pagination limit and page seq
  if (snapshotsPage.data.length > 0) {
    TestValidator.predicate(
      "data length less than or equal to limit",
      snapshotsPage.data.length <= 5,
    );
  }
  // 8. Access control test: Attempt accessing snapshots with unauthorized connection
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("unauthorized access triggers error", async () => {
    await api.functional.shoppingMall.seller.sales.units.snapshots.indexSnapshots(
      unauthorizedConnection,
      {
        saleId: sale.id,
        unitId: saleUnit.id,
        body: {
          search: undefined,
          page: 1,
          limit: 10,
        },
      },
    );
  });
}
