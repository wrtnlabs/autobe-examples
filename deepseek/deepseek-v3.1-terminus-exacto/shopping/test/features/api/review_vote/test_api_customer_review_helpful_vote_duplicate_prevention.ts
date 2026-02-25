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

export async function test_api_customer_review_helpful_vote_duplicate_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer connection and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 2. Create a review to vote on using direct SDK (since utility function doesn't exist)
  // Note: In a real scenario, this would require proper product purchase setup
  const productId = typia.random<string & tags.Format<"uuid">>();
  const reviewResponse =
    await api.functional.ecommerce.customer.products.reviews.create(
      customerConnection,
      {
        productId,
        body: {
          rating: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<3> & tags.Maximum<5>
          >(),
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEcommerceReview.ICreate,
      },
    );
  typia.assert(reviewResponse);
  const reviewId = (reviewResponse as any).id;
  
  // 3. Cast first helpful vote successfully
  const firstVote =
    await api.functional.ecommerce.customer.reviews.helpful_votes.create(
      customerConnection,
      {
        reviewId: reviewId,
        body: {
          review_id: reviewId,
          helpful: true,
        } satisfies IEcommerceReviewVote.ICreate,
      },
    );
  typia.assert(firstVote);
  // 4. Attempt to cast second vote - should fail with conflict error
  await TestValidator.error("duplicate vote prevention", async () => {
    await api.functional.ecommerce.customer.reviews.helpful_votes.create(
      customerConnection,
      {
        reviewId: reviewId,
        body: {
          review_id: reviewId,
          helpful: false,
        } satisfies IEcommerceReviewVote.ICreate,
      },
    );
  });
  // 5. Verify first vote remains unchanged
  TestValidator.equals("first vote helpful value", firstVote.helpful, true);
  TestValidator.equals("review ID matches", (firstVote.review as any).id, reviewId);
}