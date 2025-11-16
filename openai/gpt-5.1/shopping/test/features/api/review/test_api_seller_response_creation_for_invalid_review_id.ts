import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";
import type { IShoppingMallProductReviewSellerResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewSellerResponse";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";

export async function test_api_seller_response_creation_for_invalid_review_id(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a seller so that we have a valid seller actor
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(seller);

  // 2. Generate a random UUID to be used as an invalid/non-existent reviewId
  const invalidReviewId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Prepare a syntactically valid seller response body
  const responseBody = {
    body: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 8,
    }),
  } satisfies IShoppingMallProductReviewSellerResponse.ICreate;

  // 4. Call the create endpoint and assert that it fails for the invalid reviewId
  await TestValidator.error(
    "creating seller response with invalid reviewId must fail",
    async () => {
      await api.functional.shoppingMall.seller.reviews.sellerResponse.create(
        connection,
        {
          reviewId: invalidReviewId,
          body: responseBody,
        },
      );
    },
  );
}
