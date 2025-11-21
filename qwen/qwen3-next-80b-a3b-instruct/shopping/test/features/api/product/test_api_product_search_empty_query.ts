import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";

export async function test_api_product_search_empty_query(
  connection: api.IConnection,
) {
  // Test that an empty search query returns all published products with default pagination (limit=10) and relevance sorting
  // This endpoint is a search endpoint (PATCH /shoppingMall/products) that accepts an empty string to retrieve all products

  // Perform the search with empty query
  const result: IPageIShoppingMallProduct.ISummary =
    await api.functional.shoppingMall.products.index(connection, {
      body: "" satisfies IShoppingMallProduct.IRequest,
    });

  // Validate response structure with type safety
  typia.assert(result);

  // Validate pagination metadata matches default expectations
  TestValidator.equals("default page is 1", result.pagination.current, 1);
  TestValidator.equals("default limit is 10", result.pagination.limit, 10);
  TestValidator.predicate(
    "total pages is at least 1",
    result.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "total records is non-negative",
    result.pagination.records >= 0,
  );

  // Validate products are published and have correct structure
  TestValidator.predicate(
    "products array is not empty",
    result.data.length > 0,
  );
  TestValidator.predicate(
    "all products are published",
    result.data.every((product) => product.status === "published"),
  );

  // Validate product summary properties
  result.data.forEach((product) => {
    TestValidator.predicate(
      "id is valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
        product.id,
      ),
    );
    TestValidator.predicate(
      "title exists and is a non-empty string",
      typeof product.title === "string" && product.title.length > 0,
    );
    TestValidator.predicate(
      "price is a positive number",
      typeof product.price === "number" && product.price > 0,
    );
    TestValidator.equals("status is published", product.status, "published");
  });

  // Validate relevance sorting is consistent
  // Make two consecutive calls with empty query to verify consistent ordering
  const firstResult = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: "" satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(firstResult);

  const secondResult = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: "" satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(secondResult);

  // If products exist, verify first product ID is consistent between calls
  if (firstResult.data.length > 0 && secondResult.data.length > 0) {
    TestValidator.equals(
      "relevance sorting is consistent",
      firstResult.data[0].id,
      secondResult.data[0].id,
    );
  }
}
