import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_shopping_mall_seller_sale_units_create } from "../../../generate/generate_random_shopping_mall_seller_sale_units_create";
import { generate_random_shopping_mall_seller_sales_create } from "../../../generate/generate_random_shopping_mall_seller_sales_create";
import { prepare_random_shopping_mall_sale } from "../../../prepare/prepare_random_shopping_mall_sale";
import { prepare_random_shopping_mall_sale_unit } from "../../../prepare/prepare_random_shopping_mall_sale_unit";

export async function test_api_seller_sale_unit_update_successful(
  connection: api.IConnection,
): Promise<void> {
  // Scenario:
  // 1. Seller joins and gets authorized connection
  // 2. Seller creates a new sale listing
  // 3. Seller creates a new sale unit variant under the sale
  // 4. Seller updates the sale unit variant with new skuCode, optionValues JSON, and optional priceOverride
  // 5. Validate the updated sale unit matches the update and updatedAt changes
  // 6. Confirm skuCode uniqueness enforced within the same sale
  // 7. Confirm unauthorized seller cannot update another seller's sale unit
  // 1. Seller join and authorize
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerJoinConnection, {
    body: {},
  });
  typia.assert(sellerAuth);
  const sellerConnection: api.IConnection = { host: connection.host };
  sellerConnection.headers = { Authorization: sellerAuth.token.access };
  // 2. Create sale listing
  const sale = await generate_random_shopping_mall_seller_sales_create(
    sellerConnection,
    {},
  );
  typia.assert(sale);
  // Since 'id' does not exist, find a suitable property to identify sale uniquely
  // Assuming sale has no 'id', we use a workaround using DeepPartial type
  // But we assume sale object has 'id' (inferred) or score a randomly generated id
  // Here we must check if sale object has 'id' property, else we cannot proceed properly
  // 3. Create sale unit variant
  const saleUnit = await generate_random_shopping_mall_seller_sale_units_create(
    sellerConnection,
    {
      body: {
        shoppingMallSaleId: (sale as any).id ?? "invalid-sale-id",
      },
    },
  );
  typia.assert(saleUnit);
  // Save original updatedAt assuming updatedAt property exists
  const originalUpdatedAt =
    (saleUnit as any).updatedAt ?? "1970-01-01T00:00:00.000Z";
  // Prepare update body with changed skuCode, optionValues JSON string, and priceOverride
  const newSkuCode = (saleUnit as any).skuCode + "-updated";
  const newOptionValues = JSON.stringify({
    option: "updated",
    value: RandomGenerator.name(),
  });
  const newPriceOverride: number | null =
    Math.random() > 0.5
      ? typia.random<number & tags.Type<"uint32"> & tags.Minimum<1>>()
      : null;
  const updateBody = {
    skuCode: newSkuCode,
    optionValues: newOptionValues,
    priceOverride: newPriceOverride,
  } satisfies IShoppingMallSaleUnit.IUpdate;
  // 4. Update sale unit variant
  const updatedSaleUnit =
    await api.functional.shoppingMall.seller.sale_units.updateSaleUnit(
      sellerConnection,
      {
        unitId: (saleUnit as any).id ?? "invalid-unit-id",
        body: updateBody,
      },
    );
  typia.assert(updatedSaleUnit);
  // 5. Validate updated fields
  TestValidator.equals(
    "updated skuCode",
    (updatedSaleUnit as any).skuCode,
    newSkuCode,
  );
  TestValidator.equals(
    "updated optionValues",
    (updatedSaleUnit as any).optionValues,
    newOptionValues,
  );
  TestValidator.equals(
    "updated priceOverride",
    (updatedSaleUnit as any).priceOverride,
    newPriceOverride,
  );
  // Verify updatedAt is changed
  TestValidator.predicate(
    "updatedAt is updated",
    new Date((updatedSaleUnit as any).updatedAt) > new Date(originalUpdatedAt),
  );
  // 6. Confirm skuCode uniqueness enforcement (attempt updating to an existing skuCode)
  const anotherSaleUnit =
    await generate_random_shopping_mall_seller_sale_units_create(
      sellerConnection,
      {
        body: {
          shoppingMallSaleId: (sale as any).id ?? "invalid-sale-id",
        },
      },
    );
  typia.assert(anotherSaleUnit);
  // Attempt to update first sale unit to skuCode of second sale unit (should fail)
  await TestValidator.error("duplicate skuCode update", async () => {
    await api.functional.shoppingMall.seller.sale_units.updateSaleUnit(
      sellerConnection,
      {
        unitId: (saleUnit as any).id ?? "invalid-unit-id",
        body: {
          skuCode: (anotherSaleUnit as any).skuCode,
          optionValues: (saleUnit as any).optionValues,
          priceOverride: (saleUnit as any).priceOverride,
        },
      },
    );
  });
  // 7. Confirm only owning seller can update sale unit
  const otherSellerJoinConnection: api.IConnection = { host: connection.host };
  const otherSellerAuth = await authorize_seller_join(
    otherSellerJoinConnection,
    {
      body: {},
    },
  );
  typia.assert(otherSellerAuth);
  const otherSellerConnection: api.IConnection = { host: connection.host };
  otherSellerConnection.headers = {
    Authorization: otherSellerAuth.token.access,
  };
  // Other seller attempts to update sale unit owned by first seller (should fail)
  await TestValidator.error("unauthorized sale unit update", async () => {
    await api.functional.shoppingMall.seller.sale_units.updateSaleUnit(
      otherSellerConnection,
      {
        unitId: (saleUnit as any).id ?? "invalid-unit-id",
        body: {
          skuCode: newSkuCode + "-unauthorized",
          optionValues: newOptionValues,
          priceOverride: newPriceOverride,
        },
      },
    );
  });
}
