import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductVariant";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_product_variant_no_variants(
  connection: api.IConnection,
): Promise<void> {
  // Setup actor-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  // ========================================================================
  // SCENARIO 1: Product with Zero Variants (Testing Empty State)
  // ========================================================================
  {
    // Generate a test product ID (assuming product exists in test database)
    const productId = typia.random<string & tags.Format<"uuid">>();
    // 1.1 Retrieve variants for product with zero variants
    const emptyVariantsResult =
      await api.functional.ecommerceMall.products.variants.index(
        adminConnection,
        {
          productId,
          body: {},
        },
      );
    typia.assert(emptyVariantsResult);
    // 1.2 Validate empty variant response structure
    TestValidator.equals(
      "non-existent product returns empty data array",
      emptyVariantsResult.data.length,
      0,
    );
    TestValidator.equals(
      "non-existent product pagination records",
      emptyVariantsResult.pagination.records,
      0,
    );
    TestValidator.equals(
      "non-existent product pagination pages",
      emptyVariantsResult.pagination.pages,
      0,
    );
    TestValidator.equals(
      "non-existent product pagination current",
      emptyVariantsResult.pagination.current,
      1,
    );
    TestValidator.equals(
      "non-existent product pagination limit",
      emptyVariantsResult.pagination.limit,
      20,
    );
    // 1.3 Verify product still retrievable via variants endpoint (returns empty)
    const emptyVariantsResult2 =
      await api.functional.ecommerceMall.products.variants.index(
        adminConnection,
        {
          productId,
          body: {},
        },
      );
    typia.assert(emptyVariantsResult2);
    TestValidator.equals(
      "product with zero variants returns consistent empty response",
      emptyVariantsResult2.data.length,
      0,
    );
  }
  // ========================================================================
  // SCENARIO 2: Products with Single Variant (Testing Single Entry)
  // ========================================================================
  {
    // Generate a test product ID (assuming single-variant product exists)
    const productId = typia.random<string & tags.Format<"uuid">>();
    // 2.1 Retrieve variants for product with single variant
    const singleVariantResult =
      await api.functional.ecommerceMall.products.variants.index(
        adminConnection,
        {
          productId,
          body: {},
        },
      );
    typia.assert(singleVariantResult);
    // 2.2 Validate single variant response structure
    TestValidator.equals(
      "single variant product returns one variant",
      singleVariantResult.data.length,
      1,
    );
    TestValidator.equals(
      "single variant product pagination records",
      singleVariantResult.pagination.records,
      1,
    );
    TestValidator.equals(
      "single variant product pagination pages",
      singleVariantResult.pagination.pages,
      1,
    );
    // 2.3 Validate variant structure
    const variant = singleVariantResult.data[0];
    typia.assert(variant);
    TestValidator.predicate("variant has valid id", variant.id !== undefined);
    TestValidator.predicate(
      "variant has valid sku code",
      variant.skuCode !== undefined,
    );
    TestValidator.predicate(
      "variant has valid stock quantity",
      variant.stockQuantity !== undefined,
    );
    TestValidator.predicate(
      "variant has valid active status",
      variant.isActive !== undefined,
    );
    TestValidator.predicate(
      "variant has valid product reference",
      variant.product !== undefined,
    );
    TestValidator.predicate(
      "variant has valid display price",
      variant.displayPrice >= 0,
    );
    // 2.4 Verify display price calculation
    if (variant.priceOverride !== null && variant.priceOverride !== undefined) {
      TestValidator.equals(
        "display price uses priceOverride when set",
        variant.displayPrice,
        variant.priceOverride,
      );
    } else {
      TestValidator.predicate(
        "display price uses base product price when priceOverride is null",
        variant.displayPrice === variant.product.base_price,
      );
    }
  }
  // ========================================================================
  // SCENARIO 3: Combined Filter Logic (stock_status AND active_status)
  // ========================================================================
  {
    // Generate a test product ID (assuming product with variants exists)
    const productId = typia.random<string & tags.Format<"uuid">>();
    // 3.1 Test filter: stock_status='out_of_stock' AND active_status='all'
    // Should return variants that are out of stock regardless of active status
    const outOfStockAllActive =
      await api.functional.ecommerceMall.products.variants.index(
        adminConnection,
        {
          productId,
          body: {
            stock_status: "out_of_stock",
            active_status: "all",
          },
        },
      );
    typia.assert(outOfStockAllActive);
    // Validate all returned variants are out of stock
    const allOutOfStock = outOfStockAllActive.data.every(
      (v) => v.stockQuantity === 0,
    );
    TestValidator.predicate(
      "out_of_stock with all active returns only out of stock variants",
      allOutOfStock,
    );
    // 3.2 Test filter: stock_status='out_of_stock' AND active_status='active'
    // Should return only variants that are out of stock AND active
    const outOfStockActive =
      await api.functional.ecommerceMall.products.variants.index(
        adminConnection,
        {
          productId,
          body: {
            stock_status: "out_of_stock",
            active_status: "active",
          },
        },
      );
    typia.assert(outOfStockActive);
    // Validate all returned variants are out of stock AND active
    const allOutAndActive = outOfStockActive.data.every(
      (v) => v.stockQuantity === 0 && v.isActive === true,
    );
    TestValidator.predicate(
      "out_of_stock with active filter returns only out of stock active variants",
      allOutAndActive,
    );
    // 3.3 Test filter: stock_status='in_stock' AND active_status='active'
    // Should return only variants that are in stock AND active
    const inStockActive =
      await api.functional.ecommerceMall.products.variants.index(
        adminConnection,
        {
          productId,
          body: {
            stock_status: "in_stock",
            active_status: "active",
          },
        },
      );
    typia.assert(inStockActive);
    // Validate all returned variants are in stock AND active
    const allInAndActive = inStockActive.data.every(
      (v) => v.stockQuantity > 0 && v.isActive === true,
    );
    TestValidator.predicate(
      "in_stock with active filter returns only in stock active variants",
      allInAndActive,
    );
    // 3.4 Test filter: stock_status='in_stock' AND active_status='inactive'
    // Should return only variants that are in stock AND inactive
    const inStockInactive =
      await api.functional.ecommerceMall.products.variants.index(
        adminConnection,
        {
          productId,
          body: {
            stock_status: "in_stock",
            active_status: "inactive",
          },
        },
      );
    typia.assert(inStockInactive);
    // Validate all returned variants are in stock AND inactive
    const allInAndInactive = inStockInactive.data.every(
      (v) => v.stockQuantity > 0 && v.isActive === false,
    );
    TestValidator.predicate(
      "in_stock with inactive filter returns only in stock inactive variants",
      allInAndInactive,
    );
    // 3.5 Verify AND logic: out_of_stock variants are subset of all variants
    const allVariants =
      await api.functional.ecommerceMall.products.variants.index(
        adminConnection,
        {
          productId,
          body: {},
        },
      );
    typia.assert(allVariants);
    TestValidator.predicate(
      "out_of_stock variants is subset of all variants",
      outOfStockAllActive.data.length <= allVariants.data.length,
    );
  }
}
