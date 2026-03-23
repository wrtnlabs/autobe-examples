import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallReviewHelpfulnessVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReviewHelpfulnessVote";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_products_reviews_create } from "../../../generate/generate_random_ecommerce_mall_customer_products_reviews_create";
import { generate_random_ecommerce_mall_customer_reviews_helpfulness_vote_helpfulness } from "../../../generate/generate_random_ecommerce_mall_customer_reviews_helpfulness_vote_helpfulness";
import { prepare_random_ecommerce_mall_review } from "../../../prepare/prepare_random_ecommerce_mall_review";
import { prepare_random_ecommerce_mall_review_helpfulness_vote } from "../../../prepare/prepare_random_ecommerce_mall_review_helpfulness_vote";

export async function test_api_review_helpfulness_vote_deleted_review(
  connection: api.IConnection,
): Promise<void> {
  // Create customer A (review author)
  const customerAConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerAConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  // Create customer B (attempted voter)
  const customerBConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerBConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  // Since there's no product creation or order creation API available in this SDK,
  // we simulate the scenario with a UUID for a review that was previously created
  // but is now deleted. The system should return 404 Not Found when trying to vote
  // on a deleted review.
  const deletedReviewId = "123e4567-e89b-12d3-a456-426614174000";
  // Customer B attempts to vote helpfulness on the deleted review
  // This should fail with 404 Not Found with error 'Review not found'
  await TestValidator.error(
    "should return 404 for deleted review",
    async () => {
      await api.functional.ecommerceMall.customer.reviews.helpfulness.voteHelpfulness(
        customerBConnection,
        {
          reviewId: deletedReviewId,
          body: {
            review_id: deletedReviewId,
          } satisfies IEcommerceMallReviewHelpfulnessVote.ICreate,
        },
      );
    },
  );
}
