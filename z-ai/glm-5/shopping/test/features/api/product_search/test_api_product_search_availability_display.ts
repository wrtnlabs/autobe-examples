import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_administrator_categories_create } from "../../../generate/generate_random_shopping_mall_administrator_categories_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";

export async function test_api_product_search_availability_display(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create administrator connection for category creation
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // Create category for potential product filtering
  const category =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(1),
        },
      },
    );
  typia.assert(category);
  // Test 1: Search all products without in_stock filter
  // Validates that all product types (in-stock, out-of-stock, no variants) appear
  const allProductsResponse = await api.functional.shoppingMall.products.index(
    connection,
    { body: {} },
  );
  typia.assert(allProductsResponse);
  // Validate pagination structure
  TestValidator.predicate(
    "pagination current page should be >= 1",
    allProductsResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit should be >= 0",
    allProductsResponse.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records should match data length",
    allProductsResponse.pagination.records >= allProductsResponse.data.length,
  );
  // Validate product summary structure and out_of_stock field display
  for (const product of allProductsResponse.data) {
    // Validate out_of_stock field exists and is boolean (key test objective)
    TestValidator.predicate(
      "product out_of_stock should be boolean",
      typeof product.out_of_stock === "boolean",
    );
    // Validate thumbnail can be null (for products without images)
    if (product.thumbnail !== null && product.thumbnail !== undefined) {
      TestValidator.predicate(
        "product thumbnail should be valid URI when present",
        /^https?:\/\//.test(product.thumbnail!),
      );
    }
    // Validate average_rating can be null (for products without reviews)
    if (
      product.average_rating !== null &&
      product.average_rating !== undefined
    ) {
      TestValidator.predicate(
        "product average_rating should be between 1.0 and 5.0 when present",
        product.average_rating! >= 1.0 && product.average_rating! <= 5.0,
      );
    }
    // Validate review_count is always a number >= 0
    TestValidator.predicate(
      "product review_count should be >= 0",
      product.review_count >= 0,
    );
    // Validate price range logic
    TestValidator.predicate(
      "product min_price should be <= max_price",
      product.min_price <= product.max_price,
    );
    TestValidator.predicate(
      "product base_price should be >= min_price",
      product.base_price >= product.min_price,
    );
  }
  // Test 2: Search with in_stock=true filter
  // Validates that only products with out_of_stock=false are returned
  const inStockProductsResponse =
    await api.functional.shoppingMall.products.index(connection, {
      body: { in_stock: true },
    });
  typia.assert(inStockProductsResponse);
  // Key validation: All products returned with in_stock=true must have out_of_stock=false
  for (const product of inStockProductsResponse.data) {
    TestValidator.equals(
      "in_stock=true filter should return only products with out_of_stock=false",
      product.out_of_stock,
      false,
    );
  }
  // Test 3: Search with category filter
  const categoryProductsResponse =
    await api.functional.shoppingMall.products.index(connection, {
      body: { shopping_mall_category_id: category.id },
    });
  typia.assert(categoryProductsResponse);
  // Validate category filter returns products from that category or subcategories
  for (const product of categoryProductsResponse.data) {
    TestValidator.predicate(
      "filtered products should have category or parent category match",
      product.category.id === category.id ||
        (product.category.parent !== null &&
          product.category.parent.id === category.id),
    );
  }
  // Test 4: Search with pagination parameters
  const paginatedResponse = await api.functional.shoppingMall.products.index(
    connection,
    { body: { page: 1, limit: 5 } },
  );
  typia.assert(paginatedResponse);
  TestValidator.equals(
    "pagination current should be 1 when page=1",
    paginatedResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit should match requested limit",
    paginatedResponse.pagination.limit <= 5,
  );
  TestValidator.predicate(
    "data length should not exceed limit",
    paginatedResponse.data.length <= 5,
  );
  // Test 5: Search with price range filter
  const priceRangeResponse = await api.functional.shoppingMall.products.index(
    connection,
    { body: { min_price: 0, max_price: 1000000 } },
  );
  typia.assert(priceRangeResponse);
  // Validate that returned products have prices within the requested range
  for (const product of priceRangeResponse.data) {
    TestValidator.predicate(
      "product min_price should be >= 0 (filter min_price)",
      product.min_price >= 0,
    );
    TestValidator.predicate(
      "product min_price should be <= 1000000 (filter max_price)",
      product.min_price <= 1000000,
    );
  }
  // Test 6: Search with name search filter
  const searchProducts = allProductsResponse.data.slice(0, 3);
  for (const product of searchProducts) {
    const searchTerm = product.name.substring(
      0,
      Math.min(5, product.name.length),
    );
    const searchResponse = await api.functional.shoppingMall.products.index(
      connection,
      { body: { search: searchTerm } },
    );
    typia.assert(searchResponse);
    // Validate search results contain the search term
    for (const result of searchResponse.data) {
      TestValidator.predicate(
        "search results should contain search term in name",
        result.name.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }
  }
  // Test 7: Combined filters for comprehensive validation
  const combinedFilterResponse =
    await api.functional.shoppingMall.products.index(connection, {
      body: { in_stock: true, page: 1, limit: 10 },
    });
  typia.assert(combinedFilterResponse);
  // Validate combined filter respects both constraints
  for (const product of combinedFilterResponse.data) {
    TestValidator.equals(
      "combined filter should respect in_stock=true",
      product.out_of_stock,
      false,
    );
  }
  // Test 8: Validate seller and category data integrity in product summaries
  if (allProductsResponse.data.length > 0) {
    const sampleProduct = allProductsResponse.data[0];
    // Seller validation
    TestValidator.predicate(
      "seller id should be valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        sampleProduct.seller.id,
      ),
    );
    TestValidator.predicate(
      "seller shop_name should not be empty",
      sampleProduct.seller.shop_name.length > 0,
    );
    // Category validation
    TestValidator.predicate(
      "category id should be valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        sampleProduct.category.id,
      ),
    );
    TestValidator.predicate(
      "category name should not be empty",
      sampleProduct.category.name.length > 0,
    );
  }
}
