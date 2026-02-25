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

export async function test_api_seller_sale_units_listing_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller joins and gets authorized
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "sellerpass",
      shopName: RandomGenerator.name(2),
      shopDescription: "Seller shop description",
      logoUri: null,
    },
  });
  sellerConnection.headers = { Authorization: seller.token.access };
  typia.assert(seller);
  // 2. Seller creates a sale
  const sale = await generate_random_shopping_mall_seller_sales_create(
    sellerConnection,
    {
      body: {
        category_id: typia.random<string & tags.Format<"uuid">>(),
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        base_price: typia.random<
          number & tags.Type<"double"> & tags.Minimum<1>
        >(),
      },
    },
  );
  typia.assert(sale);
  // 3. Retrieve sale units list with pagination parameters
  const requestBody: IShoppingMallSaleUnit.IRequest = {
    page: 1,
    limit: 10,
    skuCode: undefined,
    optionValues: undefined,
    priceOverride: undefined,
  };
  const unitsList = await api.functional.shoppingMall.seller.sales.units.index(
    sellerConnection,
    {
      saleId: sale.id,
      body: requestBody,
    },
  );
  typia.assert(unitsList);
  // 4. Validate pagination info
  TestValidator.predicate(
    "pagination current page",
    unitsList.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit",
    unitsList.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination pages greater or equal zero",
    unitsList.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records count non-negative",
    unitsList.pagination.records >= 0,
  );
  // 5. Validate each sale unit belongs to the sale
  for (const unit of unitsList.data) {
    typia.assert(unit);
    TestValidator.equals("sale unit sale id matches", unit.sale.id, sale.id);
    TestValidator.predicate(
      "skuCode non empty",
      typeof unit.skuCode === "string" && unit.skuCode.length > 0,
    );
    TestValidator.predicate(
      "optionValues is string",
      typeof unit.optionValues === "string",
    );
    TestValidator.predicate(
      "createdAt is date-time",
      !!Date.parse(unit.createdAt),
    );
    TestValidator.predicate(
      "updatedAt is date-time",
      !!Date.parse(unit.updatedAt),
    );
    TestValidator.predicate(
      "deletedAt is date-time or null",
      unit.deletedAt === null || !!Date.parse(unit.deletedAt),
    );
  }
  // 6. Test with filters: skuCode
  if (unitsList.data.length > 0) {
    // Pick a random skuCode from the list
    const skuCodeSample = unitsList.data[0].skuCode;
    const filteredBySkuCode =
      await api.functional.shoppingMall.seller.sales.units.index(
        sellerConnection,
        {
          saleId: sale.id,
          body: { ...requestBody, skuCode: skuCodeSample, page: 1, limit: 5 },
        },
      );
    typia.assert(filteredBySkuCode);
    for (const unit of filteredBySkuCode.data) {
      TestValidator.equals("filter skuCode", unit.skuCode, skuCodeSample);
    }
  }
  // 7. Test with filters: optionValues
  if (unitsList.data.length > 0) {
    const optionValuesSample = unitsList.data[0].optionValues;
    const filteredByOptionValues =
      await api.functional.shoppingMall.seller.sales.units.index(
        sellerConnection,
        {
          saleId: sale.id,
          body: {
            ...requestBody,
            optionValues: optionValuesSample,
            page: 1,
            limit: 5,
          },
        },
      );
    typia.assert(filteredByOptionValues);
    for (const unit of filteredByOptionValues.data) {
      TestValidator.equals(
        "filter optionValues",
        unit.optionValues,
        optionValuesSample,
      );
    }
  }
  // 8. Test empty results for non-existing filters
  const randomSkuCode = RandomGenerator.alphaNumeric(10);
  const filteredEmpty =
    await api.functional.shoppingMall.seller.sales.units.index(
      sellerConnection,
      {
        saleId: sale.id,
        body: { ...requestBody, skuCode: randomSkuCode, page: 1, limit: 5 },
      },
    );
  typia.assert(filteredEmpty);
  TestValidator.equals("empty result count", filteredEmpty.data.length, 0);
}
