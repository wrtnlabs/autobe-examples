import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import type { IGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IGuest";

export async function test_api_guest_registration_invalid_email_format(
  connection: api.IConnection,
) {
  // Test guest registration with invalid email format
  // The system should reject registration when email does not conform to standard email format
  // We will test multiple invalid email formats to ensure robust validation

  // Invalid email formats to test:
  // 1. Missing @ symbol
  // 2. Missing domain
  // 3. Multiple @ symbols
  // 4. Email starting with @
  // 5. Empty email
  // 6. Email with spaces
  // 7. Email with invalid special characters
  // 8. Domain starting with dot
  // 9. Domain ending with dot
  // 10. Domain starting with hyphen
  // 11. Very long email

  // Test 1: Missing @ symbol
  await TestValidator.error(
    "guest registration should fail with invalid email (missing @)",
    async () => {
      await api.functional.auth.guest.join(connection, {
        body: {
          email: "invalid-email", // No @ symbol
          password: "validPassword123",
          href: "https://example.com/join",
          referrer: "https://example.com/home",
        } satisfies IGuest.ICreate,
      });
    },
  );

  // Test 2: Missing domain (local part only)
  await TestValidator.error(
    "guest registration should fail with invalid email (no domain)",
    async () => {
      await api.functional.auth.guest.join(connection, {
        body: {
          email: "user@", // Missing domain
          password: "validPassword123",
          href: "https://example.com/join",
          referrer: "https://example.com/home",
        } satisfies IGuest.ICreate,
      });
    },
  );

  // Test 3: Multiple @ symbols
  await TestValidator.error(
    "guest registration should fail with invalid email (multiple @)",
    async () => {
      await api.functional.auth.guest.join(connection, {
        body: {
          email: "user@@example.com", // Double @
          password: "validPassword123",
          href: "https://example.com/join",
          referrer: "https://example.com/home",
        } satisfies IGuest.ICreate,
      });
    },
  );

  // Test 4: Email starting with @
  await TestValidator.error(
    "guest registration should fail with invalid email (starts with @)",
    async () => {
      await api.functional.auth.guest.join(connection, {
        body: {
          email: "@example.com", // Starts with @
          password: "validPassword123",
          href: "https://example.com/join",
          referrer: "https://example.com/home",
        } satisfies IGuest.ICreate,
      });
    },
  );

  // Test 5: Empty email
  await TestValidator.error(
    "guest registration should fail with empty email",
    async () => {
      await api.functional.auth.guest.join(connection, {
        body: {
          email: "", // Empty string
          password: "validPassword123",
          href: "https://example.com/join",
          referrer: "https://example.com/home",
        } satisfies IGuest.ICreate,
      });
    },
  );

  // Test 6: Email with spaces
  await TestValidator.error(
    "guest registration should fail with email containing spaces",
    async () => {
      await api.functional.auth.guest.join(connection, {
        body: {
          email: "user name@example.com", // Contains space
          password: "validPassword123",
          href: "https://example.com/join",
          referrer: "https://example.com/home",
        } satisfies IGuest.ICreate,
      });
    },
  );

  // Test 7: Email with invalid special characters
  await TestValidator.error(
    "guest registration should fail with email with invalid special characters",
    async () => {
      await api.functional.auth.guest.join(connection, {
        body: {
          email: "user&example.com", // & not allowed in local part
          password: "validPassword123",
          href: "https://example.com/join",
          referrer: "https://example.com/home",
        } satisfies IGuest.ICreate,
      });
    },
  );

  // Test 8: Domain starting with dot
  await TestValidator.error(
    "guest registration should fail with invalid domain format (starts with dot)",
    async () => {
      await api.functional.auth.guest.join(connection, {
        body: {
          email: "user@.com", // Domain starts with dot
          password: "validPassword123",
          href: "https://example.com/join",
          referrer: "https://example.com/home",
        } satisfies IGuest.ICreate,
      });
    },
  );

  // Test 9: Domain ending with dot
  await TestValidator.error(
    "guest registration should fail with invalid domain format (ends with dot)",
    async () => {
      await api.functional.auth.guest.join(connection, {
        body: {
          email: "user@example.", // Domain ends with dot
          password: "validPassword123",
          href: "https://example.com/join",
          referrer: "https://example.com/home",
        } satisfies IGuest.ICreate,
      });
    },
  );

  // Test 10: Domain starting with hyphen
  await TestValidator.error(
    "guest registration should fail with invalid domain format (starts with hyphen)",
    async () => {
      await api.functional.auth.guest.join(connection, {
        body: {
          email: "user@-example.com", // Domain starts with hyphen
          password: "validPassword123",
          href: "https://example.com/join",
          referrer: "https://example.com/home",
        } satisfies IGuest.ICreate,
      });
    },
  );

  // Test 11: Very long email (exceeding practical limits)
  await TestValidator.error(
    "guest registration should fail with extremely long email",
    async () => {
      const longEmail =
        ArrayUtil.repeat(256, () => "a").join("") + "@example.com";
      await api.functional.auth.guest.join(connection, {
        body: {
          email: longEmail, // Very long email
          password: "validPassword123",
          href: "https://example.com/join",
          referrer: "https://example.com/home",
        } satisfies IGuest.ICreate,
      });
    },
  );
}
