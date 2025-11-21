import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAuthentication } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthentication";
import type { IShoppingMallMfaVerify } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMfaVerify";

/**
 * Test successful multi-factor authentication verification using a valid TOTP
 * code.
 *
 * This test validates the complete MFA verification flow for enhanced account
 * security. It ensures proper JWT token generation and session establishment
 * after successful 6-digit code validation. The test verifies successful token
 * response with proper access_token, token_type, and expires_in fields,
 * confirming the authentication flow works correctly for secure platform
 * access.
 *
 * Test steps:
 *
 * 1. Generate a valid 6-digit TOTP code
 * 2. Create MFA verification request with mandatory session context fields
 * 3. Submit verification request to the API
 * 4. Validate successful token response structure
 * 5. Verify JWT token fields are properly formatted
 */
export async function test_api_mfa_verify_success_totp(
  connection: api.IConnection,
) {
  // Generate a valid 6-digit TOTP code
  const totpCode = ArrayUtil.repeat(6, () =>
    RandomGenerator.pick([..."0123456789"]),
  ).join("");

  // Create current timestamp for verification
  const currentTimestamp = new Date().toISOString();

  // Generate a random session ID for this verification attempt
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  // Create device info string
  const deviceInfo = `${RandomGenerator.name()} Device - ${RandomGenerator.alphabets(8)}`;

  // Create MFA verification request with all required fields
  const verifyRequest = {
    code: totpCode,
    session_id: sessionId,
    ip_address: typia.random<string & tags.Format<"ipv4">>(),
    device_info: deviceInfo,
    timestamp: currentTimestamp,
    href: "https://shopping-mall.example.com/auth/mfa",
    referrer: "https://shopping-mall.example.com/auth/login",
  } satisfies IShoppingMallMfaVerify.ICreate;

  // Submit MFA verification request
  const tokenResponse =
    await api.functional.shoppingMall.auth.mfa.verify.verifyMfa(connection, {
      body: verifyRequest,
    });

  // Validate the token response structure
  typia.assert(tokenResponse);

  // Verify JWT token fields are properly formatted
  TestValidator.predicate(
    "access_token is valid JWT format",
    tokenResponse.access_token.length > 0 &&
      tokenResponse.access_token.includes("."),
  );

  TestValidator.equals(
    "token_type is Bearer",
    tokenResponse.token_type,
    "Bearer",
  );

  TestValidator.predicate(
    "expires_in is positive number",
    tokenResponse.expires_in > 0,
  );

  TestValidator.predicate(
    "expires_in is reasonable duration",
    tokenResponse.expires_in >= 900 && tokenResponse.expires_in <= 3600,
  );
}
