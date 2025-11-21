import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";

export async function test_api_product_search_zero_limit(
  connection: api.IConnection,
) {
  // Construct request body as string with limit: 0 as specified in scenario
  const requestBody = JSON.stringify({
    limit: 0, // Zero limit to test system behavior
    offset: 0, // Base offset
  }) satisfies IShoppingMallProduct.IRequest;

  // Verify the request body was properly constructed
  TestValidator.equals(
    "request body contains proper JSON structure",
    requestBody,
    JSON.stringify({ limit: 0, offset: 0 }),
  );

  // Execute the search request
  const response = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: requestBody,
    },
  );
  typia.assert(response);

  // Validate that system used default limit of 10 when zero limit was provided
  TestValidator.equals(
    "pagination limit should be 10 (default)",
    10,
    response.pagination.limit,
  );
  TestValidator.predicate(
    "pagination records should be at least 10",
    response.pagination.records >= 10,
  );
  TestValidator.equals(
    "response data should have exactly 10 products",
    10,
    response.data.length,
  );

  // Ensure all products in response have valid ISummary structure
  response.data.forEach((product) => {
    TestValidator.equals(
      "product id is valid UUID",
      true,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
        product.id,
      ),
    );
    TestValidator.predicate(
      "product title is string",
      typeof product.title === "string" && product.title.length > 0,
    );
    TestValidator.predicate(
      "product price is number",
      typeof product.price === "number" && product.price >= 0,
    );
    TestValidator.predicate(
      "product status is one of valid values",
      ["draft", "published", "archived"].includes(product.status),
    );
  });
}
