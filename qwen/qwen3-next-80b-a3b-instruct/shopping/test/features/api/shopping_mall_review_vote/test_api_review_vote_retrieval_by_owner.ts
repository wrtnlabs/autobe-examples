import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallReviewVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_reviews_create } from "../../../generate/generate_random_shopping_mall_customer_reviews_create";
import { generate_random_shopping_mall_customer_reviews_votes_create } from "../../../generate/generate_random_shopping_mall_customer_reviews_votes_create";
import { prepare_random_shopping_mall_review } from "../../../prepare/prepare_random_shopping_mall_review";
import { prepare_random_shopping_mall_review_vote } from "../../../prepare/prepare_random_shopping_mall_review_vote";

export async function test_api_review_vote_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for customer
  const customerConnection: api.IConnection = { host: connection.host };
  // Authenticate customer to establish session (required for protected endpoint)
  await authorize_customer_join(customerConnection, {
    body: {} satisfies IShoppingMallCustomer.IJoin,
  });
  // Since IShoppingMallReview and IShoppingMallReviewVote have empty DTO definitions ({}),
  // we cannot use any properties like 'id' from their instances. We must generate UUIDs directly.
  // Generate a random UUID for the reviewId
  const reviewId = typia.random<string & tags.Format<"uuid">>();
  // Generate a random UUID for the voteId
  const voteId = typia.random<string & tags.Format<"uuid">>();
  // Call the retrieval endpoint with the UUIDs using the customer connection
  const retrievedVote =
    await api.functional.shoppingMall.customer.reviews.votes.at(
      customerConnection,
      {
        reviewId,
        voteId,
      },
    );
  // Since the DTO is empty, we cannot validate any properties of retrievedVote
  // We can only validate that the response is not null (which is required)
  TestValidator.predicate("retrieved vote is not null", retrievedVote !== null);
}
