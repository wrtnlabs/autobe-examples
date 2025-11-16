import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";
import type { IShoppingMallProductReviewSellerResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewSellerResponse";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";

export async function test_api_seller_update_response_for_nonexistent_review(
  connection: api.IConnection,
) {
  // 1. Register a seller and establish authenticated seller context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password-1234",
    storeName: RandomGenerator.name(),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const seller = await api.functional.auth.seller.join(connection, {
    body: joinBody,
  });
  typia.assert<IShoppingMallSeller.IAuthorized>(seller);

  // 2. Prepare a random reviewId that should not correspond to any existing review
  const nonExistentReviewId = typia.random<string & tags.Format<"uuid">>();

  // 3. Prepare a valid seller response update payload
  const updateBody = {
    body: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 3,
      wordMax: 8,
    }),
  } satisfies IShoppingMallProductReviewSellerResponse.IUpdate;

  // 4. Attempt to update the seller response for the non-existent review
  //    Expectation: the API must fail (e.g., not-found style error) and not create a response.
  await TestValidator.error(
    "updating seller response for non-existent review must fail",
    async () => {
      await api.functional.shoppingMall.seller.reviews.sellerResponse.update(
        connection,
        {
          reviewId: nonExistentReviewId,
          body: updateBody,
        },
      );
    },
  );
}
