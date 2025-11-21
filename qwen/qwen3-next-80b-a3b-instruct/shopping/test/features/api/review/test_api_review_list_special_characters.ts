import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";

export async function test_api_review_list_special_characters(
  connection: api.IConnection,
) {
  // Test with special characters in product_id filter value (e.g., &, space, ")
  // Verify that URL encoding is properly handled and special characters don't break the query
  // The IRequest type is string, which contains JSON stringified search parameters
  // All special characters are properly escaped via JSON.stringify

  // Test cases for different special characters
  const specialCharacters = [
    "&", // Ampersand - URI query delimiter
    " ", // Space - should be percent-encoded
    '"', // Double quote - JSON string delimiter
    "\u0000", // Null byte - potential injection risk
    "\u0001", // Start of header
  ];

  for (const specialChar of specialCharacters) {
    // Generate a unique product_id with the special character
    const productWithSpecialChars = `product_123${specialChar}456`;

    // Create the request object and convert to stringified JSON
    // This ensures proper JSON escaping of special characters
    const requestBody = JSON.stringify({ product_id: productWithSpecialChars });

    // Call the API to list reviews with special character in product_id
    // The server must decode the JSON and handle special characters properly
    const result: IPageIShoppingMallReview.ISummary =
      await api.functional.shoppingMall.reviews.index(connection, {
        body: requestBody,
      });

    // Validate that the response is successfully returned with proper structure
    typia.assert(result);

    // Verify pagination information is present and valid
    TestValidator.predicate(
      "pagination exists for character: " + specialChar,
      result.pagination !== undefined,
    );
    TestValidator.predicate(
      "pagination current is >= 1 for character: " + specialChar,
      result.pagination.current >= 1,
    );
    TestValidator.predicate(
      "pagination limit is > 0 for character: " + specialChar,
      result.pagination.limit > 0,
    );
    TestValidator.predicate(
      "pagination records is >= 0 for character: " + specialChar,
      result.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pagination pages is >= 1 for character: " + specialChar,
      result.pagination.pages >= 1,
    );

    // Verify that data array exists and is an array
    TestValidator.predicate(
      "data array exists for character: " + specialChar,
      Array.isArray(result.data),
    );

    // Verify each review summary in the data array is a string (as per IShoppingMallReview.ISummary = string)
    for (const review of result.data) {
      TestValidator.predicate(
        "review is string for character: " + specialChar,
        typeof review === "string",
      );
    }
  }
}
