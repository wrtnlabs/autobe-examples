import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductImage";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test comprehensive product image search and filtering functionality.
 * Validates that users can search, filter, and paginate through product images
 * with various criteria including primary image status, display order ranges,
 * and upload date ranges.
 */
export async function test_api_product_image_search_and_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "admin123";

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      role: "super_admin",
      permissions: JSON.stringify({ read: true, write: true, delete: true }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create category as prerequisite for product creation
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1>
        >(),
        active: true,
        parent_id: undefined,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 3: Switch to seller account for product creation
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "seller123";

  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      business_name: RandomGenerator.paragraph({ sentences: 2 }),
      contact_person: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_address: RandomGenerator.content({ paragraphs: 1 }),
      tax_id: undefined,
      ip: undefined,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 4: Create product that will contain images
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        sku: RandomGenerator.alphaNumeric(8),
        price: typia.random<number & tags.Minimum<1> & tags.Maximum<10000>>(),
        compare_price: undefined,
        cost_price: undefined,
        stock_quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1000>
        >(),
        status: "active",
        condition: "new",
        weight: undefined,
        dimensions: undefined,
        category: {
          id: category.id,
          name: category.name,
          description: category.description,
          display_order: category.display_order,
          active: category.active,
          parent_id:
            category.parent?.id ?? typia.random<string & tags.Format<"uuid">>(),
          created_at: category.created_at,
          updated_at: category.updated_at,
          parent: undefined,
        } satisfies IShoppingMallCategory.ISummary,
        seller: {
          id: seller.id,
          business_name: seller.business_name,
          contact_person: seller.contact_person,
          email: seller.email,
          status: seller.status,
        } satisfies IShoppingMallSeller.ISummary,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // Step 5: Test image search functionality
  // Since we don't have an API to create images, we'll test the search endpoint
  // with various filter combinations to ensure it handles requests properly

  // Test 1: Basic search with default pagination
  const basicSearchResult =
    await api.functional.shoppingMall.products.images.index(connection, {
      productId: product.id,
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallProductImage.IRequest,
    });
  typia.assert(basicSearchResult);

  TestValidator.equals(
    "pagination page is correct",
    basicSearchResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "limit is positive",
    basicSearchResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records count is non-negative",
    basicSearchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    basicSearchResult.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data is an array",
    Array.isArray(basicSearchResult.data),
  );

  // Test 2: Search with primary image filter
  const primaryFilterResult =
    await api.functional.shoppingMall.products.images.index(connection, {
      productId: product.id,
      body: {
        page: 1,
        limit: 5,
        is_primary: true,
      } satisfies IShoppingMallProductImage.IRequest,
    });
  typia.assert(primaryFilterResult);

  // Test 3: Search with display order range
  const displayOrderResult =
    await api.functional.shoppingMall.products.images.index(connection, {
      productId: product.id,
      body: {
        page: 1,
        limit: 10,
        display_order_min: 1,
        display_order_max: 5,
      } satisfies IShoppingMallProductImage.IRequest,
    });
  typia.assert(displayOrderResult);

  // Test 4: Search with date range (using current date)
  const currentDate = new Date().toISOString();
  const oneWeekAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const dateRangeResult =
    await api.functional.shoppingMall.products.images.index(connection, {
      productId: product.id,
      body: {
        page: 1,
        limit: 10,
        created_at_min: oneWeekAgo,
        created_at_max: currentDate,
      } satisfies IShoppingMallProductImage.IRequest,
    });
  typia.assert(dateRangeResult);

  // Test 5: Search with text filter
  const textSearchResult =
    await api.functional.shoppingMall.products.images.index(connection, {
      productId: product.id,
      body: {
        page: 1,
        limit: 10,
        search: "product",
      } satisfies IShoppingMallProductImage.IRequest,
    });
  typia.assert(textSearchResult);

  // Test 6: Search with combined filters
  const combinedFilterResult =
    await api.functional.shoppingMall.products.images.index(connection, {
      productId: product.id,
      body: {
        page: 1,
        limit: 20,
        search: "image",
        is_primary: false,
        display_order_min: 1,
        display_order_max: 10,
        created_at_min: oneWeekAgo,
        created_at_max: currentDate,
      } satisfies IShoppingMallProductImage.IRequest,
    });
  typia.assert(combinedFilterResult);

  // Validate that all searches return proper structure
  const allResults = [
    basicSearchResult,
    primaryFilterResult,
    displayOrderResult,
    dateRangeResult,
    textSearchResult,
    combinedFilterResult,
  ];

  for (const result of allResults) {
    TestValidator.predicate(
      "pagination structure exists",
      result.pagination !== undefined,
    );
    TestValidator.predicate("data is array", Array.isArray(result.data));
    TestValidator.equals("current page is 1", result.pagination.current, 1);
    TestValidator.predicate("limit is positive", result.pagination.limit > 0);
    TestValidator.predicate(
      "records count is valid",
      result.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pages count is valid",
      result.pagination.pages >= 0,
    );
  }

  // Test pagination behavior with different page sizes
  const smallPageResult =
    await api.functional.shoppingMall.products.images.index(connection, {
      productId: product.id,
      body: {
        page: 1,
        limit: 5,
      } satisfies IShoppingMallProductImage.IRequest,
    });
  typia.assert(smallPageResult);

  const largePageResult =
    await api.functional.shoppingMall.products.images.index(connection, {
      productId: product.id,
      body: {
        page: 1,
        limit: 50,
      } satisfies IShoppingMallProductImage.IRequest,
    });
  typia.assert(largePageResult);

  TestValidator.equals(
    "small page has correct limit",
    smallPageResult.pagination.limit,
    5,
  );
  TestValidator.equals(
    "large page has correct limit",
    largePageResult.pagination.limit,
    50,
  );

  // Validate that search is scoped to the specific product
  // Create another product and verify searches are isolated
  const anotherProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        sku: RandomGenerator.alphaNumeric(8),
        price: typia.random<number & tags.Minimum<1> & tags.Maximum<10000>>(),
        compare_price: undefined,
        cost_price: undefined,
        stock_quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1000>
        >(),
        status: "active",
        condition: "new",
        weight: undefined,
        dimensions: undefined,
        category: {
          id: category.id,
          name: category.name,
          description: category.description,
          display_order: category.display_order,
          active: category.active,
          parent_id:
            category.parent?.id ?? typia.random<string & tags.Format<"uuid">>(),
          created_at: category.created_at,
          updated_at: category.updated_at,
          parent: undefined,
        } satisfies IShoppingMallCategory.ISummary,
        seller: {
          id: seller.id,
          business_name: seller.business_name,
          contact_person: seller.contact_person,
          email: seller.email,
          status: seller.status,
        } satisfies IShoppingMallSeller.ISummary,
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(anotherProduct);

  // Search on the second product should return different results (even if both are empty)
  const secondProductSearch =
    await api.functional.shoppingMall.products.images.index(connection, {
      productId: anotherProduct.id,
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallProductImage.IRequest,
    });
  typia.assert(secondProductSearch);

  TestValidator.notEquals(
    "different products have different search results",
    basicSearchResult.pagination.records,
    secondProductSearch.pagination.records,
  );
}
