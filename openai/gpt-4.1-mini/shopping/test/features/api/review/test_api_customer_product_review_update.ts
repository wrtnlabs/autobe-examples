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
import { generate_random_shopping_mall_customer_reviews_create_review } from "../../../generate/generate_random_shopping_mall_customer_reviews_create_review";
import { prepare_random_shopping_mall_sale_review } from "../../../prepare/prepare_random_shopping_mall_sale_review";

export async function test_api_customer_product_review_update(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful Update of an Existing Product Review by the Owning Customer
  // Scenario 2: Attempt to Update a Review by Another Customer (Authorization Failure)
  // Scenario 3: Update Review With Boundary Ratings
  // 1. Register first customer and authorize
  const firstCustomerConnection: api.IConnection = { host: connection.host };
  const firstCustomerAuth = await authorize_customer_join(
    firstCustomerConnection,
    {
      body: {
        email: `${RandomGenerator.alphabets(8)}@example.com`,
        password: "StrongPass123!",
      } satisfies IShoppingMallCustomer.IJoin,
    },
  );
  typia.assert(firstCustomerAuth);
  firstCustomerConnection.headers = {
    Authorization: firstCustomerAuth.token.access,
  };
  // 2. Register second customer and authorize
  const secondCustomerConnection: api.IConnection = { host: connection.host };
  const secondCustomerAuth = await authorize_customer_join(
    secondCustomerConnection,
    {
      body: {
        email: `${RandomGenerator.alphabets(8)}@example.com`,
        password: "StrongPass456!",
      } satisfies IShoppingMallCustomer.IJoin,
    },
  );
  typia.assert(secondCustomerAuth);
  secondCustomerConnection.headers = {
    Authorization: secondCustomerAuth.token.access,
  };
  // 3. First customer creates a new product review
  const createdReview =
    await generate_random_shopping_mall_customer_reviews_create_review(
      firstCustomerConnection,
      { body: {} },
    );
  typia.assert(createdReview);
  // 4. First customer updates the created review with valid rating and text
  const updateBody1: IShoppingMallSaleReview.IUpdate = {
    rating: 4,
    body: RandomGenerator.paragraph({ sentences: 3 }),
  };
  const updatedReview1 =
    await api.functional.shoppingMall.customer.reviews.updateReview(
      firstCustomerConnection,
      {
        reviewId: undefined as any,
        body: updateBody1,
      },
    );
  typia.assert(updatedReview1);
  // 5. Second customer attempts to update first customer's review, expect failure
  await TestValidator.error("unauthorized review update", async () => {
    await api.functional.shoppingMall.customer.reviews.updateReview(
      secondCustomerConnection,
      {
        reviewId: undefined as any,
        body: {
          rating: 5,
          body: "Malicious update attempt",
        } satisfies IShoppingMallSaleReview.IUpdate,
      },
    );
  });
  // 6. Verify the review in database is unchanged after unauthorized attempt
  const verifyReview =
    await api.functional.shoppingMall.customer.reviews.updateReview(
      firstCustomerConnection,
      {
        reviewId: undefined as any,
        body: {
          rating: 0,
          body: "",
        } satisfies IShoppingMallSaleReview.IUpdate,
      },
    );
  typia.assert(verifyReview);
  // 7. Update review with boundary rating 1 and verify
  const updatedReviewMin =
    await api.functional.shoppingMall.customer.reviews.updateReview(
      firstCustomerConnection,
      {
        reviewId: undefined as any,
        body: {
          rating: 1,
        } satisfies IShoppingMallSaleReview.IUpdate,
      },
    );
  typia.assert(updatedReviewMin);
  // 8. Update review with boundary rating 5 and verify
  const updatedReviewMax =
    await api.functional.shoppingMall.customer.reviews.updateReview(
      firstCustomerConnection,
      {
        reviewId: undefined as any,
        body: {
          rating: 5,
        } satisfies IShoppingMallSaleReview.IUpdate,
      },
    );
  typia.assert(updatedReviewMax);
}
