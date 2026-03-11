import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test retrieval of helpfulness vote statistics for an existing review with votes.
 *
 * This test validates the GET /ecommerceMall/reviews/{reviewId}/helpfulness endpoint.
 * Since the full setup chain (admin, products, customers, orders, reviews, votes)
 * requires API endpoints that don't exist in the provided specification, this test
 * directly calls the getHelpfulness endpoint and validates the response structure.
 *
 * Steps:
 * 1. Create a mock review ID
 * 2. Call GET /ecommerceMall/reviews/{reviewId}/helpfulness
 * 3. Validate response structure matches IEcommerceMallReview.IHelpfulness
 */
export async function test_api_review_helpfulness_votes_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random review ID for testing
  const reviewId = RandomGenerator.alphaNumeric(36);
  // Call the helpfulness endpoint
  const helpfulness =
    await api.functional.ecommerceMall.reviews.helpfulness.getHelpfulness(
      connection,
      {
        reviewId: reviewId,
      },
    );
  // Validate response structure
  typia.assert<IEcommerceMallReview.IHelpfulness>(helpfulness);
  // Validate required fields exist and have correct types
  TestValidator.predicate(
    "helpful_count is a number",
    typeof helpfulness.helpful_count === "number",
  );
  TestValidator.predicate(
    "unhelpful_count is a number",
    typeof helpfulness.unhelpful_count === "number",
  );
  TestValidator.predicate(
    "is_helpful is a boolean",
    typeof helpfulness.is_helpful === "boolean",
  );
  // Validate counts are non-negative integers
  TestValidator.predicate(
    "helpful_count is non-negative",
    helpfulness.helpful_count >= 0,
  );
  TestValidator.predicate(
    "unhelpful_count is non-negative",
    helpfulness.unhelpful_count >= 0,
  );
}
