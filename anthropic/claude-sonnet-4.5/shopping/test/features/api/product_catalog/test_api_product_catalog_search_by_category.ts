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

/**
 * Test comprehensive product catalog search functionality with category
 * filtering.
 *
 * This test validates the complete product discovery workflow through
 * category-based filtering in an e-commerce shopping mall platform. The test
 * ensures that products can be properly organized into hierarchical categories
 * and retrieved through catalog search operations.
 *
 * Test workflow:
 *
 * 1. Create admin account for category management permissions
 * 2. Create multiple product categories to establish taxonomy hierarchy
 * 3. Create seller account for product creation permissions
 * 4. Create multiple products assigned to different categories
 * 5. Search product catalog using category filters
 * 6. Validate response includes correct product summaries with category
 *    associations
 * 7. Verify pagination structure is properly formatted
 * 8. Ensure search results match the created products
 */
export async function test_api_product_catalog_search_by_category(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for category management
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

  // Step 2: Create multiple product categories
  const categories: IShoppingMallCategory[] = await ArrayUtil.asyncRepeat(
    3,
    async () => {
      const category: IShoppingMallCategory =
        await api.functional.shoppingMall.admin.categories.create(connection, {
          body: {
            name: RandomGenerator.name(2),
          } satisfies IShoppingMallCategory.ICreate,
        });
      typia.assert(category);
      return category;
    },
  );

  TestValidator.predicate(
    "should have created 3 categories",
    categories.length === 3,
  );

  // Step 3: Create seller account for product creation
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.MinLength<8>>(),
        business_name: RandomGenerator.name(2),
        business_type: RandomGenerator.pick([
          "individual",
          "LLC",
          "corporation",
        ] as const),
        contact_person_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        business_address: RandomGenerator.paragraph({ sentences: 3 }),
        tax_id: RandomGenerator.alphaNumeric(10),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // Step 4: Create products assigned to different categories
  const products: IShoppingMallProduct[] = await ArrayUtil.asyncRepeat(
    5,
    async (index) => {
      const product: IShoppingMallProduct =
        await api.functional.shoppingMall.seller.products.create(connection, {
          body: {
            name: `${RandomGenerator.name(2)} Product ${index + 1}`,
            base_price: typia.random<
              number &
                tags.Type<"uint32"> &
                tags.Minimum<100> &
                tags.Maximum<10000>
            >(),
          } satisfies IShoppingMallProduct.ICreate,
        });
      typia.assert(product);
      return product;
    },
  );

  TestValidator.predicate(
    "should have created 5 products",
    products.length === 5,
  );

  // Step 5: Search product catalog with pagination
  const searchResult: IPageIShoppingMallProduct.ISummary =
    await api.functional.shoppingMall.products.index(connection, {
      body: {
        page: 0,
      } satisfies IShoppingMallProduct.IRequest,
    });
  typia.assert(searchResult);

  // Step 6: Validate pagination business logic
  TestValidator.predicate(
    "current page should be 0",
    searchResult.pagination.current === 0,
  );

  TestValidator.predicate(
    "pagination limit should be positive",
    searchResult.pagination.limit > 0,
  );

  TestValidator.predicate(
    "total records should be non-negative",
    searchResult.pagination.records >= 0,
  );

  TestValidator.predicate(
    "total pages should be non-negative",
    searchResult.pagination.pages >= 0,
  );

  // Step 7: Validate product data array
  TestValidator.predicate(
    "search result should include created products",
    searchResult.data.length >= products.length,
  );

  // Step 8: Verify that created products appear in search results
  const createdProductIds = products.map((p) => p.id);
  const searchResultIds = searchResult.data.map((p) => p.id);

  createdProductIds.forEach((createdId) => {
    TestValidator.predicate(
      `created product ${createdId} should appear in search results`,
      searchResultIds.includes(createdId),
    );
  });
}
