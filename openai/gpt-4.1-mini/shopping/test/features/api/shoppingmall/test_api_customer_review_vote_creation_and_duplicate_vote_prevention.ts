import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleReview";
import type { IShoppingMallSaleReviewVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleReviewVote";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_sales_review_votes_create_review_vote } from "../../../generate/generate_random_shopping_mall_customer_sales_review_votes_create_review_vote";
import { generate_random_shopping_mall_customer_sales_reviews_create } from "../../../generate/generate_random_shopping_mall_customer_sales_reviews_create";
import { prepare_random_shopping_mall_sale_review } from "../../../prepare/prepare_random_shopping_mall_sale_review";
import { prepare_random_shopping_mall_sale_review_vote } from "../../../prepare/prepare_random_shopping_mall_sale_review_vote";

export async function test_api_customer_review_vote_creation_and_duplicate_vote_prevention(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful creation of a helpful review vote by an authenticated customer.
  //
  // Steps:
  // - Register a new customer using /auth/customer/join.
  // - Authenticate as the registered customer.
  // - Create a product review for a specific sale product using /shoppingMall/customer/sales/{saleId}/reviews.
  // - Submit a helpful review vote on the created review using /shoppingMall/customer/sales/{saleId}/review-votes with valid vote data.
  // - Validate that the vote is stored, linked to the review and voter, with correct actorType set to 'customer'.
  // - Confirm the response contains generated ID, timestamps, and vote details.
  //
  // Scenario 2: Attempt to create a duplicate helpful review vote by the same customer on the same review.
  //
  // Steps:
  // - Register and authenticate a customer.
  // - Create a product review for a sale.
  // - Submit a helpful review vote for the review.
  // - Attempt to submit the same review vote again by the same customer with identical review ID and actorType.
  // - Expect an error indicating duplicate vote prevention per uniqueness constraint.
  // - Validate the system prevents duplicate votes and returns appropriate error.
  const customerConnection: api.IConnection = { host: connection.host };
  // Register and authenticate a new customer
  const authorizedCustomer = await authorize_customer_join(
    customerConnection,
    {},
  );
  customerConnection.headers = {
    Authorization: authorizedCustomer.token.access,
  };
  // Create a product review for the sale
  const saleId = typia.random<string & tags.Format<"uuid">>();
  // Prepare valid review create input
  const reviewBody: IShoppingMallSaleReview.ICreate = {
    shoppingMallSaleId: saleId,
    shoppingMallCustomerId: authorizedCustomer.id,
    rating: 5,
    body: "Great product, highly recommended!",
  };
  const review =
    await generate_random_shopping_mall_customer_sales_reviews_create(
      customerConnection,
      {
        params: { saleId },
        body: reviewBody,
      },
    );
  typia.assert(review);
  // Submit a helpful review vote on the created review
  const voteBody: IShoppingMallSaleReviewVote.ICreate = {
    shoppingMallProductReviewId: review.id,
    voterId: authorizedCustomer.id,
    actorType: "customer",
  };
  const vote =
    await generate_random_shopping_mall_customer_sales_review_votes_create_review_vote(
      customerConnection,
      {
        params: { saleId },
        body: voteBody,
      },
    );
  typia.assert(vote);
  // Validate vote details
  TestValidator.equals(
    "vote linked review ID",
    vote.shoppingMallProductReviewId,
    review.id,
  );
  TestValidator.equals(
    "vote linked voter ID",
    vote.voterId,
    authorizedCustomer.id,
  );
  TestValidator.equals(
    "vote actor type is customer",
    vote.actorType,
    "customer",
  );
  // Scenario 2: Attempt to create a duplicate helpful review vote by the same customer on the same review.
  await TestValidator.error("duplicate vote prevention", async () => {
    await generate_random_shopping_mall_customer_sales_review_votes_create_review_vote(
      customerConnection,
      {
        params: { saleId },
        body: voteBody,
      },
    );
  });
}
