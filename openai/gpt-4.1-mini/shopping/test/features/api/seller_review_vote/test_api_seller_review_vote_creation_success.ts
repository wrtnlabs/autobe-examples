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

export async function test_api_seller_review_vote_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller join and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      shopName: RandomGenerator.name(1),
      shopDescription: null,
      logoUri: null,
    },
  });
  typia.assert(sellerAuth);
  sellerConnection.headers = {
    Authorization: sellerAuth.token.access,
  };
  // 2. Prepare a random valid review vote creation body
  // We create a random UUID for saleId and prepare the vote creation payload
  const saleId = typia.random<string & tags.Format<"uuid">>();
  const reviewVoteBody: IShoppingMallSaleReviewVote.ICreate = {
    shoppingMallProductReviewId: typia.random<string & tags.Format<"uuid">>(),
    voterId: sellerAuth.id,
    actorType: "seller",
  };
  // 3. Execute the createReviewVote API through the generator utility
  const createdVote =
    await generate_random_shopping_mall_seller_sales_review_votes_create_review_vote(
      sellerConnection,
      {
        params: { saleId },
        body: reviewVoteBody,
      },
    );
  typia.assert(createdVote);
  // 4. Validate that the returned vote has the correct linkage and fields
  TestValidator.equals(
    "shoppingMallProductReviewId",
    createdVote.shoppingMallProductReviewId,
    reviewVoteBody.shoppingMallProductReviewId,
  );
  TestValidator.equals("voterId", createdVote.voterId, reviewVoteBody.voterId);
  TestValidator.equals("actorType", createdVote.actorType, "seller");
  // 5. Ensure the vote contains generated id and valid timestamps
  TestValidator.predicate(
    "id is UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      createdVote.id,
    ),
  );
  TestValidator.predicate(
    "valid createdAt",
    Boolean(Date.parse(createdVote.createdAt)),
  );
  TestValidator.predicate(
    "valid updatedAt",
    Boolean(Date.parse(createdVote.updatedAt)),
  );
  // 6. Check that review and voter objects are included and valid
  typia.assert(createdVote.review);
  typia.assert(createdVote.voter);
  // 7. Validate that the voter summary's id matches the voterId
  TestValidator.equals(
    "voter.id matches voterId",
    createdVote.voter.id,
    reviewVoteBody.voterId,
  );
  // 8. Validate that the actorType on the vote is exactly 'seller'
  TestValidator.equals("actorType is seller", createdVote.actorType, "seller");
}
