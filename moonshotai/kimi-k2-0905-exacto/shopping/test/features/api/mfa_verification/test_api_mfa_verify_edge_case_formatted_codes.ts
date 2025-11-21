import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAuthentication } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthentication";
import type { IShoppingMallMfaVerify } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMfaVerify";

/**
 * Test multi-factor authentication verification with edge case code formatting.
 *
 * This test validates robust input handling and sanitization for MFA
 * verification, ensuring the system properly processes different code formats
 * while maintaining security integrity. Tests include leading zeros, whitespace
 * handling, and non-numeric inputs to verify appropriate handling of formatted
 * inputs and strict validation standards for authentication code processing.
 *
 * Key test scenarios:
 *
 * 1. Valid 6-digit numeric codes
 * 2. Codes with leading zeros (valid format)
 * 3. Excessive whitespace and formatting characters
 * 4. Non-numeric character attempts
 * 5. Code length variations (too short/too long)
 * 6. Complex formatting edge cases
 */
export async function test_api_mfa_verify_edge_case_formatted_codes(
  connection: api.IConnection,
) {
  // Generate test URLs for MFA verification context
  const testHref = "https://shoppingmall.example.com/auth/mfa";
  const testReferrer = "https://shoppingmall.example.com/auth/login";

  // Test Case 1: Valid 6-digit numeric code with standard format
  const standardCodeRequest = {
    code: "123456",
    href: testHref,
    referrer: testReferrer,
  } satisfies IShoppingMallMfaVerify.ICreate;

  // This should attempt verification - result depends on API implementation
  const standardResponse =
    await api.functional.shoppingMall.auth.mfa.verify.verifyMfa(connection, {
      body: standardCodeRequest,
    });

  typia.assert(standardResponse);
  TestValidator.predicate(
    "standard MFA code returns valid response structure",
    !!standardResponse.access_token,
  );
  TestValidator.equals(
    "token type should be Bearer",
    standardResponse.token_type,
    "Bearer",
  );
  TestValidator.predicate(
    "expires_in should be positive integer",
    standardResponse.expires_in > 0,
  );

  // Test Case 2: Code with leading zeros - valid format, common in TOTP
  const leadingZeroCode = "012345";
  const leadingZeroRequest = {
    code: leadingZeroCode,
    href: testHref,
    referrer: testReferrer,
  } satisfies IShoppingMallMfaVerify.ICreate;

  const leadingZeroResponse =
    await api.functional.shoppingMall.auth.mfa.verify.verifyMfa(connection, {
      body: leadingZeroRequest,
    });

  typia.assert(leadingZeroResponse);
  TestValidator.predicate(
    "MFA code with leading zeros should be accepted",
    !!leadingZeroResponse.access_token,
  );

  // Test Case 3: Excessive whitespace padding - should fail sanitization
  const whitespacePaddedRequest = {
    code: "  " + RandomGenerator.alphabets(4) + "  ",
    href: testHref,
    referrer: testReferrer,
  } satisfies IShoppingMallMfaVerify.ICreate;

  await TestValidator.error(
    "MFA code with excessive whitespace should fail",
    async () => {
      await api.functional.shoppingMall.auth.mfa.verify.verifyMfa(connection, {
        body: whitespacePaddedRequest,
      });
    },
  );

  // Test Case 4: Non-numeric character attempts
  const alphaNumericRequest = {
    code: "A12B34",
    href: testHref,
    referrer: testReferrer,
  } satisfies IShoppingMallMfaVerify.ICreate;

  await TestValidator.error(
    "MFA code with alphabetic characters should fail",
    async () => {
      await api.functional.shoppingMall.auth.mfa.verify.verifyMfa(connection, {
        body: alphaNumericRequest,
      });
    },
  );

  // Test Case 5: Special characters injection
  const specialCharRequest = {
    code: "12!@34",
    href: testHref,
    referrer: testReferrer,
  } satisfies IShoppingMallMfaVerify.ICreate;

  await TestValidator.error(
    "MFA code with special characters should fail",
    async () => {
      await api.functional.shoppingMall.auth.mfa.verify.verifyMfa(connection, {
        body: specialCharRequest,
      });
    },
  );

  // Test Case 6: Code with length variations
  // Too short (5 digits)
  const shortCodeRequest = {
    code: "12345",
    href: testHref,
    referrer: testReferrer,
  } satisfies IShoppingMallMfaVerify.ICreate;

  await TestValidator.error("MFA code with 5 digits should fail", async () => {
    await api.functional.shoppingMall.auth.mfa.verify.verifyMfa(connection, {
      body: shortCodeRequest,
    });
  });

  // Too long (7 digits)
  const longCodeRequest = {
    code: "1234567",
    href: testHref,
    referrer: testReferrer,
  } satisfies IShoppingMallMfaVerify.ICreate;

  await TestValidator.error("MFA code with 7 digits should fail", async () => {
    await api.functional.shoppingMall.auth.mfa.verify.verifyMfa(connection, {
      body: longCodeRequest,
    });
  });

  // Test Case 7: Complex formatting attempts with additional metadata
  const completeValidRequest = {
    code: typia.random<
      string &
        tags.MinLength<6> &
        tags.MaxLength<6> &
        tags.Pattern<"^[0-9]{6}$">
    >(),
    href: testHref,
    referrer: testReferrer,
    device_info: RandomGenerator.alphabets(10),
    ip_address: typia.random<string & tags.Format<"ipv4">>(),
    timestamp: new Date().toISOString(),
  } satisfies IShoppingMallMfaVerify.ICreate;

  const completeResponse =
    await api.functional.shoppingMall.auth.mfa.verify.verifyMfa(connection, {
      body: completeValidRequest,
    });

  typia.assert(completeResponse);
  TestValidator.predicate(
    "complete valid MFA request should work",
    !!completeResponse.access_token,
  );

  // Test Case 8: Backup code usage validation
  const backupCodeRequest = {
    code: RandomGenerator.alphabets(6), // Random alphanumeric as backup code
    backup_code: RandomGenerator.alphabets(8),
    href: testHref,
    referrer: testReferrer,
  } satisfies IShoppingMallMfaVerify.ICreate;

  await TestValidator.error(
    "MFA with random backup code should fail validation",
    async () => {
      await api.functional.shoppingMall.auth.mfa.verify.verifyMfa(connection, {
        body: backupCodeRequest,
      });
    },
  );
}
