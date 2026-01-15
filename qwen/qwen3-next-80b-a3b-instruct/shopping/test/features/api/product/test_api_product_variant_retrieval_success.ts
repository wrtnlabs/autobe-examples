import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallVariantSkus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallVariantSkus";
export async function test_api_product_variant_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random product variant with proper formatting
  const variant: IShoppingMallVariantSkus =
    typia.random<IShoppingMallVariantSkus>();
  // Ensure is_active is true for successful retrieval
  variant.is_active = true;
  // Ensure stock_quantity is positive (required for availability)
  variant.stock_quantity = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >();
  // Ensure price is positive
  variant.price = typia.random<number & tags.Minimum<0>>();
  // Ensure availability_status is set to in_stock (when stock_quantity > 0)
  variant.availability_status = "in_stock";
  // Generate a proper SKU formatted as PRDSKU-XXXXXXXX
  const prefix = "PRDSKU-";
  const suffix = typia.random<string & tags.Pattern<"^[0-9A-Za-z]{8}$">>();
  const properSku = prefix + suffix;
  variant.sku = properSku;
  // Ensure all UUID fields are properly formatted
  variant.product_id = typia.random<string & tags.Format<"uuid">>();
  variant.variant_id = typia.random<string & tags.Format<"uuid">>();
  variant.category_id = typia.random<string & tags.Format<"uuid">>() ?? null;
  variant.brand_id = typia.random<string & tags.Format<"uuid">>() ?? null;
  variant.seller_id = typia.random<string & tags.Format<"uuid">>() ?? null;
  // Ensure created_at and updated_at are ISO format
  variant.created_at = new Date().toISOString();
  variant.updated_at = new Date().toISOString();
  // Since we have no variant creation endpoint, we'll retrieve the variant by its SKU
  // This assumes the system already has this variant (simulated by typia.random)
  const retrievedVariant: IShoppingMallVariantSkus =
    await api.functional.shoppingMall.products.skus.at(connection, {
      skuId: variant.sku,
    });
  // Validate the complete structure of the response
  typia.assert(retrievedVariant);
  // Perform business logic validation without type checking (since typia.assert() already validated types)
  TestValidator.equals("SKU matches", retrievedVariant.sku, variant.sku);
  TestValidator.equals(
    "is_active status is true",
    retrievedVariant.is_active,
    true,
  );
  TestValidator.predicate(
    "stock_quantity is positive",
    retrievedVariant.stock_quantity > 0,
  );
  TestValidator.equals(
    "availability_status is in_stock",
    retrievedVariant.availability_status,
    "in_stock",
  );
  TestValidator.predicate("price is positive", retrievedVariant.price > 0);
}
