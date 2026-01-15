import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallVariantSkus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallVariantSkus";
export async function test_api_product_variant_retrieval_out_of_stock(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random product variant with all required fields to match the schema
  const variant: IShoppingMallVariantSkus =
    typia.random<IShoppingMallVariantSkus>();
  // Override to create an out-of-stock variant: stock_quantity = 0 and availability_status = "out_of_stock"
  variant.stock_quantity = 0;
  variant.availability_status = "out_of_stock";
  // Verify that our test variant has the correct out-of-stock properties
  TestValidator.equals(
    "variant stock quantity should be 0",
    variant.stock_quantity,
    0,
  );
  TestValidator.equals(
    "variant availability status should be out_of_stock",
    variant.availability_status,
    "out_of_stock",
  );
  // Use the available GET endpoint to retrieve the variant by its SKU ID
  const retrievedVariant: IShoppingMallVariantSkus =
    await api.functional.shoppingMall.products.skus.at(connection, {
      skuId: variant.sku,
    });
  // Validate that the retrieved variant has the correct data
  typia.assert(retrievedVariant);
  TestValidator.equals(
    "retrieved SKU ID matches",
    retrievedVariant.sku,
    variant.sku,
  );
  TestValidator.equals(
    "retrieved stock quantity is 0",
    retrievedVariant.stock_quantity,
    0,
  );
  TestValidator.equals(
    "retrieved availability status is out_of_stock",
    retrievedVariant.availability_status,
    "out_of_stock",
  );
}
