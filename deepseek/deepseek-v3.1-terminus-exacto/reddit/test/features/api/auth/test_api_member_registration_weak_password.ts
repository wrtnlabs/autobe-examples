import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test member registration password strength validation by attempting to
 * register with passwords that do not meet minimum security requirements. This
 * scenario validates that the platform enforces password policies including
 * minimum length constraints. The test verifies that weak passwords are
 * rejected with appropriate error messages, ensuring that member accounts
 * maintain adequate security standards.
 */
export async function test_api_member_registration_weak_password(
  connection: api.IConnection,
) {
  // Generate valid base registration data
  const baseRegistrationData = {
    email: typia.random<string & tags.Format<"email">>(),
    display_name: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 8,
    }),
    href: "https://example.com/register" satisfies string as string,
    referrer: "https://example.com/home" satisfies string as string,
  };

  // Test 1: Password too short (7 characters - one below minimum)
  await TestValidator.error(
    "password with 7 characters should be rejected",
    async () => {
      await api.functional.auth.member.join(connection, {
        body: {
          ...baseRegistrationData,
          password: RandomGenerator.alphabets(7), // 7 chars - below minimum
        } satisfies ICommunityPlatformMember.ICreate,
      });
    },
  );

  // Test 2: Very short password (3 characters)
  await TestValidator.error(
    "password with 3 characters should be rejected",
    async () => {
      await api.functional.auth.member.join(connection, {
        body: {
          ...baseRegistrationData,
          email: typia.random<string & tags.Format<"email">>(), // New email for unique registration
          password: RandomGenerator.alphabets(3), // 3 chars - well below minimum
        } satisfies ICommunityPlatformMember.ICreate,
      });
    },
  );

  // Test 3: Single character password
  await TestValidator.error(
    "single character password should be rejected",
    async () => {
      await api.functional.auth.member.join(connection, {
        body: {
          ...baseRegistrationData,
          email: typia.random<string & tags.Format<"email">>(), // New email for unique registration
          password: "a", // Single character
        } satisfies ICommunityPlatformMember.ICreate,
      });
    },
  );

  // Test 4: Valid password (exactly 8 characters - minimum requirement)
  const validPasswordData = {
    ...baseRegistrationData,
    email: typia.random<string & tags.Format<"email">>(), // New email for unique registration
    password: RandomGenerator.alphabets(8), // 8 chars - meets minimum
  };

  const validMember = await api.functional.auth.member.join(connection, {
    body: validPasswordData satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(validMember);

  // Verify successful registration with valid password
  TestValidator.predicate(
    "valid member registration should succeed",
    validMember.id.length > 0 && validMember.email === validPasswordData.email,
  );

  // Test 5: Valid longer password (12 characters)
  const longerPasswordData = {
    ...baseRegistrationData,
    email: typia.random<string & tags.Format<"email">>(), // New email for unique registration
    password: RandomGenerator.alphabets(12), // 12 chars - above minimum
  };

  const longerPasswordMember = await api.functional.auth.member.join(
    connection,
    {
      body: longerPasswordData satisfies ICommunityPlatformMember.ICreate,
    },
  );
  typia.assert(longerPasswordMember);

  // Verify successful registration with longer password
  TestValidator.predicate(
    "longer password registration should succeed",
    longerPasswordMember.id.length > 0 &&
      longerPasswordMember.email === longerPasswordData.email,
  );
}
