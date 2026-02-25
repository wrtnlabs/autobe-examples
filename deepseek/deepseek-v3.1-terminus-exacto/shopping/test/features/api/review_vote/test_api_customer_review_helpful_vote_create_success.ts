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

/**
 * Test that an authenticated customer can successfully cast a helpful vote on a review.
 * Validates that customers can create helpful votes with proper authentication and data structure.
 */
export async function test_api_customer_review_helpful_vote_create_success(
  connection: api.IConnection,
): Promise<void> {
  // Create customer connection and register
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test1234",
      display_name: RandomGenerator.name(2),
      phone_number: RandomGenerator.mobile(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer);
  // Generate a valid review ID for testing
  const reviewId = typia.random<string & tags.Format<"uuid">>();
  // Create helpful vote using utility function
  const vote =
    await generate_random_ecommerce_customer_reviews_helpful_votes_create(
      customerConnection,
      {
        body: {
          review_id: reviewId,
          helpful: true,
        } satisfies IEcommerceReviewVote.ICreate,
        params: {
          reviewId: reviewId,
        },
      },
    );
  typia.assert(vote);
  // Validate vote business logic
  TestValidator.equals("vote helpful value matches input", vote.helpful, true);
  TestValidator.predicate(
    "vote has valid UUID identifier",
    /^[0-9a-f-]{36}$/i.test(vote.id),
  );
  TestValidator.predicate("vote has creation timestamp", !!vote.created_at);
  TestValidator.predicate("vote has update timestamp", !!vote.updated_at);
  TestValidator.equals(
    "vote customer ID matches authenticated customer",
    vote.customer.id,
    customer.id,
  );
  TestValidator.equals(
    "vote review ID matches input review ID",
    vote.review.id,
    reviewId,
  );
}
