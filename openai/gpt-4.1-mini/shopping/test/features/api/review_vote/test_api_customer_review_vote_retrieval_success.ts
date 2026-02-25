import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSaleReviewVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleReviewVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_review_vote_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test retrieval of an existing review vote by an authorized customer for a specific sale product.
   * Preconditions: Customer registration and login for authentication.
   * The test validates successful retrieval and checks required fields of the vote.
   */
  // 1. Customer registration and authorization
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  customerConnection.headers = { Authorization: customerAuth.token.access };
  // 2. Setup valid UUIDs for saleId and voteId
  const saleId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const voteId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Retrieve the review vote
  const vote = await api.functional.shoppingMall.customer.sales.review_votes.at(
    customerConnection,
    {
      saleId,
      voteId,
    },
  );
  // 4. Validate the response object
  typia.assert(vote);
  // 5. Validate required fields presence and correctness
  TestValidator.predicate(
    "id is valid uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      vote.id,
    ),
  );
  TestValidator.equals("voteId matches requested", vote.id, voteId);
  TestValidator.predicate(
    "actorType is 'customer' or 'seller'",
    vote.actorType === "customer" || vote.actorType === "seller",
  );
  TestValidator.predicate(
    "createdAt is valid ISO date",
    !isNaN(Date.parse(vote.createdAt)),
  );
  TestValidator.predicate(
    "updatedAt is valid ISO date",
    !isNaN(Date.parse(vote.updatedAt)),
  );
  TestValidator.predicate(
    "deletedAt is null or valid ISO date",
    vote.deletedAt === null || !isNaN(Date.parse(vote.deletedAt ?? "")),
  );
}
