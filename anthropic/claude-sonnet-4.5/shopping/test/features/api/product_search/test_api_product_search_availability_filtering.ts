import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";

/**
 * Test product search functionality with multiple products and SKU variants.
 *
 * This test validates the product search API by creating multiple products with
 * different SKU variants and performing a search operation. It verifies that
 * the search API returns properly structured results with pagination.
 *
 * Note: The original scenario requested testing availability filtering based on
 * SKU inventory quantities, but the provided API does not support setting
 * inventory quantities during SKU creation (IShoppingMallSku.ICreate only has
 * sku_code and price). Therefore, this test focuses on basic product creation
 * and search functionality.
 *
 * Test Flow:
 *
 * 1. Create admin account and product category
 * 2. Create seller account for product management
 * 3. Create multiple products with different SKU variants
 * 4. Execute product search and validate results structure
 * 5. Verify pagination and data array structure
 */
export async function test_api_product_search_availability_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create admin account and authenticate
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.MinLength<8>>(),
        name: RandomGenerator.name(),
        role_level: "super_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create product category
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name: RandomGenerator.name(2),
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(category);

  // Step 3: Create seller account and authenticate
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.MinLength<8>>(),
        business_name: RandomGenerator.name(2),
        business_type: "LLC",
        contact_person_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        business_address: RandomGenerator.paragraph({ sentences: 3 }),
        tax_id: RandomGenerator.alphaNumeric(10),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // Step 4: Create Product A with multiple SKUs
  const productA: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        base_price: 100,
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(productA);

  // Create SKUs for Product A
  const skuA1: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: productA.id,
      body: {
        sku_code: RandomGenerator.alphaNumeric(8),
        price: 100,
      } satisfies IShoppingMallSku.ICreate,
    });
  typia.assert(skuA1);

  const skuA2: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: productA.id,
      body: {
        sku_code: RandomGenerator.alphaNumeric(8),
        price: 105,
      } satisfies IShoppingMallSku.ICreate,
    });
  typia.assert(skuA2);

  // Step 5: Create Product B with multiple SKUs
  const productB: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        base_price: 200,
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(productB);

  // Create SKUs for Product B
  const skuB1: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: productB.id,
      body: {
        sku_code: RandomGenerator.alphaNumeric(8),
        price: 200,
      } satisfies IShoppingMallSku.ICreate,
    });
  typia.assert(skuB1);

  const skuB2: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: productB.id,
      body: {
        sku_code: RandomGenerator.alphaNumeric(8),
        price: 210,
      } satisfies IShoppingMallSku.ICreate,
    });
  typia.assert(skuB2);

  // Step 6: Create Product C with multiple SKUs
  const productC: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        base_price: 300,
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(productC);

  // Create SKUs for Product C
  const skuC1: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: productC.id,
      body: {
        sku_code: RandomGenerator.alphaNumeric(8),
        price: 300,
      } satisfies IShoppingMallSku.ICreate,
    });
  typia.assert(skuC1);

  const skuC2: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: productC.id,
      body: {
        sku_code: RandomGenerator.alphaNumeric(8),
        price: 320,
      } satisfies IShoppingMallSku.ICreate,
    });
  typia.assert(skuC2);

  // Step 7: Execute product search
  const searchResults: IPageIShoppingMallProduct.ISummary =
    await api.functional.shoppingMall.products.index(connection, {
      body: {
        page: 1,
      } satisfies IShoppingMallProduct.IRequest,
    });
  typia.assert(searchResults);

  // Step 8: Validate pagination structure
  TestValidator.predicate(
    "search results pagination current page should be 1",
    searchResults.pagination.current === 1,
  );

  TestValidator.predicate(
    "search results pagination should have valid page count",
    searchResults.pagination.pages >= 0,
  );

  // Step 9: Validate search results data structure
  TestValidator.predicate(
    "search results should contain product data array",
    Array.isArray(searchResults.data),
  );

  TestValidator.predicate(
    "search results should contain at least the created products",
    searchResults.data.length >= 3,
  );
}
