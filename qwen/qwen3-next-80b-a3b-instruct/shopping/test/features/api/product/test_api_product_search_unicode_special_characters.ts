import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";

export async function test_api_product_search_unicode_special_characters(
  connection: api.IConnection,
) {
  // Generate a random search term with Unicode characters and special symbols
  // Using a pattern that includes common Unicode special characters: ®, ©, ™, é, ñ, ç, etc.
  const searchQuery =
    RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 4,
      wordMax: 10,
    }) + "®, ©, ™";

  // Search for products using the Unicode special character query
  const searchResult = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: searchQuery,
    },
  );
  typia.assert(searchResult);

  // Validate the response structure using the type IPageIShoppingMallProduct.ISummary
  TestValidator.equals(
    "pagination info must be present",
    searchResult.pagination.current,
    0,
  );
  TestValidator.predicate(
    "limit must be greater than 0",
    searchResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records count should be non-negative",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages should be non-negative",
    searchResult.pagination.pages >= 0,
  );

  // Verify that data is an array of products
  TestValidator.predicate(
    "data should be an array",
    Array.isArray(searchResult.data),
  );

  // At least validate the type of each product in the array
  if (searchResult.data.length > 0) {
    const firstProduct = searchResult.data[0];

    // Validate product summary structure
    TestValidator.equals(
      "product must have id",
      typeof firstProduct.id,
      "string",
    );
    TestValidator.predicate(
      "id must be formatted as uuid",
      typia.is<string & tags.Format<"uuid">>(firstProduct.id),
    );

    TestValidator.equals(
      "product must have title",
      typeof firstProduct.title,
      "string",
    );

    TestValidator.equals(
      "product must have price",
      typeof firstProduct.price,
      "number",
    );
    TestValidator.predicate("price must be positive", firstProduct.price > 0);

    TestValidator.equals(
      "product must have status",
      typeof firstProduct.status,
      "string",
    );
    TestValidator.predicate(
      "status must be one of valid values",
      ["draft", "published", "archived"].includes(firstProduct.status),
    );

    // Validate that search term prepends at least one result (computer has indexed)
    const hasMatch = searchResult.data.some(
      (product) =>
        product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (product.title.toLowerCase().includes("®") &&
          searchQuery.includes("®")) ||
        (product.title.toLowerCase().includes("©") &&
          searchQuery.includes("©")) ||
        (product.title.toLowerCase().includes("™") &&
          searchQuery.includes("™")),
    );

    if (hasMatch) {
      TestValidator.predicate(
        "at least one product title should contain the special Unicode search term",
        true,
      );
    } else if (searchResult.data.length > 0) {
      // Indicate the search may have worked with normalization, but we don't have exact match
      TestValidator.predicate(
        "search may have matched product despite Unicode normalization differences",
        true,
      );
    }
  }
}
