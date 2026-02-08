import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSaleReviewVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleReviewVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_sale_review_vote_at_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 2: Attempt to retrieve a review vote with a non-existent voteId
  // This scenario tests that an authenticated customer who has joined will receive a 404 Not Found error
  // 1. Customer join and obtain authorization token
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, { body: {} });
  // 2. Generate a random UUID that definitely does not exist
  const nonExistentVoteId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to fetch review vote using the non-existent voteId and expect 404 error
  await TestValidator.httpError(
    "fetch sale review vote with non-existent voteId returns 404 not found",
    404,
    async () => {
      await api.functional.shoppingMall.customer.sale_review_votes.at(
        customerConnection,
        {
          voteId: nonExistentVoteId,
        },
      );
    },
  );
}
