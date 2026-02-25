import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSaleUnit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleUnit";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleUnit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleUnit";
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
import { prepare_random_shopping_mall_sale } from "../../../prepare/prepare_random_shopping_mall_sale";

export async function test_api_seller_sale_units_listing_empty_result(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Test retrieving sale units for a sale where no units exist
  // 1. Seller joins the platform and gets authorized
  // 2. Seller creates a sale listing
  // 3. Query sale units list for the created sale - expect empty data list and proper pagination
  // 4. Query sale units list with filters (priceOverride and skuCode) that yield no matches
  // 5. Verify unauthorized access to the endpoint is denied
  // 1. Seller join
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password1234",
      shopName: "Test Shop",
      shopDescription: null,
      logoUri: null,
    },
  });
  typia.assert(sellerAuthorized);
  // Create new connection with authorization token
  const sellerConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${sellerAuthorized.token.access}` },
  };
  // 2. Create sale
  const newSale = await generate_random_shopping_mall_seller_sales_create(
    sellerConnection,
    { body: {} },
  );
  typia.assert(newSale);
  // 3. List sale units without units created - expect empty data array
  const emptyList = await api.functional.shoppingMall.seller.sales.units.index(
    sellerConnection,
    {
      saleId: newSale.id,
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallSaleUnit.IRequest,
    },
  );
  typia.assert(emptyList);
  // Validate empty data
  TestValidator.equals("empty list data length", emptyList.data.length, 0);
  TestValidator.equals(
    "pagination current page",
    emptyList.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", emptyList.pagination.limit, 10);
  TestValidator.equals("pagination records", emptyList.pagination.records, 0);
  TestValidator.equals("pagination pages", emptyList.pagination.pages, 0);
  // 4. Query with filters that yield no matches: priceOverride and skuCode
  const filteredListPrice =
    await api.functional.shoppingMall.seller.sales.units.index(
      sellerConnection,
      {
        saleId: newSale.id,
        body: {
          priceOverride: 9999999,
          page: 1,
          limit: 10,
        } satisfies IShoppingMallSaleUnit.IRequest,
      },
    );
  typia.assert(filteredListPrice);
  TestValidator.equals(
    "filtered list by high priceOverride length",
    filteredListPrice.data.length,
    0,
  );
  const filteredListSku =
    await api.functional.shoppingMall.seller.sales.units.index(
      sellerConnection,
      {
        saleId: newSale.id,
        body: {
          skuCode: "no_such_sku_code_123456",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallSaleUnit.IRequest,
      },
    );
  typia.assert(filteredListSku);
  TestValidator.equals(
    "filtered list by invalid skuCode length",
    filteredListSku.data.length,
    0,
  );
  // 5. Verify unauthorized access is denied
  await TestValidator.httpError(
    "unauthorized access rejected",
    401,
    async () =>
      await api.functional.shoppingMall.seller.sales.units.index(
        { host: connection.host },
        {
          saleId: newSale.id,
          body: {
            page: 1,
            limit: 10,
          } satisfies IShoppingMallSaleUnit.IRequest,
        },
      ),
  );
}
