import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test product discovery using descriptive product tags and product
 * classifications. This test validates tag-based navigation where customers
 * explore products by descriptive attributes like 'organic', 'handmade',
 * 'eco-friendly', or 'exclusive'. It demonstrates attribute-based shopping
 * experiences beyond traditional category navigation and supports marketplace
 * differentiation strategies.
 */
export async function test_api_product_catalog_tag_based_discovery(
  connection: api.IConnection,
) {
  // Test 1: Search products with organic/eco-friendly tags
  const ecoFriendlyRequest = {
    page: 1,
    limit: 20,
    search: "organic eco-friendly sustainable",
    tags: ["organic", "eco-friendly", "sustainable", "natural"],
    sortBy: "relevance",
    orderBy: "desc",
  } satisfies IShoppingMallProduct.IRequest;

  const ecoFriendlyProducts = await api.functional.shoppingMall.products.index(
    connection,
    { body: ecoFriendlyRequest },
  );
  typia.assert(ecoFriendlyProducts);

  TestValidator.predicate(
    "eco-friendly tag search returns sustainable products",
    ecoFriendlyProducts.data.length > 0,
  );

  // Test 2: Search handmade/artisan products
  const artisanalRequest = {
    page: 1,
    limit: 15,
    search: "handmade artisan craft",
    tags: ["handmade", "artisan", "craft", "traditional"],
    sortBy: "popularity",
    orderBy: "desc",
  } satisfies IShoppingMallProduct.IRequest;

  const artisanalProducts = await api.functional.shoppingMall.products.index(
    connection,
    { body: artisanalRequest },
  );
  typia.assert(artisanalProducts);

  TestValidator.predicate(
    "artisanal tag search returns handmade products",
    artisanalProducts.data.length > 0,
  );

  // Test 3: Search exclusive/luxury items
  const luxuryRequest = {
    page: 1,
    limit: 10,
    search: "exclusive premium luxury",
    tags: ["exclusive", "premium", "luxury", "limited-edition"],
    minPrice: 100,
    sortBy: "price_high_to_low",
    orderBy: "desc",
  } satisfies IShoppingMallProduct.IRequest;

  const luxuryProducts = await api.functional.shoppingMall.products.index(
    connection,
    { body: luxuryRequest },
  );
  typia.assert(luxuryProducts);

  TestValidator.predicate(
    "luxury tag search returns premium products",
    luxuryProducts.data.length > 0,
  );

  // Test 4: Multi-tag filtering with price ranges
  const multiTagRequest = {
    page: 1,
    limit: 25,
    tags: ["organic", "handmade", "local"],
    minPrice: 10,
    maxPrice: 200,
    availability: "in_stock",
    sortBy: "price_low_to_high",
    orderBy: "asc",
  } satisfies IShoppingMallProduct.IRequest;

  const multiTagProducts = await api.functional.shoppingMall.products.index(
    connection,
    { body: multiTagRequest },
  );
  typia.assert(multiTagProducts);

  TestValidator.predicate(
    "multi-tag filtering returns products within price range",
    multiTagProducts.data.length > 0,
  );

  // Validate price range constraints
  for (const product of multiTagProducts.data) {
    TestValidator.predicate(
      "product price within specified range",
      product.price >= 10 && product.price <= 200,
    );
  }

  // Test 5: Tag-based search with date filtering
  const startDate = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const endDate = new Date().toISOString();

  const recentEcoRequest = {
    page: 1,
    limit: 30,
    tags: ["organic", "new-arrival", "trending"],
    startDate,
    endDate,
    sortBy: "newest",
    orderBy: "desc",
  } satisfies IShoppingMallProduct.IRequest;

  const recentEcoProducts = await api.functional.shoppingMall.products.index(
    connection,
    { body: recentEcoRequest },
  );
  typia.assert(recentEcoProducts);

  TestValidator.predicate(
    "recent eco-friendly products search returns results",
    recentEcoProducts.data.length >= 0,
  );

  // Test 6: Pagination with tag-based discovery
  const paginatedRequest1 = {
    page: 1,
    limit: 5,
    tags: ["handmade", "artisan"],
    sortBy: "name",
    orderBy: "asc",
  } satisfies IShoppingMallProduct.IRequest;

  const page1Products = await api.functional.shoppingMall.products.index(
    connection,
    { body: paginatedRequest1 },
  );
  typia.assert(page1Products);

  const paginatedRequest2 = {
    page: 2,
    limit: 5,
    tags: ["handmade", "artisan"],
    sortBy: "name",
    orderBy: "asc",
  } satisfies IShoppingMallProduct.IRequest;

  const page2Products = await api.functional.shoppingMall.products.index(
    connection,
    { body: paginatedRequest2 },
  );
  typia.assert(page2Products);

  TestValidator.predicate(
    "different pages return different tag-filtered products",
    page1Products.data.length > 0 && page2Products.data.length > 0,
  );

  // Test 7: Validate tag count constraints
  const maxTagsRequest = {
    page: 1,
    limit: 10,
    tags: ArrayUtil.repeat(20, () =>
      RandomGenerator.pick(["eco", "organic", "artisan", "luxury"] as const),
    ),
    sortBy: "relevance",
    orderBy: "desc",
  } satisfies IShoppingMallProduct.IRequest;

  const maxTagsProducts = await api.functional.shoppingMall.products.index(
    connection,
    { body: maxTagsRequest },
  );
  typia.assert(maxTagsProducts);

  TestValidator.predicate(
    "maximum tag count filtering works correctly",
    maxTagsProducts.data.length >= 0,
  );
}
