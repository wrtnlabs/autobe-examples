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

export async function test_api_customer_sale_review_update_max_rating_long_body(
  connection: api.IConnection,
): Promise<void> {
  // Test edge case for updating a customer sale review
  // with maximum rating and a long review body
  // 1. Authenticate as customer
  const customerJoinConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerJoinConnection, {
    body: {},
  });
  typia.assert(authorized);
  const customerConnection: api.IConnection = { host: connection.host };
  customerConnection.headers = { Authorization: authorized.token.access };
  // 2. Prepare update input with maximum rating and long review body
  const maxRating = 5;
  const longReviewBody = "A".repeat(1000);
  const body: IShoppingMallSaleReview.IUpdate = {
    rating: maxRating,
    body: longReviewBody,
  };
  // 3. Generate a random UUID for reviewId
  const reviewId = typia.random<string & tags.Format<"uuid">>();
  // 4. Call update API
  const updatedReview =
    await api.functional.shoppingMall.customer.sale_reviews.update(
      customerConnection,
      {
        reviewId,
        body,
      },
    );
  // 5. Assert response type
  typia.assert(updatedReview);
}
