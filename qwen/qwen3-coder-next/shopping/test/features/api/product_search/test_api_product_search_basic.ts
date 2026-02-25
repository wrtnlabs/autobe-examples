import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_product_search_basic(
  connection: api.IConnection,
): Promise<void> {
  // 1. Search for all products with pagination
  const allProducts = await api.functional.shoppingMall.search.products.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
      },
    },
  );
  typia.assert(allProducts);
  // 2. Verify pagination structure
  TestValidator.equals("pagination exists", allProducts.pagination.current, 1);
  TestValidator.equals(
    "pagination has records",
    allProducts.pagination.records >= 0,
    true,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    allProducts.pagination.pages >= 0,
  );
  // 3. Search with category filter
  if (allProducts.data.length > 0) {
    const category = allProducts.data[0].category;
    const byCategory = await api.functional.shoppingMall.search.products.index(
      connection,
      {
        body: {
          category_id: category.id,
          page: 1,
          limit: 5,
        },
      },
    );
    typia.assert(byCategory);
    // Verify category filter works
    TestValidator.predicate(
      "all products match category",
      byCategory.data.every((p) => p.category.id === category.id),
    );
  }
  // 4. Search with price range
  const priceRange = await api.functional.shoppingMall.search.products.index(
    connection,
    {
      body: {
        min_price: 0,
        max_price: 1000000,
        page: 1,
        limit: 10,
      },
    },
  );
  typia.assert(priceRange);
  // 5. Search with in-stock filter
  const inStock = await api.functional.shoppingMall.search.products.index(
    connection,
    {
      body: {
        in_stock_only: true,
        page: 1,
        limit: 10,
      },
    },
  );
  typia.assert(inStock);
  // 6. Verify results structure
  for (const product of allProducts.data) {
    typia.assert(product);
    TestValidator.equals("product has id", typeof product.id, "string");
    TestValidator.equals("product has name", typeof product.name, "string");
    TestValidator.predicate(
      "price is valid",
      typeof product.base_price === "number",
    );
    TestValidator.equals("seller exists", product.seller !== null, true);
    TestValidator.equals("category exists", product.category !== null, true);
    TestValidator.equals(
      "rating is valid",
      product.average_rating >= 0 && product.average_rating <= 5,
      true,
    );
  }
}