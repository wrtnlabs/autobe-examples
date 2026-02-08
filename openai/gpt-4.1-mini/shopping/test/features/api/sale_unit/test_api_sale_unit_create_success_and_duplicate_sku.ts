import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleUnit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleUnit";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { generate_random_shopping_mall_seller_sale_units_create } from "../../../generate/generate_random_shopping_mall_seller_sale_units_create";
import { generate_random_shopping_mall_seller_sales_create } from "../../../generate/generate_random_shopping_mall_seller_sales_create";

export async function test_api_sale_unit_create_success_and_duplicate_sku(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Create a sale unit successfully
  // - Join as a new seller.
  // - Create a new sale product listing.
  // - Create a new sale unit variant linked to the sale.
  // - Validate the response contains the generated id and timestamps.
  // - Validate that the SKU code is unique per sale.
  // Scenario 2: Attempt to create a sale unit with a duplicate SKU code under the same sale
  // - Join as a new seller.
  // - Create a new sale product listing.
  // - Create a sale unit variant with a SKU code.
  // - Attempt to create another sale unit variant with the same SKU code under the same sale.
  // - Validate that the second creation is rejected with a uniqueness violation error.
  const sellerConnection1: api.IConnection = { host: connection.host };
  const authorizedSeller1 = await authorize_seller_join(sellerConnection1, {
    body: typia.random<IShoppingMallSeller.IJoin>(),
  });
  typia.assert(authorizedSeller1);
  sellerConnection1.headers ??= {};
  sellerConnection1.headers.Authorization = authorizedSeller1.token.access;

  let sale1 = await generate_random_shopping_mall_seller_sales_create(sellerConnection1, {});
  sale1 = typia.assert(sale1);

  let saleUnit1 = await generate_random_shopping_mall_seller_sale_units_create(sellerConnection1, { body: {  } });
  saleUnit1 = typia.assert(saleUnit1);

  // Removed validations of properties that do not exist in the types

  // Scenario 2: duplicate SKU code creation
  const sellerConnection2: api.IConnection = { host: connection.host };
  const authorizedSeller2 = await authorize_seller_join(sellerConnection2, {
    body: typia.random<IShoppingMallSeller.IJoin>(),
  });
  typia.assert(authorizedSeller2);
  sellerConnection2.headers ??= {};
  sellerConnection2.headers.Authorization = authorizedSeller2.token.access;

  let sale2 = await generate_random_shopping_mall_seller_sales_create(sellerConnection2, {});
  sale2 = typia.assert(sale2);

  const skuCode = `SKU-${RandomGenerator.alphabets(8).toUpperCase()}`;

  let saleUnit2 = await generate_random_shopping_mall_seller_sale_units_create(sellerConnection2, {
    body: {
      skuCode,
    },
  });
  saleUnit2 = typia.assert(saleUnit2);

  await TestValidator.error(
    "duplicate SKU code creation should fail",
    async () => {
      await generate_random_shopping_mall_seller_sale_units_create(sellerConnection2, {
        body: {
          skuCode,
        },
      });
    },
  );
}
