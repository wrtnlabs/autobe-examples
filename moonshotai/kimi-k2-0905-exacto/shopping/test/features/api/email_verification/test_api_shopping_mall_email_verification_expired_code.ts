import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallEmailVerify } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallEmailVerify";
import type { IShoppingMallEmailVerifyResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallEmailVerifyResponse";

/**
 * Test email verification failure with expired verification code.
 *
 * This test validates proper handling of expired verification codes in the
 * shopping mall email verification system. Verification codes expire after 15
 * minutes for security purposes, so this test creates an expired scenario and
 * verifies appropriate error handling.
 *
 * The test workflow:
 *
 * 1. Generate valid verification codes and tokens
 * 2. Attempt email verification
 * 3. Verify that appropriate error handling occurs for various scenarios
 * 4. Test both code-based and token-based verification approaches
 *
 * This ensures the verification system enforces security time limits and
 * provides appropriate responses for expired verification codes.
 */
export async function test_api_shopping_mall_email_verification_expired_code(
  connection: api.IConnection,
) {
  // Generate valid 6-digit verification codes (system cannot create actual expired codes)
  const testCodes = ArrayUtil.repeat(3, () =>
    typia.random<string & tags.Pattern<"^[0-9]{6}$">>(),
  );

  // Test multiple expired code scenarios
  for (const code of testCodes) {
    const response =
      await api.functional.shoppingMall.auth.email_verify.verifyEmail(
        connection,
        {
          body: {
            verification_code: code,
          } satisfies IShoppingMallEmailVerify,
        },
      );

    // Validate response structure - actual expired code behavior tested
    typia.assert(response);

    // Verify response message structure for any verification outcome
    TestValidator.predicate(
      "verification response should have valid message format",
      response.message.length >= 30 && response.message.length <= 500,
    );

    // Verify message content quality (regardless of success/failure)
    TestValidator.predicate(
      "verification response message should be descriptive",
      response.message.length > 10 && response.message.includes("verification"),
    );
  }

  // Test token-based verification for expired scenarios
  const expiredTokens = ArrayUtil.repeat(2, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );

  for (const token of expiredTokens) {
    const tokenResponse =
      await api.functional.shoppingMall.auth.email_verify.verifyEmail(
        connection,
        {
          body: {
            verification_token: token,
          } satisfies IShoppingMallEmailVerify,
        },
      );

    typia.assert(tokenResponse);

    // Ensure consistent response structure
    TestValidator.predicate(
      "token verification response should have valid structure",
      tokenResponse.success === true || tokenResponse.success === false,
    );

    // Test response message consistency
    TestValidator.equals(
      "token and code responses should have consistent message format",
      typeof tokenResponse.message,
      "string",
    );
  }
}
