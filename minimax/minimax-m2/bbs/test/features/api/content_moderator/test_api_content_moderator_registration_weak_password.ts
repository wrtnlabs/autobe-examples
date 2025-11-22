import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalDiscussionContentModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionContentModerator";

/**
 * Test content moderator registration with weak password requirements.
 *
 * This test validates that the system properly enforces password complexity
 * requirements for content moderator accounts. Content moderators have elevated
 * permissions, so secure password requirements are critical for platform
 * security.
 *
 * The test verifies that passwords not meeting the platform's security
 * standards are rejected, while ensuring that valid passwords are accepted.
 * This includes testing passwords that are too short, missing character types,
 * or otherwise 不符合安全要求.
 *
 * Password requirements verified:
 *
 * - Minimum 8 characters
 * - Must contain uppercase letters
 * - Must contain lowercase letters
 * - Must contain numbers
 * - Must contain special characters
 * - Maximum 128 characters
 */
export async function test_api_content_moderator_registration_weak_password(
  connection: api.IConnection,
) {
  // Test weak passwords that should be rejected
  const moderatorEmail = typia.random<string & tags.Format<"email">>();

  // Test 1: Password too short (less than 8 characters)
  await TestValidator.error(
    "password must be at least 8 characters",
    async () => {
      await api.functional.auth.contentModerator.join.register(connection, {
        body: {
          display_name: RandomGenerator.name(),
          email: moderatorEmail,
          password: "short1!", // Only 7 characters
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IEconPoliticalDiscussionContentModerator.ICreate,
      });
    },
  );

  // Test 2: Missing uppercase letters
  await TestValidator.error(
    "password must contain uppercase letters",
    async () => {
      await api.functional.auth.contentModerator.join.register(connection, {
        body: {
          display_name: RandomGenerator.name(),
          email: typia.random<string & tags.Format<"email">>(),
          password: "lowercase123!", // No uppercase letters
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IEconPoliticalDiscussionContentModerator.ICreate,
      });
    },
  );

  // Test 3: Missing lowercase letters
  await TestValidator.error(
    "password must contain lowercase letters",
    async () => {
      await api.functional.auth.contentModerator.join.register(connection, {
        body: {
          display_name: RandomGenerator.name(),
          email: typia.random<string & tags.Format<"email">>(),
          password: "UPPERCASE123!", // No lowercase letters
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IEconPoliticalDiscussionContentModerator.ICreate,
      });
    },
  );

  // Test 4: Missing numbers
  await TestValidator.error("password must contain numbers", async () => {
    await api.functional.auth.contentModerator.join.register(connection, {
      body: {
        display_name: RandomGenerator.name(),
        email: typia.random<string & tags.Format<"email">>(),
        password: "MixedCase!", // No numbers
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEconPoliticalDiscussionContentModerator.ICreate,
    });
  });

  // Test 5: Missing special characters
  await TestValidator.error(
    "password must contain special characters",
    async () => {
      await api.functional.auth.contentModerator.join.register(connection, {
        body: {
          display_name: RandomGenerator.name(),
          email: typia.random<string & tags.Format<"email">>(),
          password: "MixedCase123", // No special characters
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IEconPoliticalDiscussionContentModerator.ICreate,
      });
    },
  );

  // Test 6: Only letters (missing numbers and special characters)
  await TestValidator.error(
    "password must contain numbers and special characters",
    async () => {
      await api.functional.auth.contentModerator.join.register(connection, {
        body: {
          display_name: RandomGenerator.name(),
          email: typia.random<string & tags.Format<"email">>(),
          password: "OnlyLettersHere", // No numbers or special chars
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IEconPoliticalDiscussionContentModerator.ICreate,
      });
    },
  );

  // Test 7: Only numbers (missing letters and special characters)
  await TestValidator.error(
    "password must contain letters and special characters",
    async () => {
      await api.functional.auth.contentModerator.join.register(connection, {
        body: {
          display_name: RandomGenerator.name(),
          email: typia.random<string & tags.Format<"email">>(),
          password: "123456789", // No letters or special chars
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IEconPoliticalDiscussionContentModerator.ICreate,
      });
    },
  );

  // Test 8: Only special characters (missing letters and numbers)
  await TestValidator.error(
    "password must contain letters and numbers",
    async () => {
      await api.functional.auth.contentModerator.join.register(connection, {
        body: {
          display_name: RandomGenerator.name(),
          email: typia.random<string & tags.Format<"email">>(),
          password: "!@#$%^&*()", // No letters or numbers
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IEconPoliticalDiscussionContentModerator.ICreate,
      });
    },
  );

  // Test 9: Password exceeding maximum length
  await TestValidator.error(
    "password must not exceed maximum length",
    async () => {
      const longPassword = "A".repeat(129) + "1" + "a" + "!";
      await api.functional.auth.contentModerator.join.register(connection, {
        body: {
          display_name: RandomGenerator.name(),
          email: typia.random<string & tags.Format<"email">>(),
          password: longPassword, // Exceeds 128 character limit
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IEconPoliticalDiscussionContentModerator.ICreate,
      });
    },
  );

  // Test 10: Weak password with spaces
  await TestValidator.error(
    "password with spaces should be rejected if not meeting other requirements",
    async () => {
      await api.functional.auth.contentModerator.join.register(connection, {
        body: {
          display_name: RandomGenerator.name(),
          email: typia.random<string & tags.Format<"email">>(),
          password: "weak pass1", // Has spaces but still weak overall
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IEconPoliticalDiscussionContentModerator.ICreate,
      });
    },
  );

  // Test 11: Valid strong password should be accepted
  const validModerator =
    await api.functional.auth.contentModerator.join.register(connection, {
      body: {
        display_name: RandomGenerator.name(),
        email: typia.random<string & tags.Format<"email">>(),
        password: "StrongPass123!", // Meets all requirements
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEconPoliticalDiscussionContentModerator.ICreate,
    });
  typia.assert(validModerator);
  TestValidator.equals(
    "valid moderator registration should succeed",
    validModerator.email,
    validModerator.email,
  );
}
