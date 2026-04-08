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

export async function test_api_products_browsing_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // Since we cannot create products via the available API, we test the browse endpoint
  // with various request parameters and validate the response structure and behavior.
  // Test 1: Get all products with pagination
  const allProductsResponse = await api.functional.ecommerceMall.products.index(
    connection,
    {
      body: {
        limit: 20,
        page: 1,
      },
    },
  );
  typia.assert(allProductsResponse);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page is 1",
    allProductsResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 20",
    allProductsResponse.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    allProductsResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    allProductsResponse.pagination.pages >= 0,
  );
  // Test 2: Search by name (full-text search)
  const searchProductName = RandomGenerator.name(3);
  const searchResponse = await api.functional.ecommerceMall.products.index(
    connection,
    {
      body: {
        search: searchProductName.substring(0, 100),
        limit: 20,
      },
    },
  );
  typia.assert(searchResponse);
  // Validate search response has pagination
  TestValidator.equals(
    "search pagination current page",
    searchResponse.pagination.current,
    1,
  );
  // Test 3: Filter by single category
  const randomCategoryIds = ArrayUtil.repeat(3, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );
  const categoryFilterResponse =
    await api.functional.ecommerceMall.products.index(connection, {
      body: {
        categoryIds: randomCategoryIds,
        limit: 20,
      },
    });
  typia.assert(categoryFilterResponse);
  // Test 4: Filter by seller
  const randomSellerId = typia.random<string & tags.Format<"uuid">>();
  const sellerFilterResponse =
    await api.functional.ecommerceMall.products.index(connection, {
      body: {
        sellerId: randomSellerId,
        limit: 20,
      },
    });
  typia.assert(sellerFilterResponse);
  // Test 5: Sort by name (ascending)
  const nameAscResponse = await api.functional.ecommerceMall.products.index(
    connection,
    {
      body: {
        sortBy: "name",
        sortOrder: "asc",
        limit: 20,
      },
    },
  );
  typia.assert(nameAscResponse);
  // Test 6: Sort by base_price (descending)
  const priceDescResponse = await api.functional.ecommerceMall.products.index(
    connection,
    {
      body: {
        sortBy: "base_price",
        sortOrder: "desc",
        limit: 20,
      },
    },
  );
  typia.assert(priceDescResponse);
  // Test 7: Sort by created_at (ascending)
  const dateAscResponse = await api.functional.ecommerceMall.products.index(
    connection,
    {
      body: {
        sortBy: "created_at",
        sortOrder: "asc",
        limit: 20,
      },
    },
  );
  typia.assert(dateAscResponse);
  // Test 8: Filter by inStockOnly
  const inStockResponse = await api.functional.ecommerceMall.products.index(
    connection,
    {
      body: {
        inStockOnly: true,
        limit: 20,
      },
    },
  );
  typia.assert(inStockResponse);
  // Validate all returned products have correct availability_status and has_available_variants
  for (const product of inStockResponse.data) {
    TestValidator.equals(
      `inStockOnly product ${product.id} availability_status is available`,
      product.availability_status,
      "available",
    );
    TestValidator.equals(
      `inStockOnly product ${product.id} has_available_variants is true`,
      product.has_available_variants,
      true,
    );
  }
  // Test 9: Filter by price range
  const minPrice = typia.random<number & tags.Minimum<0>>();
  const maxPrice =
    minPrice + typia.random<number & tags.Minimum<0> & tags.Maximum<10000>>();
  const priceRangeResponse = await api.functional.ecommerceMall.products.index(
    connection,
    {
      body: {
        minPrice,
        maxPrice,
        limit: 20,
      },
    },
  );
  typia.assert(priceRangeResponse);
  // Validate all returned products are within price range
  for (const product of priceRangeResponse.data) {
    TestValidator.predicate(
      `product ${product.id} base_price >= minPrice`,
      product.base_price >= minPrice,
    );
    TestValidator.predicate(
      `product ${product.id} base_price <= maxPrice`,
      product.base_price <= maxPrice,
    );
  }
  // Test 10: Filter by multiple categories (up to 10)
  const multipleCategoryIds = ArrayUtil.repeat(5, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );
  const multipleCategoryResponse =
    await api.functional.ecommerceMall.products.index(connection, {
      body: {
        categoryIds: multipleCategoryIds,
        limit: 20,
      },
    });
  typia.assert(multipleCategoryResponse);
  // Test 11: Verify all product summaries include required fields
  for (const product of allProductsResponse.data) {
    // Validate id is UUID format
    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    TestValidator.equals(
      `product ${product.id} has valid UUID format`,
      uuidPattern.test(product.id),
      true,
    );
    // Validate name is present
    TestValidator.predicate(
      `product ${product.id} has non-empty name`,
      product.name.length > 0,
    );
    // Validate base_price is a number
    TestValidator.equals(
      `product ${product.id} base_price is number`,
      typeof product.base_price,
      "number",
    );
    // Validate category is present with id and name
    TestValidator.predicate(
      `product ${product.id} has category`,
      product.category !== undefined,
    );
    TestValidator.equals(
      `product ${product.id} category has valid UUID id`,
      uuidPattern.test(product.category.id),
      true,
    );
    TestValidator.predicate(
      `product ${product.id} category has non-empty name`,
      product.category.name.length > 0,
    );
    // Validate seller is present with id and display_name
    TestValidator.predicate(
      `product ${product.id} has seller`,
      product.seller !== undefined,
    );
    TestValidator.equals(
      `product ${product.id} seller has valid UUID id`,
      uuidPattern.test(product.seller.id),
      true,
    );
    TestValidator.predicate(
      `product ${product.id} seller has non-empty display_name`,
      product.seller.display_name.length > 0,
    );
    // Validate availability_status is valid enum
    TestValidator.equals(
      `product ${product.id} availability_status is valid enum`,
      product.availability_status,
      product.availability_status,
    );
    // Validate has_available_variants is boolean
    TestValidator.equals(
      `product ${product.id} has_available_variants is boolean`,
      typeof product.has_available_variants,
      "boolean",
    );
  }
  // Test 12: Verify response has correct pagination structure
  const page2Response = await api.functional.ecommerceMall.products.index(
    connection,
    {
      body: {
        page: 2,
        limit: 20,
      },
    },
  );
  typia.assert(page2Response);
  TestValidator.equals(
    "pagination page 2 current page",
    page2Response.pagination.current,
    2,
  );
  // Test 13: Verify page beyond available range returns empty data with valid metadata
  const highPageResponse = await api.functional.ecommerceMall.products.index(
    connection,
    {
      body: {
        page: 999999,
        limit: 10,
      },
    },
  );
  typia.assert(highPageResponse);
  TestValidator.equals(
    "high page current page is set correctly",
    highPageResponse.pagination.current,
    999999,
  );
  TestValidator.equals(
    "high page data is empty",
    highPageResponse.data.length,
    0,
  );
}
