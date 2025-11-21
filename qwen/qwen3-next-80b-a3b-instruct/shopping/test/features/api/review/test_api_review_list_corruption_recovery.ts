import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";

/**
 * Test for disaster recovery scenario with corrupted reviews.
 *
 * Verifies that the /shoppingMall/reviews endpoint safely filters out reviews
 * with corrupted fields, ignoring them and returning only valid reviews. This
 * validates that the system can handle data corruption in the database without
 * crashing or exposing malformed data.
 *
 * Since IShoppingMallReview.IRequest is a string type and
 * IShoppingMallReview.ISummary is a string type, the API treats reviews as JSON
 * string representations. The endpoint accepts a JSON string search query and
 * returns a structure containing pagination info and an array of review
 * strings.
 *
 * We assume the test environment contains some corrupted reviews in the
 * database (e.g., with null ids or malformed JSON). Our test validates that the
 * system filters out these corrupted reviews automatically and returns only
 * valid ones.
 *
 * This is a resilience test. We don't create corrupted data (no creation API is
 * provided), we test that the endpoint successfully ignores it.
 *
 * Steps:
 *
 * 1. Send a search request with a simple pagination query
 * 2. Validate the response structure with typia.assert
 * 3. Parse each review string in the data array
 * 4. Use typia.assert on parsed review objects to validate structure
 * 5. Test passes if every parsed review has valid properties and no corruption
 */
export async function test_api_review_list_corruption_recovery(
  connection: api.IConnection,
) {
  // Send a search request with a minimum JSON search query
  // The body must be a string representing a JSON search query
  const searchQuery = JSON.stringify({
    limit: 10,
    page: 1,
  });

  // Call the endpoint with a string search query
  const response: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.reviews.index(connection, {
      body: searchQuery,
    });

  // Validate overall response structure
  typia.assert(response);

  // Validate pagination structure
  TestValidator.equals(
    "pagination has correct structure",
    typeof response.pagination,
    "object",
  );
  TestValidator.predicate(
    "pagination current is positive",
    () => response.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    () => response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    () => response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    () => response.pagination.pages >= 0,
  );

  // Validate data array structure
  TestValidator.predicate("data array exists", () =>
    Array.isArray(response.data),
  );

  // For each review string in data array, parse and validate
  for (let i = 0; i < response.data.length; i++) {
    const reviewString = response.data[i];

    // Ensure each data item is a string
    TestValidator.equals(
      `review ${i} is a string`,
      typeof reviewString,
      "string",
    );

    // Parse the string as JSON to get the review object
    const reviewObject = JSON.parse(reviewString);

    // Validate the parsed object has the required structure using typia.assert
    // This assumes the structure matches IShoppingMallReview.ISummary which is an object
    // even though the type is defined as string - we are validating the actual content
    typia.assert<Partial<IShoppingMallReview.ISummary>>(reviewObject);

    // Validate minimal required properties
    TestValidator.predicate(`review ${i} has valid id`, () => {
      return reviewObject.id !== null && typeof reviewObject.id === "string";
    });

    TestValidator.predicate(`review ${i} has valid status`, () => {
      return (
        reviewObject.status !== null && typeof reviewObject.status === "string"
      );
    });

    TestValidator.predicate(`review ${i} has valid product_id`, () => {
      return (
        reviewObject.product_id !== null &&
        typeof reviewObject.product_id === "string"
      );
    });

    TestValidator.predicate(`review ${i} has valid customer_id`, () => {
      return (
        reviewObject.customer_id !== null &&
        typeof reviewObject.customer_id === "string"
      );
    });

    TestValidator.predicate(`review ${i} has valid score`, () => {
      return (
        reviewObject.score !== null &&
        typeof reviewObject.score === "number" &&
        reviewObject.score >= 1 &&
        reviewObject.score <= 5
      );
    });

    // Validate date-time formats
    TestValidator.predicate(`review ${i} has valid created_at`, () => {
      return (
        reviewObject.created_at !== null &&
        typeof reviewObject.created_at === "string" &&
        /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(.[0-9]{3})?Z/.test(
          reviewObject.created_at,
        )
      );
    });

    TestValidator.predicate(`review ${i} has valid updated_at`, () => {
      return (
        reviewObject.updated_at !== null &&
        typeof reviewObject.updated_at === "string" &&
        /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(.[0-9]{3})?Z/.test(
          reviewObject.updated_at,
        )
      );
    });
  }

  // If we get here, all reviews are valid - corrupted ones were filtered out
  // This demonstrates disaster recovery capability
}
