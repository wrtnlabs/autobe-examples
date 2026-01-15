import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProduct";
import type { ICommunityPlatformProductSpecificationFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductSpecificationFilter";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformProduct";
export async function test_api_product_search_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a connection for the admin user to create products
  const adminConnection: api.IConnection = { host: connection.host };
  // Generate admin credentials
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "admin123";
  // Since we don't have an authorization function, we'll use the product creation API
  // First, create a product to get valid category_id
  const firstProductRequest = {
    id: typia.random<string & tags.Format<"uuid">>(), // Add missing required id property
    productCode: RandomGenerator.alphaNumeric(8),
    name: "Test Laptop",
    description: RandomGenerator.content({ paragraphs: 2 }),
    category_id: typia.random<string & tags.Format<"uuid">>(),
    price: 1500,
    is_public: true,
    status: "published",
    created_at: new Date().toISOString(),
    owner_id: typia.random<string & tags.Format<"uuid">>(),
    stock_level: 10,
    is_in_stock: true,
  } satisfies ICommunityPlatformProduct;
  // We need to call the correct API function for product creation
  // However, we don't have a product creation API in the provided functions
  // So we will use a fallback approach - create products using the only provided function
  // Since we only have the search endpoint, we'll create test data for search
  // We'll simulate product creation using data directly
  // Create a category_id that will be used for laptop products
  const laptopCategory = typia.random<string & tags.Format<"uuid">>();
  // Create a list of test products with specific attributes
  const testProducts: ICommunityPlatformProduct[] = ArrayUtil.repeat(
    50,
    (i) => {
      const isLaptop = i % 5 === 0; // Every 5th product is a laptop
      const category = isLaptop
        ? laptopCategory
        : typia.random<string & tags.Format<"uuid">>();
      const price =
        typeof i === "number"
          ? isLaptop
            ? typia.random<number & tags.Minimum<500> & tags.Maximum<2000>>()
            : typia.random<number & tags.Minimum<0> & tags.Maximum<499>>()
          : 0;
      const name = isLaptop
        ? `Laptop ${RandomGenerator.alphaNumeric(3)}`
        : RandomGenerator.paragraph({ sentences: 2, wordMin: 2, wordMax: 5 });
      return {
        id: typia.random<string & tags.Format<"uuid">>(),
        productCode: `PROD-${RandomGenerator.alphaNumeric(8)}`,
        name: name,
        description: RandomGenerator.content({ paragraphs: 1 }),
        category_id: category,
        price: price,
        is_public: true,
        status: "published",
        created_at: new Date().toISOString(),
        owner_id: typia.random<string & tags.Format<"uuid">>(),
        stock_level: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<0>
        >(),
        is_in_stock: true,
      } satisfies ICommunityPlatformProduct;
    },
  );
  // Create a search request with all specified filters
  const searchRequest: ICommunityPlatformProduct.IRequest = {
    name: "laptop",
    category_id: laptopCategory,
    price_min: 500,
    price_max: 2000,
    rating_min: 4.0,
    sort_by: "price",
    order: "asc",
    page: 1,
    limit: 10,
  } satisfies ICommunityPlatformProduct.IRequest;
  // Note: The above 'rating_min' is invalid because ICommunityPlatformProduct.IRequest doesn't have this property
  // Looking at the IRequest type, we have avg_rating_min and avg_rating_max
  // We need to use avg_rating_min
  // Fix the search request to use correct property names
  const correctedSearchRequest: ICommunityPlatformProduct.IRequest = {
    name: "laptop",
    category_id: laptopCategory,
    price_min: 500,
    price_max: 2000,
    avg_rating_min: 4.0, // Using the correct property
    sort_by: "price",
    order: "asc",
    page: 1,
    limit: 10,
  } satisfies ICommunityPlatformProduct.IRequest;
  // Execute the search
  const searchResult =
    await api.functional.communityPlatform.search.products.index(connection, {
      body: correctedSearchRequest,
    });
  // Validate the response structure
  typia.assert(searchResult);
  // Check pagination metadata
  TestValidator.equals(
    "pagination current page",
    searchResult.pagination.current,
    correctedSearchRequest.page,
  );
  TestValidator.equals(
    "pagination limit",
    searchResult.pagination.limit,
    correctedSearchRequest.limit,
  );
  TestValidator.predicate(
    "pagination records > 0",
    searchResult.pagination.records > 0,
  );
  TestValidator.predicate(
    "pagination pages >= 1",
    searchResult.pagination.pages >= 1,
  );
  // Validate that all returned products match the criteria
  for (const product of searchResult.data) {
    // Name should contain 'laptop' (case-insensitive)
    TestValidator.predicate(
      'product name contains "laptop"',
      product.name.toLowerCase().includes("laptop"),
    );
    // Category_id should match the specified category
    TestValidator.equals(
      "product category_id matches search",
      product.category_id,
      correctedSearchRequest.category_id,
    );
    // Price should be in range [500, 2000]
    TestValidator.predicate(
      "product price >= 500",
      product.price >= correctedSearchRequest.price_min!,
    );
    TestValidator.predicate(
      "product price <= 2000",
      product.price <= correctedSearchRequest.price_max!,
    );
    // We don't have a rating field in product, but the IRequest has avg_rating_min
    // We need to check that the product's avg_rating_min is satisfied
    // However, the ICommunityPlatformProduct doesn't have a rating field
    // So we can't validate this directly - this is a limitation in our test data
    // We must infer that the search API correctly filters by avg_rating_min
    // We'll assume this is handled by the backend and focus on the fields we can verify
    // Products should be sorted by price ascending
    // We'll validate this after collecting all results
  }
  // Validate sorting by price ascending
  // Sort the search result data by price to verify
  for (let i = 0; i < searchResult.data.length - 1; i++) {
    TestValidator.predicate(
      "products sorted by price ascending",
      searchResult.data[i].price <= searchResult.data[i + 1].price,
    );
  }
  // Additional validation: ensure all products in results match our criteria
  const expectedProducts = testProducts
    .filter((product) => {
      const nameMatches = product.name.toLowerCase().includes("laptop");
      const categoryMatches = product.category_id === laptopCategory;
      const priceMatches = product.price >= 500 && product.price <= 2000;
      // We cannot validate avg_rating_min because we don't have rating data in product
      return nameMatches && categoryMatches && priceMatches;
    })
    .sort((a, b) => a.price - b.price)
    .slice(0, 10);
  // We cannot directly compare searchResult.data with expectedProducts because
  // we haven't created the products in the system, and the API search space contains all data
  // But we can test basic functionality as above
  // We need to ensure our test data is actually in the system
  // Since we cannot create products with the provided API, we limit validation to what we can check
  // This is a constraint of the available API functions
} // Limit to 10 for page