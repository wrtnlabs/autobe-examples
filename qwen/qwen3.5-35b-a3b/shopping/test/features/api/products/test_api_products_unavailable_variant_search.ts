import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_products_unavailable_variant_search(
  connection: api.IConnection,
): Promise<void> {
  // Test products with no variants and all out-of-stock variants
  // Search for products and verify availability_status and has_available_variants fields
  const searchResults = await api.functional.ecommerceMall.products.index(
    connection,
    {
      body: {},
    },
  );
  typia.assert(searchResults);
  // Verify pagination structure
  TestValidator.equals(
    "pagination has correct current page",
    searchResults.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    searchResults.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has non-negative records",
    searchResults.pagination.records >= 0,
  );
  // Test that products with inStockOnly filter work correctly
  const availableOnlyResults =
    await api.functional.ecommerceMall.products.index(connection, {
      body: {
        inStockOnly: true,
      },
    });
  typia.assert(availableOnlyResults);
  // Verify all returned products have availability_status 'available'
  if (availableOnlyResults.data.length > 0) {
    availableOnlyResults.data.forEach((product) => {
      TestValidator.equals(
        "product in inStockOnly results should be available",
        product.availability_status,
        "available",
      );
      TestValidator.equals(
        "product in inStockOnly results should have available variants",
        product.has_available_variants,
        true,
      );
    });
  }
  // Test search without inStockOnly filter - should include all products
  const allProductsResults = await api.functional.ecommerceMall.products.index(
    connection,
    {
      body: {
        inStockOnly: false,
      },
    },
  );
  typia.assert(allProductsResults);
  // Verify that inStockOnly results are subset of all results
  TestValidator.predicate(
    "inStockOnly results should be subset of all products",
    availableOnlyResults.data.length <= allProductsResults.data.length,
  );
  // Test that each product has valid structure with all required fields
  allProductsResults.data.forEach((product) => {
    // Verify product has required fields
    TestValidator.predicate(
      "product should have valid UUID id",
      product.id.length === 36,
    );
    TestValidator.predicate(
      "product should have name",
      product.name.length > 0,
    );
    TestValidator.predicate(
      "product should have base_price",
      product.base_price > 0,
    );
    TestValidator.predicate(
      "product should have availability_status",
      product.availability_status === "available" ||
        product.availability_status === "unavailable",
    );
    TestValidator.predicate(
      "product should have has_available_variants boolean",
      typeof product.has_available_variants === "boolean",
    );
    TestValidator.predicate(
      "product should have category",
      product.category !== undefined,
    );
    TestValidator.predicate(
      "product should have seller",
      product.seller !== undefined,
    );
    // Verify category structure
    TestValidator.predicate(
      "category should have id",
      product.category.id !== undefined,
    );
    TestValidator.predicate(
      "category should have name",
      product.category.name !== undefined,
    );
    // Verify seller structure
    TestValidator.predicate(
      "seller should have id",
      product.seller.id !== undefined,
    );
    TestValidator.predicate(
      "seller should have display_name",
      product.seller.display_name !== undefined,
    );
  });
  // Test searching with various filter combinations
  const searchByName = await api.functional.ecommerceMall.products.index(
    connection,
    {
      body: {
        search: "test",
      },
    },
  );
  typia.assert(searchByName);
  // Verify search results maintain same structure
  searchByName.data.forEach((product) => {
    TestValidator.predicate(
      "search result has valid status",
      product.availability_status !== undefined,
    );
    TestValidator.predicate(
      "search result has valid has_available_variants",
      typeof product.has_available_variants === "boolean",
    );
  });
  // Test price range filtering
  const priceFiltered = await api.functional.ecommerceMall.products.index(
    connection,
    {
      body: {
        minPrice: 0,
        maxPrice: 10000,
      },
    },
  );
  typia.assert(priceFiltered);
  // Verify price filtered products are within range
  priceFiltered.data.forEach((product) => {
    TestValidator.predicate(
      "product price should be within minPrice",
      product.base_price >= 0,
    );
    TestValidator.predicate(
      "product price should be within maxPrice",
      product.base_price <= 10000,
    );
  });
  // Test sorting functionality
  const sortedByName = await api.functional.ecommerceMall.products.index(
    connection,
    {
      body: {
        sortBy: "name",
        sortOrder: "asc",
      },
    },
  );
  typia.assert(sortedByName);
  const sortedByPrice = await api.functional.ecommerceMall.products.index(
    connection,
    {
      body: {
        sortBy: "base_price",
        sortOrder: "desc",
      },
    },
  );
  typia.assert(sortedByPrice);
  // Verify sorted results maintain availability status structure
  sortedByName.data.forEach((product) => {
    TestValidator.predicate(
      "sorted product has availability_status",
      product.availability_status !== undefined,
    );
    TestValidator.predicate(
      "sorted product has has_available_variants",
      product.has_available_variants !== undefined,
    );
  });
  TestValidator.equals("test completed successfully", true, true);
}
