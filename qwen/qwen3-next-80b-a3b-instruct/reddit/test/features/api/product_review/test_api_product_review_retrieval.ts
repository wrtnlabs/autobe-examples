import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductReview";
export async function test_api_product_review_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random product review with valid ICommunityPlatformProductReview schema
  const review = typia.random<ICommunityPlatformProductReview>();
  // Extract the productCode and reviewId from the generated review
  const productCode = review.product_code;
  const reviewId = review.id;
  // Call the API to retrieve the review by productCode and reviewId
  const retrievedReview: ICommunityPlatformProductReview =
    await api.functional.communityPlatform.products.reviews.at(connection, {
      productCode,
      reviewId,
    });
  // Validate the response type and structure
  typia.assert(retrievedReview);
  // Verify all required fields are present and correctly typed
  TestValidator.equals("review id matches", retrievedReview.id, reviewId);
  TestValidator.equals(
    "product code matches",
    retrievedReview.product_code,
    productCode,
  );
  TestValidator.equals(
    "rating is between 1-5",
    retrievedReview.rating >= 1 && retrievedReview.rating <= 5,
    true,
  );
  TestValidator.predicate(
    "title is not empty",
    retrievedReview.title.length > 0,
  );
  TestValidator.predicate(
    "content meets minimum length",
    retrievedReview.content.length >= 20,
  );
  TestValidator.predicate(
    "content meets maximum length",
    retrievedReview.content.length <= 10000,
  );
  TestValidator.equals(
    "status is valid",
    ["published", "flagged", "removed"].includes(retrievedReview.status),
    true,
  );
  TestValidator.equals(
    "member id is UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      retrievedReview.member_id,
    ),
    true,
  );
  TestValidator.equals(
    "created at is ISO date-time format",
    /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](\\.[0-9]{1,9})?(Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$/i.test(
      retrievedReview.created_at,
    ),
    true,
  );
}
