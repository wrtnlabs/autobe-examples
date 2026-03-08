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

export async function test_api_product_variant_list(
  connection: api.IConnection,
): Promise<void> {
  // Test the product variant listing endpoint with various filter scenarios
  // Using a random product ID to test the filtering and sorting functionality
  const productId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Test 1: Retrieve all active variants with default sorting (stock_quantity DESC)
  const allActiveVariants =
    await api.functional.ecommerceMall.products.variants.index(connection, {
      productId,
      body: { active_status: "active" },
    });
  typia.assert(allActiveVariants);
  // Test 2: Filter by stock_status='in_stock'
  const inStockVariants =
    await api.functional.ecommerceMall.products.variants.index(connection, {
      productId,
      body: { stock_status: "in_stock" },
    });
  typia.assert(inStockVariants);
  // Test 3: Filter by stock_status='out_of_stock'
  const outOfStockVariants =
    await api.functional.ecommerceMall.products.variants.index(connection, {
      productId,
      body: { stock_status: "out_of_stock" },
    });
  typia.assert(outOfStockVariants);
  // Test 4: Filter by min_price
  const filteredByMinPrice =
    await api.functional.ecommerceMall.products.variants.index(connection, {
      productId,
      body: { min_price: 90.0 },
    });
  typia.assert(filteredByMinPrice);
  // Test 5: Filter by max_price
  const filteredByMaxPrice =
    await api.functional.ecommerceMall.products.variants.index(connection, {
      productId,
      body: { max_price: 150.0 },
    });
  typia.assert(filteredByMaxPrice);
  // Test 6: Filter by both min and max price
  const filteredByPriceRange =
    await api.functional.ecommerceMall.products.variants.index(connection, {
      productId,
      body: { min_price: 80.0, max_price: 120.0 },
    });
  typia.assert(filteredByPriceRange);
  // Test 7: Filter by active_status='inactive'
  const inactiveVariants =
    await api.functional.ecommerceMall.products.variants.index(connection, {
      productId,
      body: { active_status: "inactive" },
    });
  typia.assert(inactiveVariants);
  // Test 8: Sort by price_override ascending
  const sortedByPriceAsc =
    await api.functional.ecommerceMall.products.variants.index(connection, {
      productId,
      body: { sort_by: "price_override", sort_direction: "asc" },
    });
  typia.assert(sortedByPriceAsc);
  // Test 9: Sort by stock_quantity descending
  const sortedByStockDesc =
    await api.functional.ecommerceMall.products.variants.index(connection, {
      productId,
      body: { sort_by: "stock_quantity", sort_direction: "desc" },
    });
  typia.assert(sortedByStockDesc);
  // Test 10: Pagination test
  const paginatedVariants =
    await api.functional.ecommerceMall.products.variants.index(connection, {
      productId,
      body: { page: 1, limit: 10 },
    });
  typia.assert(paginatedVariants);
  // Validate pagination structure
  typia.assert(paginatedVariants.pagination);
  TestValidator.predicate(
    "pagination has required fields",
    paginatedVariants.pagination.current !== undefined &&
      paginatedVariants.pagination.limit !== undefined &&
      paginatedVariants.pagination.records !== undefined &&
      paginatedVariants.pagination.pages !== undefined,
  );
  // Test 11: SKU pattern filter
  const filteredBySkU =
    await api.functional.ecommerceMall.products.variants.index(connection, {
      productId,
      body: { sku_pattern: "ABC" },
    });
  typia.assert(filteredBySkU);
  // Test 12: Verify variant displayPrice equals priceOverride or product.base_price
  for (const variant of allActiveVariants.data) {
    const expectedPrice = variant.priceOverride ?? variant.product.base_price;
    TestValidator.equals(
      "displayPrice matches priceOverride or base_price",
      variant.displayPrice,
      expectedPrice,
    );
  }
  // Test 13: Verify stockQuantity reflects actual stock (in_stock filter)
  for (const variant of inStockVariants.data) {
    TestValidator.predicate(
      "in_stock variant has positive stock",
      variant.stockQuantity > 0,
    );
  }
  // Test 14: Verify out_of_stock filter
  for (const variant of outOfStockVariants.data) {
    TestValidator.equals(
      "out_of_stock variant has zero stock",
      variant.stockQuantity,
      0,
    );
  }
  // Test 15: Verify price range filter
  for (const variant of filteredByPriceRange.data) {
    TestValidator.predicate(
      "variant in price range",
      variant.displayPrice >= 80.0 && variant.displayPrice <= 120.0,
    );
  }
}
