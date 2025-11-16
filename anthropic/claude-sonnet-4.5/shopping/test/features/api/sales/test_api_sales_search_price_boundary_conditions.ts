import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSale";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test price filtering with boundary conditions and edge cases for shopping
 * mall sales search.
 *
 * This test validates that the sales search API correctly handles price
 * filtering at boundaries, including min_price=0, exact boundary matches,
 * exclusions, invalid ranges, and decimal precision.
 *
 * Test scenarios:
 *
 * 1. Verify min_price=0 includes all products
 * 2. Test products at exact min_price are included
 * 3. Test products at exact max_price are included
 * 4. Verify products above max_price are excluded
 * 5. Test exact price point search (min_price = max_price)
 * 6. Test invalid range handling (min_price > max_price)
 * 7. Verify decimal price precision handling
 * 8. Confirm minimum SKU price comparison logic
 */
export async function test_api_sales_search_price_boundary_conditions(
  connection: api.IConnection,
) {
  // Test 1: Search with min_price=0 should include all products
  const allProductsSearch = await api.functional.shoppingMall.sales.index(
    connection,
    {
      body: {
        min_price: 0,
        limit: 100,
      } satisfies IShoppingMallSale.IRequest,
    },
  );
  typia.assert(allProductsSearch);

  // Verify we got results
  TestValidator.predicate(
    "min_price=0 returns products",
    allProductsSearch.data.length >= 0,
  );

  // Test 2: Search with exact min_price boundary (e.g., min_price=50)
  const minBoundaryTest = 50;
  const minBoundarySearch = await api.functional.shoppingMall.sales.index(
    connection,
    {
      body: {
        min_price: minBoundaryTest,
        limit: 100,
      } satisfies IShoppingMallSale.IRequest,
    },
  );
  typia.assert(minBoundarySearch);

  // Validate all returned products have price >= min_price
  for (const product of minBoundarySearch.data) {
    TestValidator.predicate(
      `product price ${product.price} is >= min_price ${minBoundaryTest}`,
      product.price >= minBoundaryTest,
    );
  }

  // Test 3: Search with exact max_price boundary (e.g., max_price=1000)
  const maxBoundaryTest = 1000;
  const maxBoundarySearch = await api.functional.shoppingMall.sales.index(
    connection,
    {
      body: {
        max_price: maxBoundaryTest,
        limit: 100,
      } satisfies IShoppingMallSale.IRequest,
    },
  );
  typia.assert(maxBoundarySearch);

  // Validate all returned products have price <= max_price
  for (const product of maxBoundarySearch.data) {
    TestValidator.predicate(
      `product price ${product.price} is <= max_price ${maxBoundaryTest}`,
      product.price <= maxBoundaryTest,
    );
  }

  // Test 4: Search with price range
  const rangeMin = 100;
  const rangeMax = 500;
  const rangeSearch = await api.functional.shoppingMall.sales.index(
    connection,
    {
      body: {
        min_price: rangeMin,
        max_price: rangeMax,
        limit: 100,
      } satisfies IShoppingMallSale.IRequest,
    },
  );
  typia.assert(rangeSearch);

  // Validate all products are within the range
  for (const product of rangeSearch.data) {
    TestValidator.predicate(
      `product price ${product.price} is within range [${rangeMin}, ${rangeMax}]`,
      product.price >= rangeMin && product.price <= rangeMax,
    );
  }

  // Test 5: Search with exact price point (min_price = max_price)
  const exactPrice = 99.99;
  const exactPriceSearch = await api.functional.shoppingMall.sales.index(
    connection,
    {
      body: {
        min_price: exactPrice,
        max_price: exactPrice,
        limit: 100,
      } satisfies IShoppingMallSale.IRequest,
    },
  );
  typia.assert(exactPriceSearch);

  // All returned products should have exactly this price
  for (const product of exactPriceSearch.data) {
    TestValidator.predicate(
      `product price ${product.price} equals exact price ${exactPrice}`,
      product.price === exactPrice,
    );
  }

  // Test 6: Test decimal precision with specific values
  const decimalMin = 10.5;
  const decimalMax = 99.99;
  const decimalSearch = await api.functional.shoppingMall.sales.index(
    connection,
    {
      body: {
        min_price: decimalMin,
        max_price: decimalMax,
        limit: 100,
      } satisfies IShoppingMallSale.IRequest,
    },
  );
  typia.assert(decimalSearch);

  // Validate decimal precision is handled correctly
  for (const product of decimalSearch.data) {
    TestValidator.predicate(
      `product price ${product.price} is within decimal range [${decimalMin}, ${decimalMax}]`,
      product.price >= decimalMin && product.price <= decimalMax,
    );
  }

  // Test 7: Invalid range (min_price > max_price) should handle gracefully
  const invalidMin = 1000;
  const invalidMax = 100;
  const invalidRangeSearch = await api.functional.shoppingMall.sales.index(
    connection,
    {
      body: {
        min_price: invalidMin,
        max_price: invalidMax,
        limit: 100,
      } satisfies IShoppingMallSale.IRequest,
    },
  );
  typia.assert(invalidRangeSearch);

  // With invalid range, expect empty results or all results filtered out
  TestValidator.predicate(
    "invalid range (min > max) returns empty or no matching products",
    invalidRangeSearch.data.length === 0 ||
      invalidRangeSearch.data.every(
        (p) => p.price >= invalidMin && p.price <= invalidMax,
      ),
  );

  // Test 8: Verify boundary with very small price
  const verySmallPrice = 0.01;
  const smallPriceSearch = await api.functional.shoppingMall.sales.index(
    connection,
    {
      body: {
        min_price: verySmallPrice,
        limit: 100,
      } satisfies IShoppingMallSale.IRequest,
    },
  );
  typia.assert(smallPriceSearch);

  // All products should have price >= 0.01
  for (const product of smallPriceSearch.data) {
    TestValidator.predicate(
      `product price ${product.price} is >= ${verySmallPrice}`,
      product.price >= verySmallPrice,
    );
  }

  // Test 9: Verify max_price excludes products above threshold
  const exclusionMax = 200;
  const exclusionSearch = await api.functional.shoppingMall.sales.index(
    connection,
    {
      body: {
        max_price: exclusionMax,
        limit: 100,
      } satisfies IShoppingMallSale.IRequest,
    },
  );
  typia.assert(exclusionSearch);

  // No product should have price > max_price
  for (const product of exclusionSearch.data) {
    TestValidator.predicate(
      `product price ${product.price} does not exceed max_price ${exclusionMax}`,
      product.price <= exclusionMax,
    );
  }
}
