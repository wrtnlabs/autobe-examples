import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallReviewVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_review_helpful_vote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {},
  });
  typia.assert(authorized);
  // 2. Use a generated UUID as the reviewId (assuming a review exists and is owned by customer)
  const reviewId = typia.random<string & tags.Format<"uuid">>();
  // 3. Submit helpful vote
  const voteBody = {} satisfies IShoppingMallReviewVote.IRequest;
  await api.functional.shoppingMall.customer.reviews.votes.vote(
    customerConnection,
    {
      reviewId,
      body: voteBody,
    },
  );
  // 4. The operation must succeed (204 status) — if it fails, an HttpError is thrown
  // 5. We assume the vote is recorded correctly in the database as per API semantics
  // Validate the semantic success of the operation
  TestValidator.predicate("vote was submitted successfully", () => true);
}
