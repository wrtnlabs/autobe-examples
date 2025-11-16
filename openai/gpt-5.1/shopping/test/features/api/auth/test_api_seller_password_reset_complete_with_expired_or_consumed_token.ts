import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallSellerPasswordResetComplete } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPasswordResetComplete";
import type { IShoppingMallSellerPasswordResetRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPasswordResetRequest";

/**
 * Validate that completing seller password reset with an invalid or reused
 * token is rejected and does not report success.
 *
 * Business context and limitations:
 *
 * - The backend exposes only two endpoints for this flow:
 *
 *   - POST /auth/seller/password/reset/request: begin reset by email
 *   - POST /auth/seller/password/reset/complete: finish reset with token+password
 * - Internal tables (shopping_mall_password_reset_tokens,
 *   shopping_mall_auth_credentials, shopping_mall_auth_logs,
 *   shopping_mall_security_events) are not visible via the API or SDK, so we
 *   cannot directly manipulate expires_at/consumed_at or inspect logs.
 * - The response for completion is minimal: { success: boolean }. We must treat
 *   it and any HttpError as our observable behavior.
 *
 * Therefore this test focuses on black-box behavior that is still meaningful:
 *
 * 1. Issue a password reset request for a random email using requestPasswordReset.
 * 2. Attempt to complete a password reset with clearly invalid/random tokens that
 *    are extremely unlikely to match any stored reset token.
 * 3. Assert that such completion attempts are rejected, either via:
 *
 *    - HttpError thrown by the client; or
 *    - A normal HTTP response with
 *         IShoppingMallSellerPasswordResetComplete.IResponse where success ===
 *         false.
 * 4. Repeat with a second different random token to emulate the idea that trying
 *    again with another (or consumed) token is still rejected.
 *
 * This approximates the original intent (expired/consumed tokens must not
 * succeed) within the constraints of the public API and maintains strict type
 * safety.
 */
export async function test_api_seller_password_reset_complete_with_expired_or_consumed_token(
  connection: api.IConnection,
) {
  // 1. Trigger a password reset request for a random email.
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const requestBody = {
    email,
  } satisfies IShoppingMallSellerPasswordResetRequest.IRequest;

  const requestResponse: IShoppingMallSellerPasswordResetRequest.IResponse =
    await api.functional.auth.seller.password.reset.request.requestPasswordReset(
      connection,
      { body: requestBody },
    );
  typia.assert<IShoppingMallSellerPasswordResetRequest.IResponse>(
    requestResponse,
  );

  // 2. Prepare two clearly invalid/random tokens that should not exist.
  const invalidToken1: string = RandomGenerator.alphaNumeric(64);
  const invalidToken2: string = RandomGenerator.alphaNumeric(64);

  const newPassword1: string = RandomGenerator.alphaNumeric(24);
  const newPassword2: string = RandomGenerator.alphaNumeric(24);

  // Helper to call completePasswordReset and normalize result to a boolean flag
  // indicating whether the completion was (incorrectly) accepted.
  const tryComplete = async (
    token: string,
    password: string,
  ): Promise<{
    accepted: boolean;
    response: IShoppingMallSellerPasswordResetComplete.IResponse | null;
  }> => {
    const completeBody = {
      token,
      password,
    } satisfies IShoppingMallSellerPasswordResetComplete.IRequest;

    try {
      const output: IShoppingMallSellerPasswordResetComplete.IResponse =
        await api.functional.auth.seller.password.reset.complete.completePasswordReset(
          connection,
          { body: completeBody },
        );
      typia.assert<IShoppingMallSellerPasswordResetComplete.IResponse>(output);
      return {
        accepted: output.success === true,
        response: output,
      };
    } catch (_error) {
      // If an HttpError or any other error is thrown, we treat it as rejection.
      return {
        accepted: false,
        response: null,
      };
    }
  };

  // 3. Try to complete with the first invalid token.
  const firstAttempt = await tryComplete(invalidToken1, newPassword1);

  // The API must not accept this invalid token.
  TestValidator.predicate(
    "first invalid token must not be accepted for password reset completion",
    firstAttempt.accepted === false,
  );

  // 4. Try again with a second, different invalid token to emulate expired/consumed reuse.
  const secondAttempt = await tryComplete(invalidToken2, newPassword2);

  TestValidator.predicate(
    "second invalid token must also be rejected for password reset completion",
    secondAttempt.accepted === false,
  );
}
