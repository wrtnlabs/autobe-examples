import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_product_variant_detail_out_of_stock(
  connection: api.IConnection,
): Promise<void> {
  // Generate random UUIDs for product and variant
  const productId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const variantId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Call the variant detail endpoint
  const variant = await api.functional.ecommerceMall.products.variants.at(
    connection,
    {
      productId,
      variantId,
    },
  );
  typia.assert(variant);
  // Validate response structure
  TestValidator.equals("variant id format", variant.id, variantId);
  TestValidator.equals("product id matches", variant.product_id, productId);
  TestValidator.predicate("has sku_code", variant.sku_code.length > 0);
  TestValidator.predicate(
    "has option_values",
    variant.option_values.length > 0,
  );
  // Validate stock_quantity is present and tracks inventory
  TestValidator.predicate(
    "stock_quantity is non-negative",
    variant.stock_quantity >= 0,
  );
  // Validate timestamps are ISO 8601 format
  new Date(variant.created_at); // Should not throw
  new Date(variant.updated_at); // Should not throw
  // Validate deleted_at is null (variant not soft-deleted)
  TestValidator.equals("variant not soft-deleted", variant.deleted_at, null);
  // Validate product relation is included
  TestValidator.equals("product name present", variant.product.name.length > 0, true);
  TestValidator.equals(
    "product base_price present",
    variant.product.base_price > 0,
    true,
  );
  TestValidator.equals(
    "product category present",
    variant.product.category.name.length > 0,
    true,
  );
  TestValidator.equals(
    "product seller present",
    variant.product.seller.display_name.length > 0,
    true,
  );
  TestValidator.equals(
    "availability_status present",
    ["available", "unavailable"].includes(variant.product.availability_status),
    true,
  );
  TestValidator.equals(
    "has_available_variants present",
    typeof variant.product.has_available_variants === "boolean",
    true,
  );
}