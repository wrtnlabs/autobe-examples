import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_sale_review_vote_retrieval_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Test unauthorized access to sale review vote retrieval endpoint.
  // 1. Attempt anonymous access (without any authentication) to GET /shoppingMall/seller/sale-review-votes/{voteId}
  // 2. Attempt authenticated access as a non-seller role (simulate by no auth header or other role if possible) to the same endpoint
  // 3. Verify that access is denied with appropriate authorization errors
  // 4. Perform a seller join to fulfill the dependency prerequisite but do NOT use the obtained token for the unauthorized calls
  // Step 4: Seller join to create seller context (dependency fulfillment)
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerJoinConnection, {
    body: {} satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // Prepare a valid voteId (UUID) for testing unauthorized access
  const voteId = typia.random<string & tags.Format<"uuid">>();
  // Step 1: Anonymous access attempt without Authorization header
  await TestValidator.httpError("anonymous access denied", 401, async () => {
    const anonConnection: api.IConnection = { host: connection.host };
    await api.functional.shoppingMall.seller.sale_review_votes.at(
      anonConnection,
      {
        voteId,
      },
    );
  });
  // Step 2: Authenticated but non-seller role access (simulate by not setting seller token)
  // Since no explicit non-seller utility or login is given, simulate by empty auth header
  const userConnection: api.IConnection = {
    host: connection.host,
    headers: {},
  };
  await TestValidator.httpError("non-seller access denied", 403, async () => {
    await api.functional.shoppingMall.seller.sale_review_votes.at(
      userConnection,
      {
        voteId,
      },
    );
  });
}
