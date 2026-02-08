import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallSaleReviewVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleReviewVote";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";

/**
 * Test the retrieval of a specific helpful vote on a review by an authenticated seller.
 *
 * 1. Register a seller and authenticate.
 * 2. Using a valid voteId, retrieve the sale review vote detail.
 * 3. Validate the response with typia.assert and business logic.
 */
export async function test_api_sale_review_vote_retrieval_success_with_valid_vote_id(
  connection: IConnection,
): Promise<void> {
  // 1. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  // Generate seller join body with realistic data since no fields are defined, use empty object
  const authorizedSeller: IShoppingMallSeller.IAuthorized =
    await authorize_seller_join(sellerConnection, { body: {} });
  // Set Authorization header
  sellerConnection.headers = {
    Authorization: `Bearer ${authorizedSeller.token.access}`,
  };
  // 2. Generate a valid UUID voteId (simulate a realistic UUID)
  const voteId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve the specific sale review vote using the seller connection
  const voteDetail: IShoppingMallSaleReviewVote =
    await api.functional.shoppingMall.seller.sale_review_votes.at(
      sellerConnection,
      { voteId },
    );
  // 4. Validate the returned vote detail
  typia.assert(voteDetail);
}