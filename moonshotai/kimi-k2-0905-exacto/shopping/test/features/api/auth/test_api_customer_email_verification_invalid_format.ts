import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallEmailVerify } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallEmailVerify";
import type { IShoppingMallEmailVerifyResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallEmailVerifyResponse";

/**
 * Test email verification with invalid formats
 *
 * This test validates the email verification system's ability to handle
 * malformed verification attempts gracefully. The test covers:
 *
 * 1. Invalid verification code format (non-6-digit numeric)
 * 2. Wrong verification code patterns
 * 3. Various format validation scenarios
 *
 * The goal is to ensure robust input validation and appropriate error handling
 * when verification data does not meet expected formats.
 */
export async function test_api_customer_email_verification_invalid_format(
  connection: api.IConnection,
) {
  // Create a customer account first to test verification
  const customerEmail = `test_${RandomGenerator.alphaNumeric(8)}@example.com`;
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: "ValidP@ss123",
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      href: `https://example.com/register`,
      referrer: `https://example.com/landing`,
      ip: typia.random<string & tags.Format<"ipv4">>(),
      phone: RandomGenerator.mobile(),
      date_of_birth: "1990-01-01T00:00:00.000Z",
    } satisfies IShoppingMallCustomer.IRegister,
  });
  typia.assert(customer);

  // Test invalid verification code formats
  // The system expects a 6-digit numeric code pattern "^[0-9]{6}$"

  // Test with 7-digit code (wrong length)
  await TestValidator.error(
    "should fail with 7-digit verification code",
    async () => {
      await api.functional.shoppingMall.auth.email_verify.verifyEmail(
        connection,
        {
          body: {
            verification_code: "1234567", // 7 digits instead of 6
          },
        },
      );
    },
  );

  // Test with 5-digit code (wrong length)
  await TestValidator.error(
    "should fail with 5-digit verification code",
    async () => {
      await api.functional.shoppingMall.auth.email_verify.verifyEmail(
        connection,
        {
          body: {
            verification_code: "12345", // 5 digits instead of 6
          },
        },
      );
    },
  );

  // Test with code containing letters
  await TestValidator.error(
    "should fail with verification code containing non-numeric characters",
    async () => {
      await api.functional.shoppingMall.auth.email_verify.verifyEmail(
        connection,
        {
          body: {
            verification_code: "12345A", // Contains letter 'A'
          },
        },
      );
    },
  );

  // Test with code containing special characters
  await TestValidator.error(
    "should fail with verification code containing special characters",
    async () => {
      await api.functional.shoppingMall.auth.email_verify.verifyEmail(
        connection,
        {
          body: {
            verification_code: "12345!", // Contains special character
          },
        },
      );
    },
  );

  // Test with alphabetic string
  await TestValidator.error(
    "should fail with alphabetic verification code",
    async () => {
      await api.functional.shoppingMall.auth.email_verify.verifyEmail(
        connection,
        {
          body: {
            verification_code: "ABCDEF", // Letters only
          },
        },
      );
    },
  );

  // Test with JSON special character pattern != valid
  await TestValidator.error(
    "should fail with JSON special characters in verification code",
    async () => {
      await api.functional.shoppingMall.auth.email_verify.verifyEmail(
        connection,
        {
          body: {
            verification_code: '{"test":123}', // JSON-like pattern
          },
        },
      );
    },
  );
}
