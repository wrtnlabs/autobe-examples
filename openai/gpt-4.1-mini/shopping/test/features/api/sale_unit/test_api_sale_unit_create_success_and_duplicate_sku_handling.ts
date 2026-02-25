import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_shopping_mall_seller_sales_units_create_unit } from "../../../generate/generate_random_shopping_mall_seller_sales_units_create_unit";
import { prepare_random_shopping_mall_sale } from "../../../prepare/prepare_random_shopping_mall_sale";
import { prepare_random_shopping_mall_sale_unit } from "../../../prepare/prepare_random_shopping_mall_sale_unit";

/**
 * Test the creation of a new sale unit (product variant) and handling of duplicate SKU code within the same sale listing.
 */
export async function test_api_sale_unit_create_success_and_duplicate_sku_handling(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authentication
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shopName: RandomGenerator.name(1),
      shopDescription: null,
      logoUri: null,
    },
  });
  // Use sellerAuthorized token in a new connection
  const sellerConnection: api.IConnection = { host: connection.host };
  sellerConnection.headers = {
    Authorization: `Bearer ${sellerAuthorized.token.access}`,
  };
  // 2. Create a sale listing for the seller
  const sale = await generate_random_shopping_mall_seller_sales_create(
    sellerConnection,
    {
      body: {}, // random valid sale create
    },
  );
  typia.assert(sale);
  // 3. Create a sale unit with unique SKU
  const skuCode = RandomGenerator.alphaNumeric(10);
  const optionValuesObj = { color: "red", size: "M" };
  const optionValuesJson = JSON.stringify(optionValuesObj);
  const priceOverride = sale.basePrice + 100.5;
  const saleUnit =
    await generate_random_shopping_mall_seller_sales_units_create_unit(
      sellerConnection,
      {
        params: { saleId: sale.id },
        body: {
          sku_code: skuCode,
          option_values: optionValuesJson,
          price_override: priceOverride,
        },
      },
    );
  typia.assert(saleUnit);
  // Validate returned sale unit properties
  TestValidator.equals("saleId matches", saleUnit.shoppingMallSaleId, sale.id);
  TestValidator.equals("skuCode matches", saleUnit.skuCode, skuCode);
  TestValidator.equals(
    "optionValues matches",
    saleUnit.optionValues,
    optionValuesJson,
  );
  if (saleUnit.priceOverride !== null && saleUnit.priceOverride !== undefined) {
    TestValidator.equals(
      "priceOverride matches",
      saleUnit.priceOverride,
      priceOverride,
    );
  }
  // Validate timestamps
  TestValidator.predicate(
    "createdAt is ISO string",
    typeof saleUnit.createdAt === "string" && saleUnit.createdAt.length > 0,
  );
  TestValidator.predicate(
    "updatedAt is ISO string",
    typeof saleUnit.updatedAt === "string" && saleUnit.updatedAt.length > 0,
  );
  // deletedAt should be null or undefined
  TestValidator.predicate(
    "deletedAt is null or undefined",
    saleUnit.deletedAt === null || saleUnit.deletedAt === undefined,
  );
  // 4. Attempt to create duplicate SKU under the same sale (should fail)
  await TestValidator.error(
    "create duplicate SKU should throw error",
    async () => {
      await generate_random_shopping_mall_seller_sales_units_create_unit(
        sellerConnection,
        {
          params: { saleId: sale.id },
          body: {
            sku_code: skuCode, // duplicate SKU
            option_values: optionValuesJson,
            price_override: priceOverride,
          },
        },
      );
    },
  );
}
