import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAuthentication } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthentication";
import type { IShoppingMallMfaVerify } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMfaVerify";

export async function test_api_mfa_verify_rate_limiting(
  connection: api.IConnection,
) {
  // Generate valid MFA verification request with proper session context
  const validMfaRequest = {
    code: typia.random<string & tags.Pattern<"^[0-9]{6}$">>(),
    href: "https://shopping-mall.example.com/auth/mfa",
    referrer: "https://shopping-mall.example.com/auth/login",
    ip_address: typia.random<string & tags.Format<"ipv4">>(),
    device_info: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0",
    timestamp: new Date().toISOString(),
  } satisfies IShoppingMallMfaVerify.ICreate;

  // Test 1: Successful MFA verification with valid code
  const successfulResponse =
    await api.functional.shoppingMall.auth.mfa.verify.verifyMfa(connection, {
      body: validMfaRequest,
    });
  typia.assert(successfulResponse);

  // Test 2: Attempt multiple failed verifications with invalid codes
  const invalidRequests = await ArrayUtil.repeat(5, (index) => ({
    ...validMfaRequest,
    code: "000000", // Invalid code for testing failures
  }));

  let rateLimitTriggered = false;

  for (let i = 0; i < invalidRequests.length; i++) {
    try {
      await api.functional.shoppingMall.auth.mfa.verify.verifyMfa(connection, {
        body: invalidRequests[i],
      });
      // If we get here, the system didn't properly reject invalid codes
      throw new Error("Invalid MFA code was accepted - security issue");
    } catch (error) {
      // Expect errors for invalid codes, but check for rate limiting
      if (error instanceof api.HttpError && error.status === 429) {
        rateLimitTriggered = true;
        TestValidator.predicate(
          "rate limiting triggered after repeated failures",
          rateLimitTriggered === true,
        );
        break;
      }
    }
  }

  // Test 3: Verify rate limiting was triggered
  TestValidator.predicate(
    "rate limiting should be triggered after multiple failures",
    rateLimitTriggered === true,
  );

  // Test 4: Attempt verification during rate limit period should fail
  await TestValidator.error(
    "verification should fail during rate limit period",
    async () => {
      await api.functional.shoppingMall.auth.mfa.verify.verifyMfa(connection, {
        body: validMfaRequest,
      });
    },
  );

  // Test 5: Verify token response structure for successful verifications
  TestValidator.equals(
    "access token should be string type",
    typeof successfulResponse.access_token,
    "string",
  );
  TestValidator.equals(
    "token type should be Bearer",
    successfulResponse.token_type,
    "Bearer",
  );
  TestValidator.predicate(
    "token expiration should be positive",
    successfulResponse.expires_in > 0,
  );
}
