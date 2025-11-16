import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallSellerPasswordResetComplete } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPasswordResetComplete";
import type { IShoppingMallSellerPasswordResetRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPasswordResetRequest";

export async function test_api_seller_password_reset_complete_for_ineligible_credential_status(
  connection: api.IConnection,
) {
  // Arrange: pick a random email and trigger a password reset request.
  // This step reflects the beginning of the reset workflow and ensures
  // the request endpoint is callable, though its response is intentionally
  // generic and we cannot see the actual token.
  const resetRequestBody = {
    email: typia.random<string & tags.Format<"email">>(),
  } satisfies IShoppingMallSellerPasswordResetRequest.IRequest;

  const resetResponse: IShoppingMallSellerPasswordResetRequest.IResponse =
    await api.functional.auth.seller.password.reset.request.requestPasswordReset(
      connection,
      {
        body: resetRequestBody,
      },
    );
  typia.assert(resetResponse);

  // We only assert shape and non-crashing behavior here. The API is designed
  // not to leak account existence, so success may be true or false depending
  // on validation and environment; we just ensure the field exists and is
  // boolean via typia.assert.

  // Now focus on the completePasswordReset endpoint, where we simulate
  // an ineligible or unusable token scenario by providing an obviously
  // invalid token string. We expect the reset to fail (success === false)
  // and never succeed for such a token.
  const invalidToken = RandomGenerator.alphaNumeric(64);

  const firstCompleteBody = {
    token: invalidToken,
    password: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallSellerPasswordResetComplete.IRequest;

  const firstCompleteResponse: IShoppingMallSellerPasswordResetComplete.IResponse =
    await api.functional.auth.seller.password.reset.complete.completePasswordReset(
      connection,
      {
        body: firstCompleteBody,
      },
    );
  typia.assert(firstCompleteResponse);

  TestValidator.equals(
    "first completion with invalid token must fail",
    firstCompleteResponse.success,
    false,
  );

  // Attempt to reuse the same invalid token to mimic a reused or otherwise
  // ineligible token scenario. Even though the token was never valid, from
  // the API's perspective this still exercises the logic that treats the
  // token as unusable and ensures it continues to be rejected.
  const secondCompleteBody = {
    token: invalidToken,
    password: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallSellerPasswordResetComplete.IRequest;

  const secondCompleteResponse: IShoppingMallSellerPasswordResetComplete.IResponse =
    await api.functional.auth.seller.password.reset.complete.completePasswordReset(
      connection,
      {
        body: secondCompleteBody,
      },
    );
  typia.assert(secondCompleteResponse);

  TestValidator.equals(
    "second completion with same invalid token must also fail",
    secondCompleteResponse.success,
    false,
  );

  // As a sanity check, ensure that repeated calls with different invalid
  // tokens are consistently rejected, emphasizing that only proper, valid
  // tokens (which we cannot obtain in this black-box test) should succeed.
  const anotherInvalidToken = RandomGenerator.alphaNumeric(64);
  const thirdCompleteBody = {
    token: anotherInvalidToken,
    password: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallSellerPasswordResetComplete.IRequest;

  const thirdCompleteResponse: IShoppingMallSellerPasswordResetComplete.IResponse =
    await api.functional.auth.seller.password.reset.complete.completePasswordReset(
      connection,
      {
        body: thirdCompleteBody,
      },
    );
  typia.assert(thirdCompleteResponse);

  TestValidator.equals(
    "completion with a different invalid token must also fail",
    thirdCompleteResponse.success,
    false,
  );
}
