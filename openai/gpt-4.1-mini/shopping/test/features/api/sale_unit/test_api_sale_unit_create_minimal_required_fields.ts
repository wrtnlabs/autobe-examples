import api from "@ORGANIZATION/PROJECT-api";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { generate_random_shopping_mall_seller_sales_create } from "../../../generate/generate_random_shopping_mall_seller_sales_create";
import { generate_random_shopping_mall_seller_sales_units_create_unit } from "../../../generate/generate_random_shopping_mall_seller_sales_units_create_unit";
import { RandomGenerator, TestValidator } from "@nestia/e2e";
import typia from "typia";
import type { IShoppingMallSaleUnit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleUnit";

export async function test_api_sale_unit_create_minimal_required_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authorization
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, { body: {} });
  sellerConnection.headers = {
    ...(sellerConnection.headers ?? {}),
    Authorization: seller.token.access,
  };
  // 2. Create a sale as prerequisite for sale unit
  const sale = await generate_random_shopping_mall_seller_sales_create(
    sellerConnection,
    {},
  );
  typia.assert(sale);
  // 3. Create sale unit with minimal required fields (sku_code and option_values)
  const skuCode = "sku_" + RandomGenerator.alphaNumeric(10);
  const optionValuesObj = { color: "red", size: "M" };
  const optionValuesStr = JSON.stringify(optionValuesObj);
  const saleUnitBody: IShoppingMallSaleUnit.ICreate = {
    sku_code: skuCode,
    option_values: optionValuesStr,
    // price_override omitted intentionally to test basePrice inheritance
  };
  const saleUnit =
    await generate_random_shopping_mall_seller_sales_units_create_unit(
      sellerConnection,
      {
        params: { saleId: sale.id },
        body: saleUnitBody,
      },
    );
  typia.assert(saleUnit);
  // 4. Validate returned entity fields
  TestValidator.equals("saleId matches", saleUnit.shoppingMallSaleId, sale.id);
  TestValidator.equals("skuCode matches", saleUnit.skuCode, skuCode);
  TestValidator.equals(
    "optionValues matches",
    saleUnit.optionValues,
    optionValuesStr,
  );
  TestValidator.equals(
    "priceOverride is undefined or null",
    saleUnit.priceOverride ?? null,
    null,
  );
  TestValidator.equals(
    "sale id matches via sale summary",
    saleUnit.sale.id,
    sale.id,
  );
  TestValidator.equals("sale name matches", saleUnit.sale.name, sale.name);
  TestValidator.equals(
    "sale basePrice matches",
    saleUnit.sale.basePrice,
    sale.basePrice,
  );
  TestValidator.equals(
    "sale status matches",
    saleUnit.sale.status,
    sale.status,
  );
  // Timestamp checks
  TestValidator.predicate(
    "createdAt is ISO8601",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.*Z$/.test(
      saleUnit.createdAt,
    ),
  );
  TestValidator.predicate(
    "updatedAt is ISO8601",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.*Z$/.test(
      saleUnit.updatedAt,
    ),
  );
  TestValidator.predicate(
    "deletedAt is null or ISO8601",
    saleUnit.deletedAt === null ||
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.*Z$/.test(
        saleUnit.deletedAt ?? "",
      ),
  );
}
