import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
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
import { generate_random_shopping_mall_seller_sales_review_votes_create_review_vote } from "../../../generate/generate_random_shopping_mall_seller_sales_review_votes_create_review_vote";
import { prepare_random_shopping_mall_sale_review_vote } from "../../../prepare/prepare_random_shopping_mall_sale_review_vote";

export async function test_api_seller_review_vote_duplicate_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authentication
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password1234",
      shopName: "Test Shop",
      shopDescription: "Shop for testing duplicate vote",
      logoUri: null,
    },
  });
  sellerJoinConnection.headers = {
    Authorization: sellerAuthorized.token.access,
  };
  // 2. Prepare existing saleId - random UUID for test
  const saleId = typia.random<string & tags.Format<"uuid">>();
  // 3. Create initial vote
  const firstVote =
    await generate_random_shopping_mall_seller_sales_review_votes_create_review_vote(
      sellerJoinConnection,
      {
        params: { saleId },
      },
    );
  typia.assert(firstVote);
  // 4. Attempt to create a duplicate vote with same parameters
  await TestValidator.error("duplicate vote should be rejected", async () => {
    await generate_random_shopping_mall_seller_sales_review_votes_create_review_vote(
      sellerJoinConnection,
      {
        body: {
          shoppingMallProductReviewId: firstVote.shoppingMallProductReviewId,
          voterId: firstVote.voterId,
          actorType: "seller",
        },
        params: { saleId },
      },
    );
  });
}
