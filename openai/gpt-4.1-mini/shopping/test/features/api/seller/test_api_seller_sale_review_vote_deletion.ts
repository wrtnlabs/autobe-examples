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
import type { IShoppingMallSaleReviewVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleReviewVote";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_sales_create } from "../../../generate/generate_random_shopping_mall_seller_sales_create";
import { generate_random_shopping_mall_seller_sales_review_votes_create_review_vote } from "../../../generate/generate_random_shopping_mall_seller_sales_review_votes_create_review_vote";
import { prepare_random_shopping_mall_sale } from "../../../prepare/prepare_random_shopping_mall_sale";
import { prepare_random_shopping_mall_sale_review_vote } from "../../../prepare/prepare_random_shopping_mall_sale_review_vote";

export async function test_api_seller_sale_review_vote_deletion(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successfully delete a helpful review vote.
  // Scenario 2: Attempt to delete a review vote by a seller who is not the original voter.
  // Scenario 3: Attempt to delete a review vote that does not exist.
  {
    // Prepare Seller A connection and register
    const sellerAConnection: api.IConnection = { host: connection.host };
    const sellerA = await authorize_seller_join(sellerAConnection, {
      body: { email: typia.random<string & tags.Format<"email">>() },
    });
    // Set authorization header manually for seller A
    sellerAConnection.headers = { Authorization: sellerA.token.access };
    // Generate a product sale for Seller A
    const saleA = await generate_random_shopping_mall_seller_sales_create(
      sellerAConnection,
      {},
    );
    typia.assert(saleA);
    // Create a review vote by Seller A
    const reviewVoteA =
      await generate_random_shopping_mall_seller_sales_review_votes_create_review_vote(
        sellerAConnection,
        {
          params: { saleId: saleA.id },
        },
      );
    typia.assert(reviewVoteA);
    // DELETE the review vote by the original voter (Seller A) -- expect 204 No Content
    await api.functional.shoppingMall.seller.sales.review_votes.erase(
      sellerAConnection,
      {
        saleId: saleA.id,
        voteId: reviewVoteA.id,
      },
    );
    // Confirm the vote has been deleted by attempting to DELETE again and expect 404 Not Found
    await TestValidator.error(
      "delete non-existent vote should fail",
      async () => {
        await api.functional.shoppingMall.seller.sales.review_votes.erase(
          sellerAConnection,
          {
            saleId: saleA.id,
            voteId: reviewVoteA.id,
          },
        );
      },
    );
  }
  {
    // Scenario 2: Attempt to delete a review vote by a seller who is not the original voter.
    // Prepare Seller A
    const sellerAConnection: api.IConnection = { host: connection.host };
    const sellerA = await authorize_seller_join(sellerAConnection, {
      body: { email: typia.random<string & tags.Format<"email">>() },
    });
    sellerAConnection.headers = { Authorization: sellerA.token.access };
    // Prepare Seller B
    const sellerBConnection: api.IConnection = { host: connection.host };
    const sellerB = await authorize_seller_join(sellerBConnection, {
      body: { email: typia.random<string & tags.Format<"email">>() },
    });
    sellerBConnection.headers = { Authorization: sellerB.token.access };
    // Seller A creates a sale
    const saleA = await generate_random_shopping_mall_seller_sales_create(
      sellerAConnection,
      {},
    );
    typia.assert(saleA);
    // Seller A creates a review vote
    const reviewVoteA =
      await generate_random_shopping_mall_seller_sales_review_votes_create_review_vote(
        sellerAConnection,
        {
          params: { saleId: saleA.id },
        },
      );
    typia.assert(reviewVoteA);
    // Seller B tries to delete Seller A's vote (expect 403 Forbidden)
    await TestValidator.httpError(
      "unauthorized review vote deletion should fail",
      403,
      async () => {
        await api.functional.shoppingMall.seller.sales.review_votes.erase(
          sellerBConnection,
          {
            saleId: saleA.id,
            voteId: reviewVoteA.id,
          },
        );
      },
    );
  }
  {
    // Scenario 3: Attempt to delete a review vote that does not exist.
    // Prepare a seller connection
    const sellerConnection: api.IConnection = { host: connection.host };
    const seller = await authorize_seller_join(sellerConnection, {
      body: { email: typia.random<string & tags.Format<"email">>() },
    });
    sellerConnection.headers = { Authorization: seller.token.access };
    // Delete a non-existent vote - generate random UUID
    const randomVoteId = typia.random<string & tags.Format<"uuid">>();
    await TestValidator.httpError(
      "delete non-existent review vote should fail with 404",
      404,
      async () => {
        await api.functional.shoppingMall.seller.sales.review_votes.erase(
          sellerConnection,
          {
            saleId: typia.random<string & tags.Format<"uuid">>(),
            voteId: randomVoteId,
          },
        );
      },
    );
  }
}
