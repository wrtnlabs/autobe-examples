import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test review retrieval when the review ID does not exist.
 * Prerequisites: None required - this tests the error case for a non-existent review ID.
 * Attempt to retrieve a review using a reviewId that was never created (use a UUID that doesn't exist in the system).
 * Validate that the endpoint returns an appropriate error response indicating the review was not found (HTTP 404 or similar business error).
 * Verify that no sensitive data is leaked in the error response.
 */
export async function test_api_review_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random UUID that doesn't exist in the system
  const nonExistentReviewId = typia.random<string & tags.Format<"uuid">>();
  // Verify that attempting to retrieve a non-existent review throws an error
  await TestValidator.error(
    "non-existent review should return error",
    async () => {
      await api.functional.ecommerceMall.reviews.at(connection, {
        reviewId: nonExistentReviewId,
      });
    },
  );
}
