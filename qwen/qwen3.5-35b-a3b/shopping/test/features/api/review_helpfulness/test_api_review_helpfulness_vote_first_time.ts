import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
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
import { generate_random_ecommerce_mall_customer_reviews_create } from "../../../generate/generate_random_ecommerce_mall_customer_reviews_create";
import { prepare_random_ecommerce_mall_review } from "../../../prepare/prepare_random_ecommerce_mall_review";

export async function test_api_review_helpfulness_vote_first_time(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration using utility function
  const customerConnection: api.IConnection = { host: connection.host };
  const customerData: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
  typia.assert(customerData);
  // Create customer-specific connection with token
  const authenticatedCustomerConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: customerData.token.access },
  };
  // 2. Generate a review for the customer to vote on using utility
  const review: IEcommerceMallReview =
    await generate_random_ecommerce_mall_customer_reviews_create(
      authenticatedCustomerConnection,
      {},
    );
  typia.assert(review);
  // 3. Verify the product exists (review's product)
  const product: IEcommerceMallProduct =
    await api.functional.ecommerceMall.products.at(
      authenticatedCustomerConnection,
      { productId: review.product.id },
    );
  typia.assert(product);
  // 4. Cast helpfulness vote on the review (first vote)
  const vote: IEcommerceMallReviewHelpfulnessVote =
    await api.functional.ecommerceMall.reviews.helpfulness_votes.updateHelpfulnessVote(
      authenticatedCustomerConnection,
      { reviewId: review.id, body: { helpfulness: true } },
    );
  typia.assert(vote);
  // 5. Validate vote record
  TestValidator.predicate("vote id is valid uuid format", () =>
    /^[0-9a-f-]{36}$/i.test(vote.id),
  );
  TestValidator.equals(
    "vote customer matches voting customer",
    vote.customer.id,
    customerData.id,
  );
  TestValidator.equals(
    "vote review matches target review",
    vote.review.id,
    review.id,
  );
  TestValidator.equals(
    "vote helpfulness matches input",
    vote.helpfulness,
    true,
  );
  TestValidator.predicate(
    "vote has valid created_at timestamp",
    () => new Date(vote.created_at).getTime() > 0,
  );
  TestValidator.predicate(
    "vote has valid updated_at timestamp",
    () => new Date(vote.updated_at).getTime() > 0,
  );
  TestValidator.equals(
    "vote deleted_at is null for active vote",
    vote.deleted_at,
    null,
  );
}