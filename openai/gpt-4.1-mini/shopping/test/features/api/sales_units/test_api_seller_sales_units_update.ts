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

export async function test_api_seller_sales_units_update(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Update Sale Unit Successfully
  // Scenario 2: Fail Update Due to Duplicate SKU Code
  // Scenario 3: Fail Update Due to Unauthorized Seller
  // Prepare a seller connection and authorize seller join
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {},
  });
  sellerConnection.headers = { Authorization: sellerAuthorized.token.access };
  // Create a sale for the seller
  const sale = await generate_random_shopping_mall_seller_sales_create(
    sellerConnection,
    { body: {} },
  );
  typia.assert(sale);
  // Create the first sale unit
  const firstSaleUnit =
    await generate_random_shopping_mall_seller_sales_units_create_unit(
      sellerConnection,
      {
        params: { saleId: sale.id },
        body: {},
      },
    );
  typia.assert(firstSaleUnit);
  // Scenario 1: Update Sale Unit Successfully
  // Prepare update data with new SKU code, options, and optional price override
  const updatedSkuCode = firstSaleUnit.skuCode + "-updated";
  const updatedOptionValues = JSON.stringify({ color: "blue", size: "M" });
  const updatedPriceOverride =
    (firstSaleUnit.priceOverride ?? sale.basePrice) + 100;
  const updatedUnit =
    await api.functional.shoppingMall.seller.sales.units.update(
      sellerConnection,
      {
        saleId: sale.id,
        unitId: firstSaleUnit.id,
        body: {
          skuCode: updatedSkuCode,
          optionValues: updatedOptionValues,
          priceOverride: updatedPriceOverride,
        } satisfies IShoppingMallSaleUnit.IUpdate,
      },
    );
  typia.assert(updatedUnit);
  TestValidator.equals(
    "Updated unit skuCode",
    updatedUnit.skuCode,
    updatedSkuCode,
  );
  TestValidator.equals(
    "Updated unit optionValues",
    updatedUnit.optionValues,
    updatedOptionValues,
  );
  TestValidator.equals(
    "Updated unit priceOverride",
    updatedUnit.priceOverride ?? null,
    updatedPriceOverride,
  );
  TestValidator.equals(
    "Updated unit shoppingMallSaleId",
    updatedUnit.shoppingMallSaleId,
    sale.id,
  );
  TestValidator.predicate(
    "Updated unit updatedAt is recent",
    new Date(updatedUnit.updatedAt).getTime() >
      new Date(firstSaleUnit.updatedAt).getTime(),
  );
  // Scenario 2: Fail Update Due to Duplicate SKU Code
  // Create second sale unit
  const secondSaleUnit =
    await generate_random_shopping_mall_seller_sales_units_create_unit(
      sellerConnection,
      {
        params: { saleId: sale.id },
        body: {},
      },
    );
  typia.assert(secondSaleUnit);
  await TestValidator.error("Duplicate SKU update error", async () => {
    try {
      await api.functional.shoppingMall.seller.sales.units.update(
        sellerConnection,
        {
          saleId: sale.id,
          unitId: secondSaleUnit.id,
          body: {
            skuCode: updatedSkuCode, // duplicate sku code from first unit
          } satisfies IShoppingMallSaleUnit.IUpdate,
        },
      );
    } catch (e) {
      if (e instanceof Error && !/unique|duplicate/i.test(e.message)) throw e;
      throw e; // Rethrow to be caught by TestValidator.error
    }
  });
  // Scenario 3: Fail Update Due to Unauthorized Seller
  // Prepare unauthorized connection without auth headers
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "Unauthorized update should fail",
    403,
    async () => {
      await api.functional.shoppingMall.seller.sales.units.update(
        unauthorizedConnection,
        {
          saleId: sale.id,
          unitId: firstSaleUnit.id,
          body: {
            skuCode: "unauthorized-try",
          } satisfies IShoppingMallSaleUnit.IUpdate,
        },
      );
    },
  );
  // Prepare another seller with a different account
  const anotherSellerConnection: api.IConnection = { host: connection.host };
  const anotherSellerAuthorized = await authorize_seller_join(
    anotherSellerConnection,
    { body: {} },
  );
  anotherSellerConnection.headers = {
    Authorization: anotherSellerAuthorized.token.access,
  };
  await TestValidator.httpError(
    "Update with different seller should fail",
    403,
    async () => {
      await api.functional.shoppingMall.seller.sales.units.update(
        anotherSellerConnection,
        {
          saleId: sale.id,
          unitId: firstSaleUnit.id,
          body: {
            skuCode: "unauthorized-different-seller",
          } satisfies IShoppingMallSaleUnit.IUpdate,
        },
      );
    },
  );
}
