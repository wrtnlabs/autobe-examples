import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import type { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import type { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformProductVariant";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Validates product variant stock availability filtering behavior.
 *
 * Tests that the `inStock` filter correctly categorizes variants based on their computed inventory stock quantity. When `inStock` is true, only variants with positive stock (net inventory sum > 0) should be returned. When `inStock` is false, only out-of-stock variants (net stock = 0, including those with no inventory records) should be returned.
 *
 * Also validates that stock filtering works correctly in combination with SKU search, price range filters, and pagination. Ensures all returned variant summaries contain accurate `stock_quantity` values.
 *
 * 1. Query variants with `inStock: true` and verify all have `stock_quantity > 0`.
 * 2. Query variants with `inStock: false` and verify all have `stock_quantity === 0`.
 * 3. Query variants without stock filter and verify any non-negative stock is accepted.
 * 4. Test combined filtering with SKU search and stock availability.
 * 5. Validate pagination metadata correctness.
 * 6. Confirm response structure with `typia.assert()` on every response.
 */
export async function test_api_product_variant_empty_stock_filtering(
  connection: api.IConnection,
) {
  // Generate test product ID
  const productId = typia.random<string & tags.Format<"uuid">>();
  // 1. Filter for in-stock variants (stock > 0)
  const inStockBody = {
    inStock: true,
    limit: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >(),
  } satisfies IEcommercePlatformProductVariant.IRequest;
  const inStockResult =
    await api.functional.ecommercePlatform.products.variants.index(connection, {
      productId,
      body: inStockBody,
    });
  typia.assert(inStockResult);
  // Validate all returned variants are in stock (stock_quantity > 0)
  for (const variant of inStockResult.data) {
    typia.assert(variant);
    TestValidator.predicate(
      `in-stock filter: variant ${variant.sku_code} has positive stock`,
      variant.stock_quantity > 0,
    );
  }
  // 2. Filter for out-of-stock variants (stock === 0)
  const outStockBody = {
    inStock: false,
    limit: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >(),
  } satisfies IEcommercePlatformProductVariant.IRequest;
  const outStockResult =
    await api.functional.ecommercePlatform.products.variants.index(connection, {
      productId,
      body: outStockBody,
    });
  typia.assert(outStockResult);
  // Validate all returned variants are out of stock (stock_quantity === 0)
  for (const variant of outStockResult.data) {
    typia.assert(variant);
    TestValidator.equals(
      `out-of-stock filter: variant ${variant.sku_code} has zero stock`,
      variant.stock_quantity,
      0,
    );
  }
  // 3. No stock filter - all variants regardless of stock level
  const allVariantsBody =
    {} satisfies IEcommercePlatformProductVariant.IRequest;
  const allVariantsResult =
    await api.functional.ecommercePlatform.products.variants.index(connection, {
      productId,
      body: allVariantsBody,
    });
  typia.assert(allVariantsResult);
  // Validate all returned variants have non-negative stock
  for (const variant of allVariantsResult.data) {
    typia.assert(variant);
    TestValidator.predicate(
      `unfiltered: variant ${variant.sku_code} has non-negative stock`,
      variant.stock_quantity >= 0,
    );
  }
  // 4. Combined filtering: SKU search + stock availability
  const searchKeyword = RandomGenerator.alphabets(3);
  const searchFilterBody = {
    search: searchKeyword,
    inStock: true,
    page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    limit: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >(),
  } satisfies IEcommercePlatformProductVariant.IRequest;
  const searchResult =
    await api.functional.ecommercePlatform.products.variants.index(connection, {
      productId,
      body: searchFilterBody,
    });
  typia.assert(searchResult);
  // Validate combined filter: in-stock AND SKU contains search term
  for (const variant of searchResult.data) {
    typia.assert(variant);
    TestValidator.predicate(
      `combined filter: variant ${variant.sku_code} has positive stock`,
      variant.stock_quantity > 0,
    );
    TestValidator.predicate(
      `combined filter: variant SKU contains search term "${searchKeyword}"`,
      variant.sku_code.toLowerCase().includes(searchKeyword.toLowerCase()),
    );
  }
  // 5. Validate pagination metadata
  TestValidator.equals(
    "in-stock pagination limit matches request",
    inStockResult.pagination.limit,
    inStockBody.limit,
  );
  TestValidator.equals(
    "in-stock pagination current page is 1 (default)",
    inStockResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "in-stock pagination records matches data length",
    inStockResult.pagination.records,
    inStockResult.data.length,
  );
  TestValidator.predicate(
    "in-stock pagination pages is at least 1 when data exists",
    inStockResult.data.length > 0 ? inStockResult.pagination.pages >= 1 : true,
  );
  // 6. Price range + stock availability combined filter
  const priceFilterBody = {
    priceMin: typia.random<number & tags.Type<"uint32">>(),
    priceMax: typia.random<number & tags.Type<"uint32">>(),
    inStock: false,
    limit: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >(),
  } satisfies IEcommercePlatformProductVariant.IRequest;
  const priceResult =
    await api.functional.ecommercePlatform.products.variants.index(connection, {
      productId,
      body: priceFilterBody,
    });
  typia.assert(priceResult);
  // Validate out-of-stock filter still applies with price range
  for (const variant of priceResult.data) {
    typia.assert(variant);
    TestValidator.equals(
      `price+stock filter: variant ${variant.sku_code} is out of stock`,
      variant.stock_quantity,
      0,
    );
  }
}
