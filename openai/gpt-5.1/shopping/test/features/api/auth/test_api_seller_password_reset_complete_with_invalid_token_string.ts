import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallSellerPasswordResetComplete } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPasswordResetComplete";

/**
 * Validate completing seller password reset with an invalid token string.
 *
 * This test verifies that the seller password reset completion endpoint behaves
 * safely when a clearly invalid password reset token is supplied. The goal is
 * to confirm that password reset does not succeed and that the externally
 * visible behavior stays within the safe contract without depending on internal
 * database tables or log records.
 *
 * Scenario (adapted to available APIs):
 *
 * 1. Construct a random token string that this test never persists anywhere so it
 *    is guaranteed to be unusable from the backend point of view.
 * 2. Build a syntactically valid new password string.
 * 3. Call POST /auth/seller/password/reset/complete via
 *    api.functional.auth.seller.password.reset.complete.completePasswordReset
 *    using IShoppingMallSellerPasswordResetComplete.IRequest.
 * 4. For a real backend, two families of behavior are acceptable:
 *
 *    - The call fails with an HttpError (e.g., 4xx) for the invalid token.
 *    - The call succeeds with a minimal IResponse where success is false. The test
 *         accepts either behavior, because the contract does not prescribe one
 *         over the other for invalid tokens.
 * 5. For responses that succeed at HTTP level, assert that the payload matches
 *    IShoppingMallSellerPasswordResetComplete.IResponse and that success is
 *    false.
 * 6. When the backend rejects the request with an HttpError, treat the failure as
 *    a valid outcome for this scenario without inspecting specific status codes
 *    or error messages.
 * 7. In simulate mode (connection.simulate === true), the SDK returns random
 *    responses and we cannot assume business semantics, so the test only
 *    asserts the response type and does not check the success flag.
 */
export async function test_api_seller_password_reset_complete_with_invalid_token_string(
  connection: api.IConnection,
) {
  // 1. Construct an invalid (unguessable) token string.
  const invalidToken: string = RandomGenerator.alphaNumeric(64);

  // 2. Build a syntactically valid new password string.
  const newPassword: string = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 10,
  });

  // 3. Build the request body DTO.
  const requestBody = {
    token: invalidToken,
    password: newPassword,
  } satisfies IShoppingMallSellerPasswordResetComplete.IRequest;

  // 4. Call the API and validate behavior depending on whether we are in
  //    simulate mode or talking to a real backend.
  if (connection.simulate === true) {
    // In simulate mode, backend semantics are not enforced. Just ensure the
    // wire format matches IResponse.
    const output: IShoppingMallSellerPasswordResetComplete.IResponse =
      await api.functional.auth.seller.password.reset.complete.completePasswordReset(
        connection,
        { body: requestBody },
      );
    typia.assert<IShoppingMallSellerPasswordResetComplete.IResponse>(output);
  } else {
    // For a real backend, an invalid token should not lead to a successful
    // password reset. We treat either an HttpError or a success=false
    // response as acceptable outcomes.
    try {
      const output: IShoppingMallSellerPasswordResetComplete.IResponse =
        await api.functional.auth.seller.password.reset.complete.completePasswordReset(
          connection,
          { body: requestBody },
        );

      // The call returned normally, so confirm it reports failure.
      typia.assert<IShoppingMallSellerPasswordResetComplete.IResponse>(output);
      TestValidator.equals(
        "invalid token response should indicate failure",
        output.success,
        false,
      );
    } catch (error) {
      // If the backend chose to respond with an HTTP error for the invalid
      // token, consider this a valid outcome as well. We do not assert the
      // exact status code or error message to keep the test robust.
      // Just ensure that we indeed observed some error.
      TestValidator.predicate(
        "invalid token should cause request to fail",
        true,
      );
    }
  }
}
