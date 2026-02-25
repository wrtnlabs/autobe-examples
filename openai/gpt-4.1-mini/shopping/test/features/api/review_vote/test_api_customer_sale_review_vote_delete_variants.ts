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

/**
 * Test cases:
 * 1. Setup a customer, sale, review, and vote; then delete the vote successfully by original voter.
 * 2. Attempt deletion of vote by a different customer, expect 403 Forbidden.
 * 3. Attempt deletion of a non-existent vote, expect 404 Not Found.
 */
export async function test_api_customer_sale_review_vote_delete_variants(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful deletion of a helpful review vote by the original customer voter.
  // 1) Join as original customer voter
  const originalCustomerConnection: api.IConnection = { host: connection.host };
  const originalCustomer = await authorize_customer_join(
    originalCustomerConnection,
    {
      body: {
        email: `original.${typia.random<string & tags.Format<"email">>()}`,
        password: "Passw0rd!",
      },
    },
  );
  typia.assert(originalCustomer);
  // 2) Create a sale review by the original customer
  const saleId = typia.random<string & tags.Format<"uuid">>();
  // Because generate_random_shopping_mall_customer_sales_reviews_create requires saleId param, pass it
  const review =
    await generate_random_shopping_mall_customer_sales_reviews_create(
      originalCustomerConnection,
      {
        params: { saleId },
        body: {
          shoppingMallCustomerId: originalCustomer.id,
          shoppingMallSaleId: saleId,
          rating: 5,
          body: "Excellent product!",
        },
      },
    );
  typia.assert(review);
  // 3) Create a helpful review vote by the original customer
  const vote =
    await generate_random_shopping_mall_customer_sales_review_votes_create_review_vote(
      originalCustomerConnection,
      {
        params: { saleId },
        body: {
          shoppingMallProductReviewId: review.id,
          voterId: originalCustomer.id,
          actorType: "customer",
        },
      },
    );
  typia.assert(vote);
  // 4) Delete the vote successfully
  await api.functional.shoppingMall.customer.sales.review_votes.erase(
    originalCustomerConnection,
    {
      saleId,
      voteId: vote.id,
    },
  );
  // 5) Attempt to delete the vote again to confirm non-existence HTTP 404
  await TestValidator.httpError(
    "deleting already deleted vote returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.customer.sales.review_votes.erase(
        originalCustomerConnection,
        {
          saleId,
          voteId: vote.id,
        },
      );
    },
  );
  // Scenario 2: Attempted deletion by unauthorized customer (not the original voter).
  // 1) Join as a different customer
  const otherCustomerConnection: api.IConnection = { host: connection.host };
  const otherCustomer = await authorize_customer_join(otherCustomerConnection, {
    body: {
      email: `other.${typia.random<string & tags.Format<"email">>()}`,
      password: "Passw0rd!",
    },
  });
  typia.assert(otherCustomer);
  // 2) Create a new review and vote by originalCustomer to test unauthorized deletion
  const newReview =
    await generate_random_shopping_mall_customer_sales_reviews_create(
      originalCustomerConnection,
      {
        params: { saleId },
        body: {
          shoppingMallCustomerId: originalCustomer.id,
          shoppingMallSaleId: saleId,
          rating: 4,
          body: "Good product",
        },
      },
    );
  typia.assert(newReview);
  const newVote =
    await generate_random_shopping_mall_customer_sales_review_votes_create_review_vote(
      originalCustomerConnection,
      {
        params: { saleId },
        body: {
          shoppingMallProductReviewId: newReview.id,
          voterId: originalCustomer.id,
          actorType: "customer",
        },
      },
    );
  typia.assert(newVote);
  // 3) Other customer attempts to delete the vote
  await TestValidator.httpError(
    "unauthorized customer deletion returns 403",
    403,
    async () => {
      await api.functional.shoppingMall.customer.sales.review_votes.erase(
        otherCustomerConnection,
        {
          saleId,
          voteId: newVote.id,
        },
      );
    },
  );
  // 4) Confirm vote still exists by allowing original voter to delete it finally
  await api.functional.shoppingMall.customer.sales.review_votes.erase(
    originalCustomerConnection,
    {
      saleId,
      voteId: newVote.id,
    },
  );
  // Scenario 3: Deletion of a non-existent helpful review vote.
  // 1) Join a new customer
  const thirdCustomerConnection: api.IConnection = { host: connection.host };
  const thirdCustomer = await authorize_customer_join(thirdCustomerConnection, {
    body: {
      email: `third.${typia.random<string & tags.Format<"email">>()}`,
      password: "Passw0rd!",
    },
  });
  typia.assert(thirdCustomer);
  // 2) Attempt deletion with non-existent voteId
  const nonExistentVoteId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "deletion of non-existent vote returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.customer.sales.review_votes.erase(
        thirdCustomerConnection,
        {
          saleId,
          voteId: nonExistentVoteId,
        },
      );
    },
  );
}
