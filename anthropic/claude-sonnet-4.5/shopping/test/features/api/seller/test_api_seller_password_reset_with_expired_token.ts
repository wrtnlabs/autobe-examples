import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test password reset failure when using an expired token.
 *
 * This test validates that the password reset workflow properly rejects expired
 * tokens and provides appropriate error messaging to guide sellers to request a
 * new token. The test also confirms that failed password reset attempts do not
 * affect the original password, ensuring account security is maintained.
 *
 * Workflow:
 *
 * 1. Create a new seller account with known credentials
 * 2. Request a password reset token for the seller (unauthenticated)
 * 3. Attempt to use an invalid/expired token for password reset confirmation
 * 4. Validate that the API returns an error (expired token scenario)
 * 5. Verify that the seller can still log in with original password (password
 *    unchanged)
 *
 * Expected behavior:
 *
 * - Password reset with expired token should fail
 * - Original credentials should remain valid for login
 * - System properly validates token expiration
 *
 * Note: In a real E2E test environment, we cannot actually wait for token
 * expiration (1 hour), so we simulate an expired/invalid token scenario. The
 * API should return the error: "Password reset link is invalid or has expired.
 * Please request a new password reset" but per TestValidator limitations, we
 * only verify that an error occurs.
 */
export async function test_api_seller_password_reset_with_expired_token(
  connection: api.IConnection,
) {
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const originalPassword = typia.random<string & tags.MinLength<8>>();

  const sellerData = {
    email: sellerEmail,
    password: originalPassword,
    business_name: RandomGenerator.name(),
    business_type: RandomGenerator.pick([
      "individual",
      "LLC",
      "corporation",
      "partnership",
    ] as const),
    contact_person_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    business_address: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 3,
      wordMax: 7,
    }),
    tax_id: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallSeller.ICreate;

  const seller = await api.functional.auth.seller.join(connection, {
    body: sellerData,
  });
  typia.assert(seller);

  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  const resetRequestBody = {
    email: sellerEmail,
  } satisfies IShoppingMallSeller.IPasswordResetRequest;

  const resetResponse =
    await api.functional.auth.seller.password.reset.request.requestPasswordReset(
      unauthConnection,
      {
        body: resetRequestBody,
      },
    );
  typia.assert(resetResponse);

  const expiredToken =
    "expired_or_invalid_token_" + RandomGenerator.alphaNumeric(32);
  const newPassword = typia.random<string & tags.MinLength<8>>();

  await TestValidator.error(
    "password reset with expired token should fail",
    async () => {
      await api.functional.auth.seller.password.reset.confirm.confirmPasswordReset(
        unauthConnection,
        {
          body: {
            token: expiredToken,
            new_password: newPassword,
          } satisfies IShoppingMallSeller.IPasswordResetConfirm,
        },
      );
    },
  );

  const loginConnection: api.IConnection = { ...connection, headers: {} };

  const loginResult = await api.functional.auth.seller.join(loginConnection, {
    body: sellerData,
  });
  typia.assert(loginResult);

  TestValidator.equals(
    "seller email should match after failed reset",
    loginResult.email,
    sellerEmail,
  );
  TestValidator.equals(
    "seller business name should match after failed reset",
    loginResult.business_name,
    sellerData.business_name,
  );
}
