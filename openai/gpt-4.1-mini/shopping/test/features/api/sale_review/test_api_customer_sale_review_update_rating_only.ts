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

export async function test_api_customer_sale_review_update_rating_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authorization
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {},
  });
  customerConnection.headers = { Authorization: customerAuth.token.access };
  // 2. Generate a random review ID (simulate existing review)
  const reviewId = typia.random<string & tags.Format<"uuid">>();
  // 3. Create initial review to update
  const initialReviewBody: IShoppingMallSaleReview.IUpdate = {
    rating: 4,
    body: "Initial review text.",
  };
  const initialReview =
    await api.functional.shoppingMall.customer.sale_reviews.update(
      customerConnection,
      { reviewId, body: initialReviewBody },
    );
  const safeInitialReview = typia.assert<{
    rating: number;
    body?: string | null;
    updated_at?: string | null;
  }>(initialReview);
  // 4. Update only the rating, omit the body
  const updatedReviewBody: IShoppingMallSaleReview.IUpdate = {
    rating: 5,
  };
  const beforeUpdatedAt = safeInitialReview.updated_at ?? null;
  const updatedReview =
    await api.functional.shoppingMall.customer.sale_reviews.update(
      customerConnection,
      { reviewId, body: updatedReviewBody },
    );
  const safeUpdatedReview = typia.assert<{
    rating: number;
    body?: string | null;
    updated_at?: string | null;
  }>(updatedReview);
  // 5. Verify updated rating is correct
  TestValidator.equals("updated rating", safeUpdatedReview.rating, 5);
  // 6. Verify review body remains unchanged
  if (safeInitialReview.body === undefined) {
    TestValidator.predicate(
      "body undef remains undef",
      safeUpdatedReview.body === undefined,
    );
  } else if (safeInitialReview.body === null) {
    TestValidator.equals("body remains null", safeUpdatedReview.body, null);
  } else {
    TestValidator.equals(
      "body remains unchanged",
      safeUpdatedReview.body,
      safeInitialReview.body,
    );
  }
  // 7. Verify updated_at is refreshed
  if (beforeUpdatedAt !== null) {
    TestValidator.predicate(
      "updated_at timestamp refreshed",
      safeUpdatedReview.updated_at !== undefined &&
        safeUpdatedReview.updated_at !== beforeUpdatedAt,
    );
  }
  // 8. Authorization negative test: another customer cannot update the review
  const anotherCustomerConnection: api.IConnection = { host: connection.host };
  const anotherCustomerAuth = await authorize_customer_join(
    anotherCustomerConnection,
    {
      body: {},
    },
  );
  anotherCustomerConnection.headers = {
    Authorization: anotherCustomerAuth.token.access,
  };
  await TestValidator.error("unauthorized update attempt", async () => {
    await api.functional.shoppingMall.customer.sale_reviews.update(
      anotherCustomerConnection,
      {
        reviewId,
        body: { rating: 3 } satisfies IShoppingMallSaleReview.IUpdate,
      },
    );
  });
}
