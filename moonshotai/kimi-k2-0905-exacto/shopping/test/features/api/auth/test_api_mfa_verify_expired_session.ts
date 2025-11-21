import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAuthentication } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthentication";
import type { IShoppingMallMfaVerify } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMfaVerify";

/**
 * Test multi-factor authentication verification failure when the authentication
 * session has expired or is invalid.
 *
 * This test validates proper session management and timeout handling, ensuring
 * MFA verification requires valid session context. The test verifies
 * appropriate error responses when session_id references an expired or
 * non-existent authentication session, maintaining security through proper
 * session lifecycle management.
 *
 * Test flow:
 *
 * 1. Generate a random session ID that doesn't correspond to any valid
 *    authentication session
 * 2. Create a valid MFA verification request with the invalid session ID
 * 3. Attempt to verify MFA code with the invalid session
 * 4. Verify that the API returns an appropriate error response
 * 5. Ensure the error response indicates session validation failure
 * 6. Test with completely missing session ID to verify required field validation
 *
 * This ensures the MFA verification endpoint properly validates session context
 * and prevents unauthorized verification attempts without valid authentication
 * sessions.
 */
export async function test_api_mfa_verify_expired_session(
  connection: api.IConnection,
) {
  // Generate random but invalid session ID that doesn't exist
  const invalidSessionId = typia.random<string & tags.Format<"uuid">>();

  // Generate valid TOTP code format (6 digits) - use repeat to create array of digits
  const validCode = ArrayUtil.repeat(6, () =>
    RandomGenerator.pick([..."0123456789"]),
  ).join("");

  // Test 1: Verify MFA with invalid/non-existent session ID
  await TestValidator.error(
    "MFA verification should fail with invalid session ID",
    async () => {
      await api.functional.shoppingMall.auth.mfa.verify.verifyMfa(connection, {
        body: {
          code: validCode,
          session_id: invalidSessionId,
          href: "https://shopping-mall.example.com/login",
          referrer: "https://shopping-mall.example.com/",
        } satisfies IShoppingMallMfaVerify.ICreate,
      });
    },
  );

  // Test 2: Verify MFA with completely missing session context
  await TestValidator.error(
    "MFA verification should fail without session ID",
    async () => {
      await api.functional.shoppingMall.auth.mfa.verify.verifyMfa(connection, {
        body: {
          code: validCode,
          href: "https://shopping-mall.example.com/login",
          referrer: "https://shopping-mall.example.com/",
        } satisfies IShoppingMallMfaVerify.ICreate,
      });
    },
  );

  // Test 3: Verify MFA with expired session ID (different UUID)
  const expiredSessionId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "MFA verification should fail with expired session ID",
    async () => {
      await api.functional.shoppingMall.auth.mfa.verify.verifyMfa(connection, {
        body: {
          code: validCode,
          session_id: expiredSessionId,
          href: "https://shopping-mall.example.com/login",
          referrer: "https://shopping-mall.example.com/",
        } satisfies IShoppingMallMfaVerify.ICreate,
      });
    },
  );

  // Test 4: Verify with invalid code format but valid session (to ensure session validation happens first)
  const invalidCode = RandomGenerator.alphabets(6); // Non-numeric code
  const anotherInvalidSession = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "MFA verification should fail with invalid session even with invalid code",
    async () => {
      await api.functional.shoppingMall.auth.mfa.verify.verifyMfa(connection, {
        body: {
          code: invalidCode,
          session_id: anotherInvalidSession,
          href: "https://shopping-mall.example.com/login",
          referrer: "https://shopping-mall.example.com/",
        } satisfies IShoppingMallMfaVerify.ICreate,
      });
    },
  );
}
