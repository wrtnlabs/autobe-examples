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

export async function test_api_product_variant_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Generate random UUIDs for product and variant
  const productId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const variantId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Retrieve the product variant (public endpoint, no authentication required)
  const variant = await api.functional.ecommerceMall.products.variants.at(
    connection,
    {
      productId,
      variantId,
    },
  );
  // Assert the response structure matches the expected DTO
  // This validates all fields including timestamps, types, formats, and constraints
  typia.assert(variant);
  // Validate business logic: stock quantity is positive (available for purchase)
  TestValidator.predicate(
    "variant has available stock",
    variant.stock_quantity > 0,
  );
  // Validate that the variant is active and available for purchase
  TestValidator.predicate("variant is active", variant.is_active === true);
  // Validate that parent product context is included and product is active in catalog
  TestValidator.predicate(
    "parent product is active",
    variant.product.isActive === true,
  );
  TestValidator.equals(
    "parent product has valid ID",
    typeof variant.product.id === "string",
    true,
  );
  TestValidator.equals(
    "parent product has valid name",
    typeof variant.product.name === "string",
    true,
  );
  // Validate SKU code is present and within length constraint
  TestValidator.equals("SKU code is non-empty", variant.sku_code.length > 0, true);
  TestValidator.equals(
    "SKU code length is valid",
    variant.sku_code.length <= 50,
    true,
  );
  // Validate option values structure is a non-empty object
  TestValidator.equals(
    "option values is an object",
    typeof variant.option_values === "object",
    true,
  );
  TestValidator.predicate(
    "option values has at least one key",
    Object.keys(variant.option_values).length > 0,
  );
  // Validate price override logic: if present, it should be a valid number
  if (variant.price_override != null) {
    TestValidator.predicate(
      "price override is a valid number",
      typeof variant.price_override === "number",
    );
  }
  // Validate base product price is available when no variant override
  if (variant.price_override == null) {
    TestValidator.predicate(
      "base price is available",
      variant.product.basePrice > 0,
    );
  }
  // Timestamp formats are validated by typia.assert (date-time format)
  // No additional validation needed - typia.assert ensures ISO 8601 format
}