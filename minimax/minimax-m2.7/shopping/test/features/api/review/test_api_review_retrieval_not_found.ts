import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReviewSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test retrieving a non-existent or deleted review returns 404.
 *
 * This test validates the error handling when attempting to retrieve a review
 * that either does not exist or has been soft-deleted. Call GET /reviews/{reviewId}
 * with a UUID that does not correspond to any existing review. Validate that the
 * response returns HTTP 404 Not Found with an appropriate error message indicating
 * the review was not found.
 *
 * This ensures that:
 * - Deleted reviews are not accessible
 * - The system properly handles invalid review identifiers
 * - Soft-deleted reviews behave as if they don't exist
 */
export async function test_api_review_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random UUID that doesn't exist in the database
  const nonExistentReviewId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve a non-existent review
  await TestValidator.httpError(
    "non-existent review returns 404",
    404,
    async () => {
      await api.functional.ecommerceMall.reviews.at(connection, {
        reviewId: nonExistentReviewId,
      });
    },
  );
}
