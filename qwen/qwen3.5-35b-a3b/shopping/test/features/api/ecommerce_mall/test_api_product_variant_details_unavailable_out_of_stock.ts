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

export async function test_api_product_variant_details_unavailable_out_of_stock(
  connection: api.IConnection,
): Promise<void> {
  // Generate random product and variant IDs for testing
  const productId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const outOfStockVariantId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const inStockVariantId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 1. Customer setup for viewing variants
  const customerConnection: api.IConnection = { host: connection.host };
  // 2. Retrieve out-of-stock variant details
  const outOfStockVariant =
    await api.functional.ecommerceMall.products.variants.at(
      customerConnection,
      {
        productId,
        variantId: outOfStockVariantId,
      },
    );
  typia.assert(outOfStockVariant);
  // Validate out-of-stock variant response structure
  TestValidator.equals(
    "variant ID matches request",
    outOfStockVariant.id,
    outOfStockVariantId,
  );
  TestValidator.predicate(
    "variant has SKU code",
    () => outOfStockVariant.sku.length > 0,
  );
  TestValidator.equals(
    "variant has positive base price",
    outOfStockVariant.basePrice > 0,
    true,
  );
  TestValidator.equals(
    "variant stock quantity is zero (out of stock)",
    outOfStockVariant.stockQuantity,
    0,
  );
  TestValidator.equals(
    "variant reserved quantity is zero",
    outOfStockVariant.reservedQuantity,
    0,
  );
  TestValidator.equals(
    "variant has non-null sale price or null",
    outOfStockVariant.salePrice !== undefined,
    true,
  );
  TestValidator.equals(
    "variant options JSON string is not empty",
    outOfStockVariant.options.length > 0,
    true,
  );
  TestValidator.equals(
    "variant has defined sort order",
    outOfStockVariant.sortOrder >= 0,
    true,
  );
  TestValidator.equals(
    "variant default flag is boolean",
    typeof outOfStockVariant.isDefault === "boolean",
    true,
  );
  // 3. Validate product reference in variant
  TestValidator.equals(
    "variant product ID matches",
    outOfStockVariant.product.id,
    productId,
  );
  TestValidator.predicate(
    "product name is not empty",
    () => outOfStockVariant.product.name.length > 0,
  );
  TestValidator.predicate(
    "product slug is not empty",
    () => outOfStockVariant.product.slug.length > 0,
  );
  TestValidator.equals(
    "product base price is positive",
    outOfStockVariant.product.base_price > 0,
    true,
  );
  TestValidator.equals(
    "product has category reference",
    outOfStockVariant.product.category !== undefined,
    true,
  );
  TestValidator.equals(
    "product status is valid",
    ["active", "inactive", "out_of_stock"].includes(
      outOfStockVariant.product.status,
    ),
    true,
  );
  // 4. Retrieve in-stock variant for comparison
  const inStockVariant =
    await api.functional.ecommerceMall.products.variants.at(
      customerConnection,
      {
        productId,
        variantId: inStockVariantId,
      },
    );
  typia.assert(inStockVariant);
  TestValidator.equals(
    "in-stock variant has different ID",
    inStockVariant.id,
    inStockVariantId,
  );
  TestValidator.notEquals(
    "in-stock variant has different stock quantity",
    inStockVariant.stockQuantity,
    outOfStockVariant.stockQuantity,
  );
  TestValidator.predicate(
    "in-stock variant has positive quantity",
    () => inStockVariant.stockQuantity > 0,
  );
  // 5. Validate timestamps
  TestValidator.predicate(
    "variant has creation timestamp",
    () =>
      outOfStockVariant.createdAt !== undefined &&
      outOfStockVariant.createdAt.length > 0,
  );
  TestValidator.predicate(
    "variant has update timestamp",
    () =>
      outOfStockVariant.updatedAt !== undefined &&
      outOfStockVariant.updatedAt.length > 0,
  );
  TestValidator.predicate(
    "variant deleted_at is null for active variant",
    () => outOfStockVariant.deletedAt === null,
  );
  // 6. Validate category reference structure
  const category = outOfStockVariant.product.category;
  TestValidator.equals(
    "category ID is valid UUID",
    category.id !== undefined,
    true,
  );
  TestValidator.equals(
    "category name is not empty",
    category.name.length > 0,
    true,
  );
  TestValidator.equals(
    "category slug is not empty",
    category.slug.length > 0,
    true,
  );
  TestValidator.predicate(
    "category parent_id may be null for root categories",
    () =>
      category.parent_id === undefined ||
      category.parent_id === null ||
      typeof category.parent_id === "string",
  );
  TestValidator.predicate(
    "category display_order may be undefined",
    () =>
      category.display_order === undefined ||
      typeof category.display_order === "number",
  );
}
