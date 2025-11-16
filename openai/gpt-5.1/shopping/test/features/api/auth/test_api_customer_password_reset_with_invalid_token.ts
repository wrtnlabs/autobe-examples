import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";

/**
 * Validate customer password reset completion failure with an invalid token.
 *
 * Business goal
 *
 * - Ensure that POST /auth/customer/password/reset rejects clearly invalid or
 *   non-existent reset tokens and does not issue any
 *   IShoppingMallCustomer.IAuthorized envelope.
 * - Confirm that the API responds with a proper HTTP error and that the response
 *   body does not accidentally look like a successful authorization object.
 *
 * Scope and limitations
 *
 * - The scenario text mentions DB tables like shopping_mall_password_reset_tokens
 *   and shopping_mall_auth_logs, but those are not directly observable from the
 *   public SDK. Therefore, this test limits itself to HTTP-level behavior:
 *   status code, thrown HttpError, and absence of a success-typed response.
 * - We do not attempt to validate internal logging or token consumption flags.
 *
 * High-level steps
 *
 * 1. Construct an IShoppingMallCustomerAuth.IResetPassword payload with a token
 *    that is extremely unlikely to exist and a strong new password.
 * 2. Call api.functional.auth.customer.password.reset.resetPassword with this
 *    payload.
 * 3. Use TestValidator.httpError to assert that an HttpError is thrown with a 4xx
 *    client error status (e.g., 400/404).
 * 4. Additionally, ensure that no IShoppingMallCustomer.IAuthorized object is
 *    returned by never having a success path that consumes its value.
 */
export async function test_api_customer_password_reset_with_invalid_token(
  connection: api.IConnection,
) {
  // 1. Build an obviously invalid/non-existent token and a new password.
  const invalidToken: string = typia.random<string>();
  const newPassword: string = "Str0ng!Password-" + typia.random<string>();

  const body = {
    token: invalidToken,
    password: newPassword,
  } satisfies IShoppingMallCustomerAuth.IResetPassword;

  // 2. Call the endpoint and assert it fails with a client HTTP error.
  await TestValidator.httpError(
    "invalid password reset token should be rejected",
    [400, 401, 403, 404],
    async () => {
      return await api.functional.auth.customer.password.reset.resetPassword(
        connection,
        { body },
      );
    },
  );
}
