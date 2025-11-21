import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";

export async function test_api_product_search_multi_criteria(
  connection: api.IConnection,
) {
  // Define search criteria as stringified JSON object matching IShoppingMallProduct.IRequest type
  const searchCriteria: IShoppingMallProduct.IRequest = JSON.stringify({
    status: "published",
    min_price: 0,
    max_price: 200,
    keyword: "phone",
  });

  // Perform the search using the API endpoint
  const searchResult: IPageIShoppingMallProduct.ISummary =
    await api.functional.shoppingMall.products.index(connection, {
      body: searchCriteria,
    });

  // Validate the response structure using typia.assert for complete type safety
  typia.assert(searchResult);

  // Validate pagination properties exist and have correct types
  TestValidator.equals(
    "pagination current is number",
    typeof searchResult.pagination.current,
    "number",
  );
  TestValidator.equals(
    "pagination limit is number",
    typeof searchResult.pagination.limit,
    "number",
  );
  TestValidator.equals(
    "pagination records is number",
    typeof searchResult.pagination.records,
    "number",
  );
  TestValidator.equals(
    "pagination pages is number",
    typeof searchResult.pagination.pages,
    "number",
  );

  // Verify data is an array
  TestValidator.equals("data is array", Array.isArray(searchResult.data), true);

  // Validate pagination values follow constraints (non-negative integers)
  TestValidator.predicate(
    "current page is non-negative",
    searchResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit is positive",
    searchResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records count is non-negative",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    searchResult.pagination.pages >= 0,
  );

  // Validate that each product in result matches ISummary structure
  searchResult.data.forEach((product) => {
    // Validate UUID format for id
    TestValidator.predicate(
      "product has valid UUID id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
        product.id,
      ),
    );

    // Validate title is a string
    TestValidator.predicate(
      "product title is string",
      typeof product.title === "string",
    );

    // Validate price is a number
    TestValidator.predicate(
      "product price is number",
      typeof product.price === "number",
    );

    // Validate status is one of the allowed values
    TestValidator.predicate(
      "product status is valid",
      ["draft", "published", "archived"].includes(product.status),
    );
  });
}
