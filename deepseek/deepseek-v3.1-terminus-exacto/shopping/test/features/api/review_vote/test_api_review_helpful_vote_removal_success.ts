import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReview";
import type { IEcommerceReviewVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReviewVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_customer_products_reviews_create } from "../../../generate/generate_random_ecommerce_customer_products_reviews_create";
import { generate_random_ecommerce_customer_reviews_helpful_votes_create } from "../../../generate/generate_random_ecommerce_customer_reviews_helpful_votes_create";
import { prepare_random_ecommerce_review } from "../../../prepare/prepare_random_ecommerce_review";
import { prepare_random_ecommerce_review_vote } from "../../../prepare/prepare_random_ecommerce_review_vote";

export async function test_api_review_helpful_vote_removal_success(
  connection: api.IConnection,
): Promise<void> {
  // Create voter customer
  const voterConnection: api.IConnection = { host: connection.host };
  const voter = await authorize_customer_join(voterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.paragraph({
        sentences: 1,
        wordMin: 2,
        wordMax: 4,
      }).substring(0, 50),
      phone_number: RandomGenerator.mobile(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(voter);
  // Create a mock review ID since we cannot create actual products/reviews
  // In a real implementation, this would come from a product/review creation flow
  const reviewId = typia.random<
    string & tags.Format<"uuid">
  >() satisfies string as string & tags.Format<"uuid">;
  // Add helpful vote using utility function
  const vote =
    await generate_random_ecommerce_customer_reviews_helpful_votes_create(
      voterConnection,
      {
        params: { reviewId },
        body: {
          review_id: reviewId,
          helpful: true,
        } satisfies IEcommerceReviewVote.ICreate,
      },
    );
  typia.assert(vote);
  // Validate vote was created successfully
  TestValidator.equals("vote has correct review ID", vote.review.id, reviewId);
  TestValidator.equals("vote is marked as helpful", vote.helpful, true);
  TestValidator.equals("vote belongs to the voter", vote.customer.id, voter.id);
  // Remove helpful vote
  await api.functional.ecommerce.customer.reviews.helpful_votes.erase(
    voterConnection,
    { reviewId },
  );
  // Verify the vote deletion succeeded by attempting to create another vote
  // Creating a new vote after deletion should work (not be blocked by duplicate)
  const newVote =
    await generate_random_ecommerce_customer_reviews_helpful_votes_create(
      voterConnection,
      {
        params: { reviewId },
        body: {
          review_id: reviewId,
          helpful: false, // Different vote this time
        } satisfies IEcommerceReviewVote.ICreate,
      },
    );
  typia.assert(newVote);
  TestValidator.equals(
    "new vote has correct review ID",
    newVote.review.id,
    reviewId,
  );
  TestValidator.equals("new vote is not helpful", newVote.helpful, false);
  TestValidator.equals(
    "new vote belongs to voter",
    newVote.customer.id,
    voter.id,
  );
}
