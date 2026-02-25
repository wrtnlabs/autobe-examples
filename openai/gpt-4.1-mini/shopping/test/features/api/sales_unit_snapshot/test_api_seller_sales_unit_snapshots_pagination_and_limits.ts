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

export async function test_api_seller_sales_unit_snapshots_pagination_and_limits(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authorize seller (join) and create seller-specific connection
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {},
  });
  sellerConnection.headers = { Authorization: sellerAuth.token.access };
  // 2. Create a sale for the seller
  const sale = await generate_random_shopping_mall_seller_sales_create(
    sellerConnection,
    {
      body: {
        name: `Test Sale ${RandomGenerator.alphaNumeric(8)}`,
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<
          number & tags.Type<"double"> & tags.Minimum<1>
        >(),
      },
    },
  );
  typia.assert(sale);
  // 3. Create a sale unit under the sale
  const saleUnit =
    await generate_random_shopping_mall_seller_sales_units_create_unit(
      sellerConnection,
      {
        params: { saleId: sale.id },
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          option_values: JSON.stringify({ color: "red", size: "M" }),
          price_override: null,
        },
      },
    );
  typia.assert(saleUnit);
  // 4. Generate many snapshots by simulating multiple patch calls
  // NOTE: The API for creating snapshots directly is not given.
  // According to requirements, snapshots capture immutable states of sale units,
  // so we'll simulate with the assumption snapshots exist or are automatically created.
  // For the purpose of this test, we assume the seller's sale unit already has many snapshots.
  // 5. We will call the snapshots index API multiple times with pagination
  const maxLimit = 50; // Reasonable maximum pagination limit assumed
  const pagesToTest = 3; // Test first three pages
  // Request page=1, limit=maxLimit
  let response =
    await api.functional.shoppingMall.seller.sales.units.snapshots.indexSnapshots(
      sellerConnection,
      {
        saleId: sale.id,
        unitId: saleUnit.id,
        body: {
          page: 1,
          limit: maxLimit,
        },
      },
    );
  typia.assert(response);
  // Validate pagination info
  TestValidator.predicate(
    "page 1 data count within limit",
    response.data.length <= maxLimit,
  );
  TestValidator.equals("page 1 current page", response.pagination.current, 1);
  TestValidator.equals("page 1 limit", response.pagination.limit, maxLimit);
  // Store first page snapshot IDs
  const firstPageIds = response.data.map((e) => e.id);
  // Request page=2, limit=maxLimit
  const responsePage2 =
    await api.functional.shoppingMall.seller.sales.units.snapshots.indexSnapshots(
      sellerConnection,
      {
        saleId: sale.id,
        unitId: saleUnit.id,
        body: {
          page: 2,
          limit: maxLimit,
        },
      },
    );
  typia.assert(responsePage2);
  TestValidator.predicate(
    "page 2 data count within limit",
    responsePage2.data.length <= maxLimit,
  );
  TestValidator.equals(
    "page 2 current page",
    responsePage2.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2 limit",
    responsePage2.pagination.limit,
    maxLimit,
  );
  // Ensure no snapshot ID overlap between page 1 and page 2
  const page2Ids = responsePage2.data.map((e) => e.id);
  const intersection = firstPageIds.filter((id) => page2Ids.includes(id));
  TestValidator.equals(
    "no duplicated snapshot IDs across pages",
    intersection.length,
    0,
  );
  // Test maximum page and limit values within allowed range
  // For this test, request page=last page, limit=maxLimit or a large number
  const lastPage =
    response.pagination.pages > 0 ? response.pagination.pages : 1;
  const responseLastPage =
    await api.functional.shoppingMall.seller.sales.units.snapshots.indexSnapshots(
      sellerConnection,
      {
        saleId: sale.id,
        unitId: saleUnit.id,
        body: {
          page: lastPage,
          limit: maxLimit,
        },
      },
    );
  typia.assert(responseLastPage);
  TestValidator.predicate(
    "last page data count within limit",
    responseLastPage.data.length <= maxLimit,
  );
  TestValidator.equals(
    "last page current page",
    responseLastPage.pagination.current,
    lastPage,
  );
  // Request a page beyond the last page, expect empty data
  const responseBeyondLast =
    await api.functional.shoppingMall.seller.sales.units.snapshots.indexSnapshots(
      sellerConnection,
      {
        saleId: sale.id,
        unitId: saleUnit.id,
        body: {
          page: lastPage + 1,
          limit: maxLimit,
        },
      },
    );
  typia.assert(responseBeyondLast);
  TestValidator.equals(
    "beyond last page current page",
    responseBeyondLast.pagination.current,
    lastPage + 1,
  );
  TestValidator.equals(
    "beyond last page data length",
    responseBeyondLast.data.length,
    0,
  );
  // Test unauthorized access: create another seller and try to access snapshots
  const otherSellerConnection: api.IConnection = { host: connection.host };
  const otherSellerAuth = await authorize_seller_join(otherSellerConnection, {
    body: {},
  });
  otherSellerConnection.headers = {
    Authorization: otherSellerAuth.token.access,
  };
  // Expect error on access by other seller
  await TestValidator.error("unauthorized access to snapshots", async () => {
    await api.functional.shoppingMall.seller.sales.units.snapshots.indexSnapshots(
      otherSellerConnection,
      {
        saleId: sale.id,
        unitId: saleUnit.id,
        body: {
          page: 1,
          limit: 10,
        },
      },
    );
  });
}
