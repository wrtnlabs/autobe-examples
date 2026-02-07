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

export async function test_api_customer_review_not_helpful_vote(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerData: IShoppingMallCustomer.IJoin =
    typia.random<IShoppingMallCustomer.IJoin>();
  const authorized = await authorize_customer_join(customerConnection, {
    body: customerData,
  });
  typia.assert(authorized);
  // Use a generated UUID as reviewId — this review does not exist
  const nonExistentReviewId = typia.random<string & tags.Format<"uuid">>();
  // Submit vote on non-existent review — should return 404 Not Found
  await TestValidator.httpError(
    "should return 404 for non-existent review",
    404,
    async () => {
      await api.functional.shoppingMall.customer.reviews.votes.vote(
        customerConnection,
        {
          reviewId: nonExistentReviewId,
          body: {} satisfies IShoppingMallReviewVote.IRequest,
        },
      );
    },
  );
}
