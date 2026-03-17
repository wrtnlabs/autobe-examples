import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_product_variant_details_available(
  connection: api.IConnection,
): Promise<void> {
  // Generate test identifiers for product and variant
  const productId = typia.random<string & tags.Format<"uuid">>();
  const variantId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve variant details
  const variant = await api.functional.ecommerceMall.products.variants.at(
    connection,
    { productId, variantId },
  );
  typia.assert(variant);
  // Validate variant is active and available for purchase
  TestValidator.equals("variant status is active", variant.status, "active");
  TestValidator.predicate(
    "stock quantity is positive",
    variant.stockQuantity > 0,
  );
  TestValidator.equals("variant is not soft deleted", variant.deletedAt, null);
  // Validate variant has all required fields
  TestValidator.notEquals("variant has valid SKU code", variant.sku, "");
  TestValidator.notEquals("variant has options data", variant.options, "");
  TestValidator.predicate(
    "variant has base price defined",
    variant.basePrice > 0,
  );
  // Validate variant option fields
  TestValidator.predicate(
    "variant has non-negative reserved quantity",
    variant.reservedQuantity >= 0,
  );
  TestValidator.predicate(
    "variant has non-negative sort order",
    variant.sortOrder >= 0,
  );
  // Validate product information is complete
  typia.assert(variant.product);
  TestValidator.notEquals(
    "parent product has valid ID",
    variant.product.id,
    "",
  );
  TestValidator.notEquals("parent product has name", variant.product.name, "");
  TestValidator.predicate(
    "parent product has price",
    variant.product.base_price > 0,
  );
  typia.assert(variant.product.category);
  TestValidator.notEquals(
    "product has category ID",
    variant.product.category.id,
    "",
  );
  TestValidator.notEquals(
    "product has category name",
    variant.product.category.name,
    "",
  );
  // Validate timestamps are properly formatted
  typia.assert(variant.createdAt);
  typia.assert(variant.updatedAt);
  // Validate sale price can be null (no active sale)
  if (variant.salePrice !== null) {
    TestValidator.predicate(
      "sale price is non-negative",
      variant.salePrice >= 0,
    );
  }
}
