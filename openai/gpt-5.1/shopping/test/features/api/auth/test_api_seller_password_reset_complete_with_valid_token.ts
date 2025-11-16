import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallSellerPasswordResetComplete } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPasswordResetComplete";
import type { IShoppingMallSellerPasswordResetRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPasswordResetRequest";

/**
 * Validate completing a seller password reset with a valid token.
 *
 * Business intent (adapted to available APIs):
 *
 * - Exercise the happy-path flow where a seller initiates a password reset and
 *   then completes it by providing a (conceptually) valid token and strong new
 *   password.
 * - Because this E2E test harness only exposes high-level password-reset APIs
 *   (request + complete) and no DB or login endpoints, we treat the
 *   token/new-password pair as an opaque contract with the backend rather than
 *   verifying DB state or subsequent login behavior.
 *
 * Steps implemented:
 *
 * 1. Generate a random seller email.
 * 2. Call POST /auth/seller/password/reset/request to initiate a reset.
 *
 *    - Verify the response DTO structure using typia.assert.
 * 3. Construct a plausible opaque reset token string and a strong new password
 *    string.
 * 4. Call POST /auth/seller/password/reset/complete with the token and new
 *    password.
 *
 *    - Verify the response DTO structure using typia.assert.
 *    - Assert that the logical success flag is true.
 *
 * Notes / limitations:
 *
 * - The original scenario described DB-level validation of
 *   shopping_mall_password_reset_tokens and shopping_mall_auth_credentials, as
 *   well as auth log / security event checks and re-login verification. Those
 *   are intentionally omitted here because the necessary APIs and helpers are
 *   not available in this test context.
 */
export async function test_api_seller_password_reset_complete_with_valid_token(
  connection: api.IConnection,
) {
  // 1. Generate a random seller email address.
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  // 2. Initiate a password reset request for this email.
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

  // Sanity check that the request phase reports success.
  TestValidator.predicate(
    "seller password reset request should report success",
    requestResponse.success === true,
  );

  // 3. Construct a plausible opaque reset token and new strong password.
  //    Token: long random alphanumeric string.
  const token: string = RandomGenerator.alphaNumeric(64);
  const newPassword: string = RandomGenerator.alphaNumeric(24);

  // 4. Complete the seller password reset with token + new password.
  const completeBody = {
    token,
    password: newPassword,
  } satisfies IShoppingMallSellerPasswordResetComplete.IRequest;

  const completeResponse: IShoppingMallSellerPasswordResetComplete.IResponse =
    await api.functional.auth.seller.password.reset.complete.completePasswordReset(
      connection,
      { body: completeBody },
    );
  typia.assert<IShoppingMallSellerPasswordResetComplete.IResponse>(
    completeResponse,
  );

  // Assert that the completion operation reports success.
  TestValidator.predicate(
    "seller password reset completion should report success",
    completeResponse.success === true,
  );
}
