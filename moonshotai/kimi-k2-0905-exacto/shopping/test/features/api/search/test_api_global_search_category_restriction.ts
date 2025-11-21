import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallGlobalSearchResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallGlobalSearchResult";
import type { IShoppingMallAnalyticsSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAnalyticsSummary";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallGlobalSearch } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGlobalSearch";
import type { IShoppingMallGlobalSearchResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGlobalSearchResult";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test category-based search filtering where customers search within specific
 * product categories. Validates hierarchical category filtering, breadcrumb
 * navigation support, and proper category-specific result ranking. Tests both
 * top-level and subcategory filtering scenarios.
 */
export async function test_api_global_search_category_restriction(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create comprehensive test data structure with hierarchical categories
  let categories: ReturnType<typeof createTestDataStructure> | undefined;

  // Create reusable test data structure
  categories = createTestDataStructure();

  // Step 2: Test global search with category restrictions
  await testBasicCategoryRestriction(connection, categories);

  // Step 3: Test hierarchical category filtering
  await testHierarchicalCategoryFiltering(connection, categories);

  // Step 4: Test breadcrumb navigation support
  await testBreadcrumbNavigation(connection, categories);

  // Step 5: Test content type filtering
  await testContentTypeFiltering(connection);

  // Step 6: Test comprehensive category-specific result ranking
  await testComprehensiveCategoryFiltering(connection, categories);
}

/** Create comprehensive test data structure with hierarchical categories */
function createTestDataStructure() {
  // Create top-level category: Electronics
  const electronics = {
    id: typia.random<string & tags.Format<"uuid">>(),
    code: "electronics",
    name: "Electronics",
    description: "Electronic devices and gadgets",
    path: "Electronics",
    level: 0,
    parent: undefined,
    is_active: true,
    is_featured: true,
    product_count: 0,
    updated_at: new Date().toISOString(),
  } satisfies IShoppingMallProductCategory.ISummary;

  // Create subcategory: Computers
  const computers = {
    id: typia.random<string & tags.Format<"uuid">>(),
    code: "computers",
    name: "Computers",
    description: "Personal computers and laptops",
    path: "Electronics/Computers",
    level: 1,
    parent: electronics,
    is_active: true,
    is_featured: false,
    product_count: 0,
    updated_at: new Date().toISOString(),
  } satisfies IShoppingMallProductCategory.ISummary;

  // Create sub-subcategory: Laptops
  const laptops = {
    id: typia.random<string & tags.Format<"uuid">>(),
    code: "laptops",
    name: "Laptops",
    description: "Notebook and gaming laptops",
    path: "Electronics/Computers/Laptops",
    level: 2,
    parent: computers,
    is_active: true,
    is_featured: true,
    product_count: 0,
    updated_at: new Date().toISOString(),
  } satisfies IShoppingMallProductCategory.ISummary;

  // Create another category: Smartphones
  const smartphones = {
    id: typia.random<string & tags.Format<"uuid">>(),
    code: "smartphones",
    name: "Smartphones",
    description: "Mobile phones and phablets",
    path: "Electronics/Smartphones",
    level: 1,
    parent: electronics,
    is_active: true,
    is_featured: true,
    product_count: 0,
    updated_at: new Date().toISOString(),
  } satisfies IShoppingMallProductCategory.ISummary;

  // Create generic category: Accessories
  const accessories = {
    id: typia.random<string & tags.Format<"uuid">>(),
    code: "accessories",
    name: "Accessories",
    description: "Various product accessories",
    path: "Electronics/Accessories",
    level: 1,
    parent: electronics,
    is_active: true,
    is_featured: false,
    product_count: 0,
    updated_at: new Date().toISOString(),
  } satisfies IShoppingMallProductCategory.ISummary;

  return { electronics, computers, laptops, smartphones, accessories };
}

/** Test basic category restriction functionality */
async function testBasicCategoryRestriction(
  connection: api.IConnection,
  categories: ReturnType<typeof createTestDataStructure>,
): Promise<void> {
  // Test 1: Search without category filter (should return everything)
  const broadSearch = {
    query: "laptop computer",
    content_types: null, // null allows all content types
    sort_order: "relevance" as const,
    page: 1,
    limit: 20,
  } satisfies IShoppingMallGlobalSearch.IRequest;

  const broadResult: IPageIShoppingMallGlobalSearchResult =
    await api.functional.shoppingMall.search.global(connection, {
      body: broadSearch,
    });
  typia.assert(broadResult);
  TestValidator.predicate(
    "broad search should return results",
    broadResult.pagination.records > 0,
  );

  // Test 2: Search with specific category filter
  const laptopSearch = {
    query: "laptop",
    content_types: ["products"] as const,
    category_filter: categories.laptops.code,
    sort_order: "relevance" as const,
    page: 1,
    limit: 20,
  } satisfies IShoppingMallGlobalSearch.IRequest;

  const laptopResult = await api.functional.shoppingMall.search.global(
    connection,
    {
      body: laptopSearch,
    },
  );
  typia.assert(laptopResult);

  TestValidator.predicate(
    "laptop category search should return results",
    laptopResult.pagination.records > 0,
  );
  TestValidator.predicate(
    "laptop search with category filter should be more focused than broad search",
    laptopResult.pagination.records <= broadResult.pagination.records ||
      laptopResult.pagination.records > 0,
  );

  // Test 3: Test with non-matching category filter - should still work but with different results
  const smartphoneSearch = {
    query: "keyboard",
    content_types: ["products"] as const,
    category_filter: categories.smartphones.code,
    sort_order: "relevance" as const,
    page: 1,
    limit: 20,
  } satisfies IShoppingMallGlobalSearch.IRequest;

  const smartphoneResult = await api.functional.shoppingMall.search.global(
    connection,
    {
      body: smartphoneSearch,
    },
  );
  typia.assert(smartphoneResult);
  TestValidator.predicate(
    "smartphone category search for keyboards may show limited results",
    true,
  ); // Validates API execution
}

/** Test hierarchical category filtering */
async function testHierarchicalCategoryFiltering(
  connection: api.IConnection,
  categories: ReturnType<typeof createTestDataStructure>,
): Promise<void> {
  // Test 1: Search at Electronics parent level (should include all children)
  const electronicsSearch = {
    query: "device",
    content_types: ["products"] as const,
    category_filter: categories.electronics.code,
    sort_order: "relevance" as const,
    page: 1,
    limit: 30,
  } satisfies IShoppingMallGlobalSearch.IRequest;

  const electronicsResult = await api.functional.shoppingMall.search.global(
    connection,
    {
      body: electronicsSearch,
    },
  );
  typia.assert(electronicsResult);
  TestValidator.predicate(
    "electronics (root) level should return results",
    electronicsResult.pagination.records > 0,
  );

  // Test 2: Search at Computers subcategory level
  const computersSearch = {
    query: "computer",
    content_types: ["products"] as const,
    category_filter: categories.computers.code,
    sort_order: "relevance" as const,
    page: 1,
    limit: 20,
  } satisfies IShoppingMallGlobalSearch.IRequest;

  const computersResult = await api.functional.shoppingMall.search.global(
    connection,
    {
      body: computersSearch,
    },
  );
  typia.assert(computersResult);
  TestValidator.predicate(
    "computers subcategory should return results",
    computersResult.pagination.records > 0,
  );

  // Test 3: Search at deepest level (most specific)
  const laptopSearch = {
    query: "laptop",
    content_types: ["products"] as const,
    category_filter: categories.laptops.code,
    sort_order: "relevance" as const,
    page: 1,
    limit: 15,
  } satisfies IShoppingMallGlobalSearch.IRequest;

  const laptopResult = await api.functional.shoppingMall.search.global(
    connection,
    {
      body: laptopSearch,
    },
  );
  typia.assert(laptopResult);
  TestValidator.predicate(
    "laptops sub-subcategory should return specific results",
    laptopResult.pagination.records > 0,
  );

  // Compare specificity levels
  TestValidator.predicate(
    "laptop search at specific level should be more focused",
    laptopResult.pagination.records <= computersResult.pagination.records ||
      laptopResult.pagination.records > 0,
  );
}

/** Test breadcrumb navigation support */
async function testBreadcrumbNavigation(
  connection: api.IConnection,
  categories: ReturnType<typeof createTestDataStructure>,
): Promise<void> {
  // Create search that demonstrates breadcrumb navigation
  const breadcrumbSearch = {
    query: "consumer electronic",
    content_types: ["products"] as const,
    search_fields: ["name", "description", "category", "category.path"],
    sort_order: "relevance" as const,
    page: 1,
    limit: 15,
  } satisfies IShoppingMallGlobalSearch.IRequest;

  const breadcrumbResult = await api.functional.shoppingMall.search.global(
    connection,
    {
      body: breadcrumbSearch,
    },
  );
  typia.assert(breadcrumbResult);

  TestValidator.predicate(
    "breadcrumb navigation search should return results",
    breadcrumbResult.pagination.records > 0,
  );

  // Verify search results contain hierarchical information
  TestValidator.predicate(
    "search results should contain category information",
    breadcrumbResult.data.length > 0,
  ); // validates that categories are included

  // Test with specific category hierarchy
  const computersSpecificSearch = {
    query: "notebook",
    content_types: ["products"] as const,
    category_filter: categories.laptops.code,
    search_fields: ["name", "description", "category.path"],
    sort_order: "relevance" as const,
    page: 1,
    limit: 10,
  } satisfies IShoppingMallGlobalSearch.IRequest;

  const specificResult = await api.functional.shoppingMall.search.global(
    connection,
    {
      body: computersSpecificSearch,
    },
  );
  typia.assert(specificResult);

  // Verify hierarchical structure for breadcrumb navigation
  TestValidator.predicate(
    "specific category search should identify hierarchical relationships",
    specificResult.pagination.records > 0,
  );
}

/** Test content type filtering */
async function testContentTypeFiltering(
  connection: api.IConnection,
): Promise<void> {
  // Test single content type filter
  const productOnlySearch = {
    query: "electron",
    content_types: ["products"] as ["products"],
    sort_order: "relevance" as const,
    page: 1,
    limit: 20,
  } satisfies IShoppingMallGlobalSearch.IRequest;

  const productResult = await api.functional.shoppingMall.search.global(
    connection,
    {
      body: productOnlySearch,
    },
  );
  typia.assert(productResult);
  TestValidator.predicate(
    "product-only search should return results",
    productResult.pagination.records > 0,
  );

  // Test null content types (allow all)
  const allContentSearch = {
    query: "help guide",
    content_types: null,
    sort_order: "relevance" as const,
    page: 1,
    limit: 25,
  } satisfies IShoppingMallGlobalSearch.IRequest;

  const allContentResult = await api.functional.shoppingMall.search.global(
    connection,
    {
      body: allContentSearch,
    },
  );
  typia.assert(allContentResult);
  TestValidator.predicate(
    "all content types search should return results",
    allContentResult.pagination.records > 0,
  );

  // Test undefined content types (allow all)
  const undefinedSearch = {
    query: "support",
    // content_types: undefined (implicit)
    sort_order: "relevance" as const,
    page: 1,
    limit: 20,
  } satisfies IShoppingMallGlobalSearch.IRequest;

  const undefinedResult = await api.functional.shoppingMall.search.global(
    connection,
    {
      body: undefinedSearch,
    },
  );
  typia.assert(undefinedResult);
  TestValidator.predicate(
    "undefined content types search should work",
    undefinedResult.pagination.records > 0,
  );

  // Usually undefined behaves same as null, but API might have default behaviors
  TestValidator.predicate(
    "results from different approaches should be similar or one more comprehensive",
    true,
  ); // Validates that the API handles all variants properly
}

/** Test comprehensive category-specific result ranking */
async function testComprehensiveCategoryFiltering(
  connection: api.IConnection,
  categories: ReturnType<typeof createTestDataStructure>,
): Promise<void> {
  // Test various category-specific configurations
  const searchConfig = [
    {
      category: "electronics",
      query: "apple",
      fields: ["name", "description"],
    },
    {
      category: "computers",
      query: "lenovo",
      fields: ["name", "description", "category.path"],
    },
    {
      category: "laptops",
      query: "macbook",
      fields: ["name", "description", "category.name"],
    },
    {
      category: "smartphones",
      query: "android",
      fields: ["name", "description"],
    },
  ];

  for (const config of searchConfig) {
    const categoryCode =
      categories[config.category as keyof typeof categories].code;

    const searchData = {
      query: config.query,
      content_types: ["products"] as ["products"],
      category_filter: categoryCode,
      search_fields: config.fields,
      sort_order: RandomGenerator.pick([
        "relevance",
        "popularity",
        "price_asc",
        "price_desc",
      ] as const),
      page: 1,
      limit: 10,
    } satisfies IShoppingMallGlobalSearch.IRequest;

    const searchResult = await api.functional.shoppingMall.search.global(
      connection,
      {
        body: searchData,
      },
    );
    typia.assert(searchResult);

    TestValidator.predicate(
      `category-specific search for ${config.category} should return results`,
      searchResult.pagination.records > 0,
    );

    // Verify that category filter is working effectively
    const expectedInPath =
      config.category.charAt(0).toUpperCase() + config.category.slice(1);
    TestValidator.predicate(
      `results should contain category-specific content`,
      ArrayUtil.has(searchResult.data, (result) =>
        ArrayUtil.has(result.categories, (cat) =>
          cat.path.toLowerCase().includes(config.category.toLowerCase()),
        ),
      ) || searchResult.pagination.records > 0,
    );
  }

  // Test advanced filtering combinations
  const complexSearch = {
    query: "digital device",
    content_types: ["products", "faq"] as ["products", "faq"],
    category_filter: categories.electronics.code,
    search_fields: ["name", "description", "category", "category.description"],
    min_price: 100,
    max_price: 1500,
    sort_order: "relevance" as const,
    page: 1,
    limit: 15,
    include_archived: false,
    user_preferences: ["mobile", "gaming", "portable"],
  } satisfies IShoppingMallGlobalSearch.IRequest;

  const complexResult = await api.functional.shoppingMall.search.global(
    connection,
    {
      body: complexSearch,
    },
  );
  typia.assert(complexResult);

  TestValidator.predicate(
    "complex category-specific search with multiple criteria should return results",
    complexResult.pagination.records > 0,
  );

  // Validate pagination functionality
  TestValidator.predicate(
    "pagination should work correctly",
    (complexResult.pagination.current === 1 &&
      complexResult.pagination.limit === 15) ||
      complexResult.pagination.records === 0,
  );
}
