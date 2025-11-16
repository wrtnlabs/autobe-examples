import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallSkuOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuOption";

export async function test_api_shopping_mall_sku_option_public_retrieve(
  connection: api.IConnection,
) {
  // Generate a random SKU option to use the code for retrieval
  const skuOption: IShoppingMallSkuOption =
    typia.random<IShoppingMallSkuOption>();

  // Retrieve the SKU option by its unique code
  const output: IShoppingMallSkuOption =
    await api.functional.shoppingMall.shoppingMallSkuOptions.at(connection, {
      code: skuOption.code,
    });
  typia.assert(output);

  // Validate the returned SKU option properties
  TestValidator.equals(
    "SKU option code matches request",
    output.code,
    skuOption.code,
  );
  TestValidator.predicate(
    "SKU option name is non-empty string",
    typeof output.name === "string" && output.name.length > 0,
  );
  TestValidator.predicate(
    "SKU option priceAdjustment is a number",
    typeof output.priceAdjustment === "number",
  );
  TestValidator.equals(
    "SKU option groupCode matches expected",
    output.groupCode,
    skuOption.groupCode,
  );

  // ISO 8601 date-time pattern that accepts optional fractional seconds
  const iso8601DateTimePattern =
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;

  TestValidator.predicate(
    "createdAt is ISO 8601 date-time string",
    typeof output.createdAt === "string" &&
      iso8601DateTimePattern.test(output.createdAt),
  );
  TestValidator.predicate(
    "updatedAt is ISO 8601 date-time string",
    typeof output.updatedAt === "string" &&
      iso8601DateTimePattern.test(output.updatedAt),
  );
  TestValidator.predicate(
    "deletedAt is null, undefined, or ISO 8601 date-time string",
    output.deletedAt === null ||
      output.deletedAt === undefined ||
      (typeof output.deletedAt === "string" &&
        iso8601DateTimePattern.test(output.deletedAt)),
  );
}
