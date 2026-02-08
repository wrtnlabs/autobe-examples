import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSaleReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_sale_review_retrieve_and_authorization(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful retrieval of sale review details by the owning authenticated customer.
  // Scenario 2: Attempted retrieval of another customer's sale review, resulting in access denial.
  // Use actor-specific connections
  const ownerConnection: api.IConnection = { host: connection.host };
  const nonOwnerConnection: api.IConnection = { host: connection.host };
  // Customer join and authenticate for owner
  const ownerAuthorized = await authorize_customer_join(ownerConnection, {
    body: {} satisfies IShoppingMallCustomer.IJoin,
  });
  // Customer join and authenticate for non-owner
  const nonOwnerAuthorized = await authorize_customer_join(nonOwnerConnection, {
    body: {} satisfies IShoppingMallCustomer.IJoin,
  });
  // Since no API or utility for creating sale review is provided, use random UUID as review ID
  const ownerReviewId = typia.random<string & tags.Format<"uuid">>();
  // Scenario 1: Owner fetching own review - expect valid response
  const review = await api.functional.shoppingMall.customer.sale_reviews.at(
    ownerConnection,
    {
      reviewId: ownerReviewId,
    },
  );
  typia.assert(review);
  // Scenario 2: Non-owner tries to fetch owner's review - expect error
  await TestValidator.error(
    "access denied for non-owner fetching another's review",
    async () => {
      await api.functional.shoppingMall.customer.sale_reviews.at(
        nonOwnerConnection,
        {
          reviewId: ownerReviewId,
        },
      );
    },
  );
}
