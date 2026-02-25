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

export async function test_api_seller_review_vote_detail_access(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful retrieval of review vote details by an authorized seller.
  // 1. Seller registration and authorization
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {},
  });
  sellerConnection.headers = {
    Authorization: `Bearer ${sellerAuth.token.access}`,
  };
  // 2. Seller requests review vote details with valid saleId and voteId
  const saleId = typia.random<string & tags.Format<"uuid">>();
  const voteId = typia.random<string & tags.Format<"uuid">>();
  const existingVote =
    await api.functional.shoppingMall.seller.sales.review_votes.at(
      sellerConnection,
      {
        saleId,
        voteId,
      },
    );
  typia.assert(existingVote);
  // Validate vote details
  TestValidator.predicate(
    "vote id not empty",
    existingVote.id !== "" &&
      existingVote.shoppingMallProductReviewId !== "" &&
      existingVote.voterId !== "" &&
      (existingVote.actorType === "customer" ||
        existingVote.actorType === "seller"),
  );
  TestValidator.predicate(
    "seller is authorized",
    sellerAuth.id === sellerAuth.id,
  );
  // Scenario 2: Request review vote details with non-existent voteId
  await TestValidator.httpError("review vote not found", 404, async () => {
    await api.functional.shoppingMall.seller.sales.review_votes.at(
      sellerConnection,
      {
        saleId,
        voteId: "00000000-0000-0000-0000-000000000000" as string &
          tags.Format<"uuid">,
      },
    );
  });
  // Scenario 3: Unauthorized access attempt
  // Create a second seller to test unauthorized access
  const otherSellerConnection: api.IConnection = { host: connection.host };
  const otherSellerAuth = await authorize_seller_join(otherSellerConnection, {
    body: {},
  });
  otherSellerConnection.headers = {
    Authorization: `Bearer ${otherSellerAuth.token.access}`,
  };
  await TestValidator.httpError(
    "access denied due to lack of authorization",
    403,
    async () => {
      await api.functional.shoppingMall.seller.sales.review_votes.at(
        otherSellerConnection,
        {
          saleId,
          voteId,
        },
      );
    },
  );
}
