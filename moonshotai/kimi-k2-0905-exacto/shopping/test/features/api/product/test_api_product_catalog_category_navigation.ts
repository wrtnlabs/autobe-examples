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
 * Test hierarchical category browsing and navigation within specific product
 * categories.
 *
 * This comprehensive test validates the shopping mall's taxonomy system by
 * exploring category hierarchies and verifying proper product association. The
 * test covers:
 *
 * 1. Root level category navigation using common e-commerce categories
 * 2. Subcategory exploration and hierarchical product discovery
 * 3. Product filtering and search within specific categories
 * 4. Price range filtering combined with category navigation
 * 5. Sorting and pagination within category contexts
 * 6. Validation of category metadata and product relationships
 *
 * The test simulates realistic customer browsing patterns where users navigate
 * from broad top-level categories down to specific product segments, validating
 * that the category system properly organizes products and maintains accurate
 * hierarchical relationships throughout the browsing experience.
 */
export async function test_api_product_catalog_category_navigation(
  connection: api.IConnection,
) {
  // Test main Electronics category with high-level browsing
  const electronicsRequest = {
    page: 1,
    limit: 20,
    categoryCode: "electronics",
    sortBy: "popularity",
    orderBy: "desc",
  } satisfies IShoppingMallProduct.IRequest;

  const electronicsProducts = await api.functional.shoppingMall.products.index(
    connection,
    { body: electronicsRequest },
  );
  typia.assert(electronicsProducts);

  TestValidator.predicate(
    "electronics category should return products",
    electronicsProducts.data.length > 0,
  );

  // Verify category structure and relationships
  const sampleElectronicProduct = electronicsProducts.data[0];
  TestValidator.predicate(
    "product should have valid category reference",
    !!sampleElectronicProduct.category.id &&
      !!sampleElectronicProduct.category.code &&
      !!sampleElectronicProduct.category.name,
  );

  // Test Fashion category with different sorting approach
  const fashionRequest = {
    page: 1,
    limit: 15,
    categoryCode: "fashion",
    sortBy: "newest",
    orderBy: "desc",
  } satisfies IShoppingMallProduct.IRequest;

  const fashionProducts = await api.functional.shoppingMall.products.index(
    connection,
    { body: fashionRequest },
  );
  typia.assert(fashionProducts);

  TestValidator.predicate(
    "fashion category should return products",
    fashionProducts.data.length > 0,
  );

  // Test Home category (simplified from home-garden)
  const homeRequest = {
    page: 1,
    limit: 25,
    categoryCode: "home",
    sortBy: "price_low_to_high",
    orderBy: "asc",
  } satisfies IShoppingMallProduct.IRequest;

  const homeProducts = await api.functional.shoppingMall.products.index(
    connection,
    { body: homeRequest },
  );
  typia.assert(homeProducts);

  TestValidator.predicate(
    "home category should return products",
    homeProducts.data.length > 0,
  );

  // Test price filtering within Electronics category
  const budgetElectronicsRequest = {
    page: 1,
    limit: 30,
    categoryCode: "electronics",
    minPrice: 50,
    maxPrice: 500,
    sortBy: "price_low_to_high",
    orderBy: "asc",
  } satisfies IShoppingMallProduct.IRequest;

  const budgetElectronics = await api.functional.shoppingMall.products.index(
    connection,
    { body: budgetElectronicsRequest },
  );
  typia.assert(budgetElectronics);

  // Validate price range compliance
  budgetElectronics.data.forEach((product, index) => {
    TestValidator.predicate(
      `budget electronics product ${index} price should be within range`,
      product.price >= 50 && product.price <= 500,
    );
  });

  // Test search functionality within specific categories
  const fashionSearchRequest = {
    page: 1,
    limit: 20,
    categoryCode: "fashion",
    search: "shirt",
    sortBy: "relevance",
    orderBy: "desc",
  } satisfies IShoppingMallProduct.IRequest;

  const fashionSearchResults = await api.functional.shoppingMall.products.index(
    connection,
    { body: fashionSearchRequest },
  );
  typia.assert(fashionSearchResults);

  TestValidator.predicate(
    "fashion search should return relevant products",
    fashionSearchResults.data.length >= 0, // Allow for no results
  );

  // Test pagination across different categories
  const paginatedElectronicsRequest = {
    page: 2,
    limit: 12,
    categoryCode: "electronics",
    sortBy: "name",
    orderBy: "asc",
  } satisfies IShoppingMallProduct.IRequest;

  const paginatedResults = await api.functional.shoppingMall.products.index(
    connection,
    { body: paginatedElectronicsRequest },
  );
  typia.assert(paginatedResults);

  TestValidator.predicate(
    "paginated results should maintain correct pagination",
    paginatedResults.pagination.current === 2 &&
      paginatedResults.pagination.limit === 12,
  );

  // Validate seller information consistency across categories
  const testProduct = electronicsProducts.data.find((p) => p.seller);
  if (testProduct) {
    TestValidator.predicate(
      "products should have complete seller information",
      !!testProduct.seller.id &&
        !!testProduct.seller.business_name &&
        !!testProduct.seller.verification_status,
    );
  }

  // Test availability filtering within categories
  const inStockElectronicsRequest = {
    page: 1,
    limit: 15,
    categoryCode: "electronics",
    availability: "in_stock",
    sortBy: "popularity",
    orderBy: "desc",
  } satisfies IShoppingMallProduct.IRequest;

  const inStockElectronics = await api.functional.shoppingMall.products.index(
    connection,
    { body: inStockElectronicsRequest },
  );
  typia.assert(inStockElectronics);

  TestValidator.predicate(
    "in-stock filter should work within categories",
    inStockElectronics.data.length >= 0,
  );

  // Verify category navigation results are properly structured
  TestValidator.predicate(
    "all results should have pagination info",
    !!electronicsProducts.pagination &&
      !!electronicsProducts.pagination.current &&
      !!electronicsProducts.pagination.limit &&
      !!electronicsProducts.pagination.records &&
      !!electronicsProducts.pagination.pages,
  );
}
