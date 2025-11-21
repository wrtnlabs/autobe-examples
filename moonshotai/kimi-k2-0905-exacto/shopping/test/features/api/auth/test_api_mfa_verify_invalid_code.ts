import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAuthentication } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthentication";
import type { IShoppingMallMfaVerify } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMfaVerify";

/**
 * Test multi-factor authentication verification failure when providing an
 * invalid TOTP code.
 *
 * This test validates the security measures implemented for MFA verification by
 * attempting to verify with an invalid authentication code. The system should
 * properly reject such attempts and maintain account security by not granting
 * access tokens.
 *
 * Test flow:
 *
 * 1. Generate a realistic MFA verification request with invalid code
 * 2. Submit the request to the verification endpoint
 * 3. Validate that the system rejects the invalid code
 * 4. Ensure no authentication token is granted
 * 5. Verify appropriate error handling and security responses
 */
export async function test_api_mfa_verify_invalid_code(
  connection: api.IConnection,
) {
  // Step 1: Generate an invalid TOTP code (not a valid 6-digit number)
  const invalidCode = RandomGenerator.alphabets(6); // Random letters instead of digits

  // Step 2: Create a realistic MFA verification request with invalid code
  const mfaRequestBody = {
    code: invalidCode,
    session_id: typia.random<string & tags.Format<"uuid">>(),
    ip_address: typia.random<string & tags.Format<"ipv4">>(),
    device_info: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 5,
      wordMax: 10,
    }),
    timestamp: new Date().toISOString(),
    href: "https://shoppingmall.example.com/login/verify",
    referrer: "https://shoppingmall.example.com/login",
  } satisfies IShoppingMallMfaVerify.ICreate;

  // Step 3: Attempt to verify with invalid code
  await TestValidator.error(
    "MFA verification should fail with invalid TOTP code",
    async () => {
      await api.functional.shoppingMall.auth.mfa.verify.verifyMfa(connection, {
        body: mfaRequestBody,
      });
    },
  );

  // Step 4: Test with another invalid code format (wrong length)
  const wrongLengthCode = RandomGenerator.alphaNumeric(4); // Too short
  const mfaRequestBody2 = {
    code: wrongLengthCode,
    session_id: typia.random<string & tags.Format<"uuid">>(),
    ip_address: typia.random<string & tags.Format<"ipv4">>(),
    device_info: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 4,
      wordMax: 8,
    }),
    timestamp: new Date().toISOString(),
    href: "https://shoppingmall.example.com/login/verify",
    referrer: "https://shoppingmall.example.com/login",
  } satisfies IShoppingMallMfaVerify.ICreate;

  await TestValidator.error(
    "MFA verification should fail with wrong-length code",
    async () => {
      await api.functional.shoppingMall.auth.mfa.verify.verifyMfa(connection, {
        body: mfaRequestBody2,
      });
    },
  );
}
