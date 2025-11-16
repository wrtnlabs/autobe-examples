import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test member registration rejection when password does not meet security
 * requirements.
 *
 * This test validates that the member registration endpoint enforces strict
 * password security policies. The system must reject registration attempts with
 * weak passwords that fail to meet character type requirements:
 *
 * - Minimum 8 characters length
 * - Mix of character types (uppercase, lowercase, numbers, special characters)
 *
 * Each test case submits invalid credentials with proper type compliance but
 * failing business logic validation, and verifies that the API returns an
 * appropriate error response, ensuring the backend properly validates password
 * strength before creating member accounts.
 *
 * Test scenarios:
 *
 * 1. Password with only lowercase letters (missing uppercase, numbers, special
 *    chars)
 * 2. Password with only uppercase letters (missing lowercase, numbers, special
 *    chars)
 * 3. Password with only numbers (missing letters and special characters)
 * 4. Password with letters and numbers only (missing special characters)
 * 5. Successful registration with strong password (validates test infrastructure)
 */
export async function test_api_member_registration_weak_password(
  connection: api.IConnection,
) {
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();

  // Test 1: Password with only lowercase letters
  await TestValidator.error(
    "should reject password with only lowercase letters",
    async () => {
      await api.functional.auth.member.join(connection, {
        body: {
          email: `test1_${RandomGenerator.alphaNumeric(8)}@example.com`,
          username: `user_${RandomGenerator.alphaNumeric(4)}`,
          password: "abcdefghijk", // 11 chars, only lowercase
          href: href,
          referrer: referrer,
        } satisfies ICommunityPlatformMember.ICreate,
      });
    },
  );

  // Test 2: Password with only uppercase letters
  await TestValidator.error(
    "should reject password with only uppercase letters",
    async () => {
      await api.functional.auth.member.join(connection, {
        body: {
          email: `test2_${RandomGenerator.alphaNumeric(8)}@example.com`,
          username: `user_${RandomGenerator.alphaNumeric(4)}`,
          password: "ABCDEFGHIJK", // 11 chars, only uppercase
          href: href,
          referrer: referrer,
        } satisfies ICommunityPlatformMember.ICreate,
      });
    },
  );

  // Test 3: Password with only numbers
  await TestValidator.error(
    "should reject password with only numbers",
    async () => {
      await api.functional.auth.member.join(connection, {
        body: {
          email: `test3_${RandomGenerator.alphaNumeric(8)}@example.com`,
          username: `user_${RandomGenerator.alphaNumeric(4)}`,
          password: "12345678901", // 11 chars, only numbers
          href: href,
          referrer: referrer,
        } satisfies ICommunityPlatformMember.ICreate,
      });
    },
  );

  // Test 4: Password with letters and numbers only (missing special characters)
  await TestValidator.error(
    "should reject password missing special characters",
    async () => {
      await api.functional.auth.member.join(connection, {
        body: {
          email: `test4_${RandomGenerator.alphaNumeric(8)}@example.com`,
          username: `user_${RandomGenerator.alphaNumeric(4)}`,
          password: "Abcdefgh12345", // has upper, lower, numbers but no special chars
          href: href,
          referrer: referrer,
        } satisfies ICommunityPlatformMember.ICreate,
      });
    },
  );

  // Test 5: Strong password should succeed to verify test infrastructure
  const strongPassword = "SecurePass123!@#";
  const successEmail = `success_${RandomGenerator.alphaNumeric(8)}@example.com`;
  const successUsername = `validuser_${RandomGenerator.alphaNumeric(4)}`;

  const result = await api.functional.auth.member.join(connection, {
    body: {
      email: successEmail,
      username: successUsername,
      password: strongPassword,
      href: href,
      referrer: referrer,
    } satisfies ICommunityPlatformMember.ICreate,
  });

  typia.assert(result);
  TestValidator.predicate(
    "successful registration creates authorized member with token",
    result.token.access.length > 0 && result.id.length > 0,
  );
}
