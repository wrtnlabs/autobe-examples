import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_product_search_without_variants_unavailable(
  connection: api.IConnection,
): Promise<void> {
  // Test product search functionality with various filters
  // Products without variants should appear in search with base_price as min/max
  // 1. Basic search - retrieve all products
  const allProducts = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: {
        limit: 20,
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(allProducts);
  // Validate pagination structure
  TestValidator.predicate(
    "has pagination info",
    allProducts.pagination !== undefined,
  );
  TestValidator.predicate(
    "current page >= 1",
    allProducts.pagination.current >= 1,
  );
  TestValidator.predicate("limit > 0", allProducts.pagination.limit > 0);
  TestValidator.predicate("records >= 0", allProducts.pagination.records >= 0);
  TestValidator.predicate("pages >= 0", allProducts.pagination.pages >= 0);
  // Validate product summary structure for each product
  for (const product of allProducts.data) {
    TestValidator.predicate(
      "min price is number",
      typeof product.min === "number",
    );
    TestValidator.predicate(
      "max price is number",
      typeof product.max === "number",
    );
    TestValidator.predicate("min <= max", product.min <= product.max);
  }
  // 2. Search by name query
  const searchTerm = RandomGenerator.alphabets(5);
  const searchedProducts = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: {
        search: searchTerm,
        limit: 10,
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(searchedProducts);
  TestValidator.predicate(
    "search returns valid pagination",
    searchedProducts.pagination !== undefined,
  );
  // 3. Test price range filtering
  const minPrice = 1000;
  const maxPrice = 100000;
  const priceFiltered = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: {
        min_price: minPrice,
        max_price: maxPrice,
        limit: 15,
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(priceFiltered);
  // Validate all returned products match price filter
  for (const product of priceFiltered.data) {
    TestValidator.predicate(
      "product min price >= filter min",
      product.min >= minPrice,
    );
    TestValidator.predicate(
      "product max price <= filter max",
      product.max <= maxPrice,
    );
  }
  // 4. Test sorting by price ascending
  const sortedAsc = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: {
        sort: "priceAsc",
        limit: 10,
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(sortedAsc);
  // Verify ascending order
  if (sortedAsc.data.length > 1) {
    for (let i = 1; i < sortedAsc.data.length; i++) {
      TestValidator.predicate(
        "prices sorted ascending",
        sortedAsc.data[i - 1].min <= sortedAsc.data[i].min,
      );
    }
  }
  // 5. Test sorting by price descending
  const sortedDesc = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: {
        sort: "priceDesc",
        limit: 10,
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(sortedDesc);
  // Verify descending order
  if (sortedDesc.data.length > 1) {
    for (let i = 1; i < sortedDesc.data.length; i++) {
      TestValidator.predicate(
        "prices sorted descending",
        sortedDesc.data[i - 1].max >= sortedDesc.data[i].max,
      );
    }
  }
  // 6. Test sorting by newest
  const sortedNewest = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: {
        sort: "newest",
        limit: 10,
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(sortedNewest);
  // 7. Test in_stock filter
  const inStockOnly = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: {
        in_stock: true,
        limit: 10,
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(inStockOnly);
  // 8. Test page-based pagination
  const page1 = await api.functional.shoppingMall.products.index(connection, {
    body: {
      limit: 5,
      page: 1,
    } satisfies IShoppingMallProduct.IRequest,
  });
  typia.assert(page1);
  TestValidator.equals("page 1 current", page1.pagination.current, 1);
  // Get page 2 if there are more pages
  if (page1.pagination.pages > 1) {
    const page2 = await api.functional.shoppingMall.products.index(connection, {
      body: {
        limit: 5,
        page: 2,
      } satisfies IShoppingMallProduct.IRequest,
    });
    typia.assert(page2);
    TestValidator.equals("page 2 current", page2.pagination.current, 2);
    TestValidator.predicate("page 2 has data", page2.data.length >= 0);
  }
  // 9. Test combined filters
  const combinedFilters = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: {
        search: RandomGenerator.alphabets(3),
        min_price: 500,
        max_price: 50000,
        in_stock: true,
        sort: "priceAsc",
        limit: 10,
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(combinedFilters);
  // Validate combined filter results
  for (const product of combinedFilters.data) {
    TestValidator.predicate(
      "combined filter: min price >= 500",
      product.min >= 500,
    );
    TestValidator.predicate(
      "combined filter: max price <= 50000",
      product.max <= 50000,
    );
  }
  // 10. Test maximum limit
  const maxLimitProducts = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: {
        limit: 100,
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(maxLimitProducts);
  TestValidator.predicate(
    "max limit returns <= 100 products",
    maxLimitProducts.data.length <= 100,
  );
  // 11. Test minimum limit
  const minLimitProducts = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: {
        limit: 1,
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(minLimitProducts);
  TestValidator.predicate(
    "min limit returns <= 1 product",
    minLimitProducts.data.length <= 1,
  );
}
