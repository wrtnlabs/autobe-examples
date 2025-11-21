import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";

export async function test_api_product_search_huge_page_number(
  connection: api.IConnection,
) {
  // Test product search with extremely high page number (10000) to ensure
  // system returns empty data array with correct pagination metadata
  // instead of failing or causing performance degradation

  // According to the DTO definition in the provided materials,
  // IShoppingMallProduct.IRequest must be a string type.
  // This indicates the API expects a URL query params string format.
  // We will construct a query string with page=10000 and limit=10
  const request: IShoppingMallProduct.IRequest =
    `page=10000&limit=10` satisfies IShoppingMallProduct.IRequest;

  const response: IPageIShoppingMallProduct.ISummary =
    await api.functional.shoppingMall.products.index(connection, {
      body: request,
    });

  typia.assert(response);

  // Validate that data array is empty for non-existent page
  TestValidator.equals(
    "data array should be empty for page 10000",
    response.data.length,
    0,
  );

  // Validate that pagination metadata is correct in response
  // According to the API specification, the response includes pagination metadata
  TestValidator.equals(
    "pagination should show page capacity is 10",
    response.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    response.pagination.records >= 0,
  );

  // For a non-existent page (10000), pagination.current should reflect the requested page
  TestValidator.equals(
    "pagination should reflect requested page 10000",
    response.pagination.current,
    10000,
  );
}
