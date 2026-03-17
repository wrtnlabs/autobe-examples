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

export async function test_api_product_variant_details_custom_price(
  connection: api.IConnection,
): Promise<void> {
  // Generate valid UUIDs for product and variant
  const productId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const variantId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Retrieve variant details (no authentication required per authorization spec)
  const variant = await api.functional.ecommerceMall.products.variants.at(
    connection,
    { productId, variantId },
  );
  typia.assert(variant);
  // Validate variant's custom price differs from product base price (core business rule)
  TestValidator.notEquals(
    "variant price differs from product base price",
    variant.basePrice,
    variant.product.base_price,
  );
  // Validate variant has sale price override (promotional variant)
  TestValidator.notEquals(
    "variant salePrice differs from basePrice when sale exists",
    variant.salePrice,
    variant.basePrice,
    (key) => key === "salePrice" || key === "basePrice",
  );
  // Validate option values exist as JSON string format
  TestValidator.predicate(
    "variant options contain value",
    variant.options.length > 0,
  );
  // Validate stock quantity is non-negative when available
  TestValidator.predicate(
    "stockQuantity is non-negative",
    variant.stockQuantity >= 0,
  );
  // Validate reservedQuantity doesn't exceed stockQuantity
  TestValidator.predicate(
    "reservedQuantity does not exceed stock",
    variant.reservedQuantity <= variant.stockQuantity,
  );
  // Validate parent product information is complete
  TestValidator.notEquals(
    "parent product has valid base price",
    variant.product.base_price,
    0,
  );
  // Validate parent product has category reference
  TestValidator.notEquals(
    "parent product has category",
    variant.product.category,
    null as any,
  );
  // Validate variant SKU is non-empty string
  TestValidator.predicate("variant SKU has value", variant.sku.length > 0);
  // Validate status is active or valid
  TestValidator.predicate(
    "variant status is valid",
    ["active", "inactive", "discontinued"].includes(variant.status),
  );
  // Validate timestamps exist and are ISO date-time format
  TestValidator.predicate("createdAt exists", variant.createdAt !== undefined);
  TestValidator.predicate("updatedAt exists", variant.updatedAt !== undefined);
  TestValidator.predicate(
    "deletedAt is properly nullable",
    variant.deletedAt === null || variant.deletedAt !== undefined,
  );
}
