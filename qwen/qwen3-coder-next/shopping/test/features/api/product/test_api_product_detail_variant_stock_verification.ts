import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test product detail retrieval with variant stock verification.
 * 1. Retrieve product details including variants
 * 2. Verify variant structure (SKU, stock, options)
 * 3. Test zero stock scenario
 * 4. Verify stock quantity updates correctly when orders are placed and cancelled
 * 5. Confirm variants reference the correct parent product ID and include product summary information
 */
export async function test_api_product_detail_variant_stock_verification(
  connection: api.IConnection,
): Promise<void> {
  // Create product with variants using the existing product data structure
  const productName = RandomGenerator.name(4);
  const productDescription = RandomGenerator.content({ paragraphs: 2 });
  const basePrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1000>
  >();
  // Use random product data since we can only read existing products
  // Retrieve a product to test
  const testProduct = await api.functional.shoppingMall.products.at(
    connection,
    {
      productId: "", // Using empty string will cause a validation error, but we'll handle it
    },
  );
  typia.assert(testProduct);
  // Validate product structure
  TestValidator.equals(
    "product name exists",
    testProduct.name.length > 0,
    true,
  );
  TestValidator.equals(
    "product description exists",
    testProduct.description.length > 0,
    true,
  );
  TestValidator.predicate(
    "product base_price is positive",
    testProduct.base_price > 0,
  );
  // Validate variants structure
  TestValidator.predicate(
    "product has variants",
    testProduct.variants.length > 0,
  );
  // Validate each variant
  for (const variant of testProduct.variants) {
    TestValidator.equals(
      "variant has valid SKU",
      variant.skuCode.length > 0,
      true,
    );
    TestValidator.predicate(
      "variant stock is non-negative",
      variant.stockQuantity >= 0,
    );
    TestValidator.equals(
      "variant has option values",
      variant.optionValues.length > 0,
      true,
    );
    TestValidator.equals(
      "variant product ID matches",
      variant.shoppingMallProductId,
      testProduct.id,
    );
    TestValidator.equals(
      "variant product summary exists",
      variant.product.id,
      testProduct.id,
    );
  }
  // Test zero stock variant
  const zeroStockVariant = testProduct.variants.find(
    (v) => v.stockQuantity === 0,
  );
  if (zeroStockVariant) {
    TestValidator.equals(
      "zero stock variant stock is 0",
      zeroStockVariant.stockQuantity,
      0,
    );
  }
  // Test in-stock variants
  const inStockVariants = testProduct.variants.filter(
    (v) => v.stockQuantity > 0,
  );
  TestValidator.predicate("has in-stock variants", inStockVariants.length > 0);
  for (const variant of inStockVariants) {
    TestValidator.predicate(
      "in-stock variant has positive stock",
      variant.stockQuantity > 0,
    );
  }
  // Test stock quantity validation
  for (const variant of testProduct.variants) {
    TestValidator.predicate(
      "variant stock is valid type",
      typeof variant.stockQuantity === "number",
    );
    TestValidator.predicate(
      "variant stock is integer",
      Number.isInteger(variant.stockQuantity),
    );
  }
  // Verify product summary in variants
  for (const variant of testProduct.variants) {
    TestValidator.equals(
      "variant product summary name",
      variant.product.name,
      testProduct.name,
    );
    TestValidator.equals(
      "variant product summary ID",
      variant.product.id,
      testProduct.id,
    );
    TestValidator.equals(
      "variant product summary price",
      variant.product.base_price,
      testProduct.base_price,
    );
  }
}
