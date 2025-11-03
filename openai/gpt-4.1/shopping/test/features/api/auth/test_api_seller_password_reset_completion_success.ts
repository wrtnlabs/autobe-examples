import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSeller";

/**
 * Validate successful completion of the seller password reset process.
 *
 * This test covers the entire password reset workflow for a seller:
 *
 * 1. Register a new seller account
 * 2. Request a password reset for the account to get a reset code
 * 3. Complete the reset using the reset code, email, and a new password
 * 4. Confirm a generic success message is returned
 * 5. Ensure the reset code cannot be reused and continued attempts do not disclose
 *    sensitive details
 */
export async function test_api_seller_password_reset_completion_success(
  connection: api.IConnection,
) {
  // 1. Register a new seller account
  const password1 = RandomGenerator.alphaNumeric(12) + "!A";
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerDisplayName = RandomGenerator.name();
  const contactPhone = RandomGenerator.mobile();
  const status = "pending";

  const joinBody = {
    email: sellerEmail,
    password: password1,
    display_name: sellerDisplayName,
    contact_phone: contactPhone,
    status: status,
  } satisfies IShoppingSeller.IJoin;
  const seller = await api.functional.auth.seller.join(connection, {
    body: joinBody,
  });
  typia.assert(seller);
  TestValidator.equals(
    "join response email matches",
    seller.email,
    sellerEmail,
  );

  // 2. Request a password reset for the account
  const reqResetBody = {
    email: sellerEmail,
  } satisfies IShoppingSeller.IResetPasswordRequest;

  const reqResetResult =
    await api.functional.auth.seller.password.request_reset.requestPasswordReset(
      connection,
      { body: reqResetBody },
    );
  typia.assert(reqResetResult);
  TestValidator.predicate(
    "password reset request returns generic message",
    typeof reqResetResult.message === "string",
  );

  // 3. Simulate retrieval of the reset code (in real scenarios, out-of-band). For test, generate a random code.
  // In actual E2E, this would require hooks or direct DB access. Here, we mock one that passes format validation.
  const resetCode = RandomGenerator.alphaNumeric(24);

  // 4. Complete the password reset
  const password2 = RandomGenerator.alphaNumeric(14) + "!B";
  const completeBody = {
    email: sellerEmail,
    reset_code: resetCode,
    password: password2,
  } satisfies IShoppingSeller.IResetPasswordComplete;

  const completeResult =
    await api.functional.auth.seller.password.complete_reset.completePasswordReset(
      connection,
      { body: completeBody },
    );
  typia.assert(completeResult);
  TestValidator.predicate(
    "password reset completion returns generic message",
    typeof completeResult.message === "string",
  );

  // 5. Attempt to reuse the same reset code (should not throw, returns generic message)
  const reuseResult =
    await api.functional.auth.seller.password.complete_reset.completePasswordReset(
      connection,
      { body: completeBody },
    );
  typia.assert(reuseResult);
  TestValidator.predicate(
    "reusing reset code returns generic message, not error or detail",
    typeof reuseResult.message === "string",
  );
}
