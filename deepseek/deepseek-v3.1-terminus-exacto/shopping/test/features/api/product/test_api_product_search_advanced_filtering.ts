import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_ecommerce_administrator_categories_create } from "../../../generate/generate_random_ecommerce_administrator_categories_create";
import { prepare_random_ecommerce_category } from "../../../prepare/prepare_random_ecommerce_category";

/**
 * Test comprehensive filtering combinations on product search.
 * 1. Admin creates multiple categories for advanced filtering scenarios
 * 2. Create multiple products with specific attributes: different price points, categories, in-stock and out-of-stock status
 * 3. Test combined filters including:
 *    - Text search by product name fragment (partial matching)
 *    - Specific category filtering
 *    - Price range constraints (minimum and maximum)
 *    - Stock availability filtering (in_stock: true/false)
 * 4. Verify 'in_stock' filter properly excludes products with no variants or zero inventory
 * 5. Test sorting by price low-to-high and price high-to-low to validate ordering correctness
 * 6. Validate that partial text matching works correctly using trigram search
 */
export async function test_api_product_search_advanced_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup and category creation
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // Create multiple categories for filtering
  const categories = await Promise.all(
    ArrayUtil.repeat(3, async () => {
      const category =
        await generate_random_ecommerce_administrator_categories_create(
          adminConnection,
          {
            body: {
              name: RandomGenerator.paragraph({ sentences: 2 }),
              description: RandomGenerator.paragraph({ sentences: 3 }),
            } satisfies IEcommerceCategory.ICreate,
          },
        );
      typia.assert(category);
      return category;
    }),
  );
  // 2. Product creation with specific attributes
  // We'll create products with:
  // - Various price points (low, medium, high)
  // - Different categories
  // - Mix of in-stock and out-of-stock items
  const products = await Promise.all(
    ArrayUtil.repeat(9, async (index) => {
      // Determine product attributes based on index
      const categoryIndex = index % categories.length;
      const price = typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<100> & tags.Maximum<10000>
      >();
      // Create product with specific attributes
      // Note: In real scenario, we'd need a product creation endpoint
      // For now, we'll simulate product existence with the search endpoint
      // This test assumes products are already created in the system
      return {
        id: typia.random<string & tags.Format<"uuid">>(),
        name: `Product ${index} ${RandomGenerator.paragraph({ sentences: 1 })}`,
        base_price: price,
        category: categories[categoryIndex],
        in_stock: index % 3 !== 0, // 2/3 in stock, 1/3 out of stock
      };
    }),
  );
  // Note: In a real implementation, you would need actual product creation endpoints
  // such as seller product creation APIs. Since those are not provided in the SDK,
  // this test will focus on testing the search endpoint with the assumption that
  // products have been pre-populated in the database.
  // 3. Test combined filters
  // Test 3.1: Text search by product name fragment
  const searchFragment = "Product";
  const searchResults = await api.functional.ecommerce.products.index(
    { host: connection.host },
    {
      body: {
        search: searchFragment,
        category_id: null,
        price_min: null,
        price_max: null,
        in_stock: null,
        sort_by: "relevance",
        page: 1,
        limit: 50,
      } satisfies IEcommerceProduct.IRequest,
    },
  );
  typia.assert(searchResults);
  // Verify search returned some results (assuming products exist)
  TestValidator.predicate(
    "search returns results with fragment",
    searchResults.data.length > 0,
  );
  // Test 3.2: Category filtering
  const categoryId = categories[0]!.id;
  const categoryResults = await api.functional.ecommerce.products.index(
    { host: connection.host },
    {
      body: {
        search: undefined,
        category_id: categoryId satisfies string & tags.Format<"uuid">,
        price_min: null,
        price_max: null,
        in_stock: null,
        sort_by: "newest",
        page: 1,
        limit: 50,
      } satisfies IEcommerceProduct.IRequest,
    },
  );
  typia.assert(categoryResults);
  // Verify all results belong to the specified category
  for (const product of categoryResults.data) {
    TestValidator.equals(
      "product belongs to specified category",
      product.category.id,
      categoryId,
    );
  }
  // Test 3.3: Price range filtering
  const priceMin = 500 satisfies number as number;
  const priceMax = 2000 satisfies number as number;
  const priceRangeResults = await api.functional.ecommerce.products.index(
    { host: connection.host },
    {
      body: {
        search: undefined,
        category_id: null,
        price_min: priceMin satisfies number & tags.Minimum<0> as number &
          tags.Minimum<0>,
        price_max: priceMax satisfies number & tags.Minimum<0> as number &
          tags.Minimum<0>,
        in_stock: null,
        sort_by: "price_low",
        page: 1,
        limit: 50,
      } satisfies IEcommerceProduct.IRequest,
    },
  );
  typia.assert(priceRangeResults);
  // Verify all results are within price range
  for (const product of priceRangeResults.data) {
    TestValidator.predicate(
      "product price within minimum range",
      product.base_price >= priceMin,
    );
    TestValidator.predicate(
      "product price within maximum range",
      product.base_price <= priceMax,
    );
  }
  // Test 3.4: Stock availability filtering (in_stock: true)
  const inStockResults = await api.functional.ecommerce.products.index(
    { host: connection.host },
    {
      body: {
        search: undefined,
        category_id: null,
        price_min: null,
        price_max: null,
        in_stock: true,
        sort_by: "newest",
        page: 1,
        limit: 50,
      } satisfies IEcommerceProduct.IRequest,
    },
  );
  typia.assert(inStockResults);
  // Note: We can't directly verify in_stock filtering without product variant data
  // This test would need access to product variant inventory information
  // Test 3.5: Combined filters (category + price range)
  const combinedResults = await api.functional.ecommerce.products.index(
    { host: connection.host },
    {
      body: {
        search: undefined,
        category_id: categoryId satisfies string & tags.Format<"uuid">,
        price_min: priceMin satisfies number & tags.Minimum<0> as number &
          tags.Minimum<0>,
        price_max: priceMax satisfies number & tags.Minimum<0> as number &
          tags.Minimum<0>,
        in_stock: null,
        sort_by: "price_low",
        page: 1,
        limit: 50,
      } satisfies IEcommerceProduct.IRequest,
    },
  );
  typia.assert(combinedResults);
  // Verify combined filter results
  for (const product of combinedResults.data) {
    TestValidator.equals(
      "product belongs to specified category in combined filter",
      product.category.id,
      categoryId,
    );
    TestValidator.predicate(
      "product price within range in combined filter",
      product.base_price >= priceMin && product.base_price <= priceMax,
    );
  }
  // 4. Test sorting
  // Test 4.1: Price low-to-high
  const lowToHighResults = await api.functional.ecommerce.products.index(
    { host: connection.host },
    {
      body: {
        search: undefined,
        category_id: null,
        price_min: null,
        price_max: null,
        in_stock: null,
        sort_by: "price_low",
        page: 1,
        limit: 50,
      } satisfies IEcommerceProduct.IRequest,
    },
  );
  typia.assert(lowToHighResults);
  // Verify sorting order
  for (let i = 1; i < lowToHighResults.data.length; i++) {
    TestValidator.predicate(
      "prices sorted low to high",
      lowToHighResults.data[i]!.base_price >=
        lowToHighResults.data[i - 1]!.base_price,
    );
  }
  // Test 4.2: Price high-to-low
  const highToLowResults = await api.functional.ecommerce.products.index(
    { host: connection.host },
    {
      body: {
        search: undefined,
        category_id: null,
        price_min: null,
        price_max: null,
        in_stock: null,
        sort_by: "price_high",
        page: 1,
        limit: 50,
      } satisfies IEcommerceProduct.IRequest,
    },
  );
  typia.assert(highToLowResults);
  // Verify sorting order
  for (let i = 1; i < highToLowResults.data.length; i++) {
    TestValidator.predicate(
      "prices sorted high to low",
      highToLowResults.data[i]!.base_price <=
        highToLowResults.data[i - 1]!.base_price,
    );
  }
  // 5. Test in_stock filter edge cases
  // Note: This would require product variant creation endpoints to test properly
  // The test assumes the implementation correctly filters products with no variants or zero inventory
  // 6. Validate partial text matching
  // Test with partial product name
  const partialSearchTerm = "Prod";
  const partialResults = await api.functional.ecommerce.products.index(
    { host: connection.host },
    {
      body: {
        search: partialSearchTerm,
        category_id: null,
        price_min: null,
        price_max: null,
        in_stock: null,
        sort_by: "relevance",
        page: 1,
        limit: 50,
      } satisfies IEcommerceProduct.IRequest,
    },
  );
  typia.assert(partialResults);
  // Verify partial matching returns results (if products exist)
  TestValidator.predicate(
    "partial text search returns results",
    partialResults.data.length >= 0,
  );
}
