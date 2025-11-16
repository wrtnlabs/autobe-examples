import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPlatformModerator";

export async function test_api_platform_moderator_registration_invalid_email_format(
  connection: api.IConnection,
) {
  // Test 1: Missing @ symbol
  await TestValidator.error("should reject missing @ symbol", async () => {
    await api.functional.auth.platformModerator.join(connection, {
      body: {
        nickname: RandomGenerator.alphabets(8),
        email: "invalid.email", // Missing @
        password: RandomGenerator.alphaNumeric(12),
        href: "https://example.com",
        referrer: "https://previous.com",
      } satisfies IRedditCommunityPlatformModerator.ICreate,
    });
  });

  // Test 2: Invalid characters in email
  await TestValidator.error("should reject invalid characters", async () => {
    await api.functional.auth.platformModerator.join(connection, {
      body: {
        nickname: RandomGenerator.alphabets(8),
        email: "invalid..email@domain.com", // Double dots
        password: RandomGenerator.alphaNumeric(12),
        href: "https://example.com",
        referrer: "https://previous.com",
      } satisfies IRedditCommunityPlatformModerator.ICreate,
    });
  });

  // Test 3: Missing domain part
  await TestValidator.error("should reject missing domain part", async () => {
    await api.functional.auth.platformModerator.join(connection, {
      body: {
        nickname: RandomGenerator.alphabets(8),
        email: "user@", // Missing domain
        password: RandomGenerator.alphaNumeric(12),
        href: "https://example.com",
        referrer: "https://previous.com",
      } satisfies IRedditCommunityPlatformModerator.ICreate,
    });
  });

  // Test 4: Missing local part
  await TestValidator.error("should reject missing local part", async () => {
    await api.functional.auth.platformModerator.join(connection, {
      body: {
        nickname: RandomGenerator.alphabets(8),
        email: "@domain.com", // Missing local part
        password: RandomGenerator.alphaNumeric(12),
        href: "https://example.com",
        referrer: "https://previous.com",
      } satisfies IRedditCommunityPlatformModerator.ICreate,
    });
  });

  // Test 5: Invalid top-level domain
  await TestValidator.error("should reject invalid TLD format", async () => {
    await api.functional.auth.platformModerator.join(connection, {
      body: {
        nickname: RandomGenerator.alphabets(8),
        email: "user@domain.invalid-tld", // Invalid TLD format
        password: RandomGenerator.alphaNumeric(12),
        href: "https://example.com",
        referrer: "https://previous.com",
      } satisfies IRedditCommunityPlatformModerator.ICreate,
    });
  });

  // Test 6: Email exceeding maximum length
  const longEmail = `${RandomGenerator.alphabets(240)}@${RandomGenerator.alphabets(10)}.com`;
  await TestValidator.error(
    "should reject email exceeding 255 characters",
    async () => {
      await api.functional.auth.platformModerator.join(connection, {
        body: {
          nickname: RandomGenerator.alphabets(8),
          email: longEmail, // Exceeds 255 char limit
          password: RandomGenerator.alphaNumeric(12),
          href: "https://example.com",
          referrer: "https://previous.com",
        } satisfies IRedditCommunityPlatformModerator.ICreate,
      });
    },
  );

  // Test 7: Multiple @ symbols
  await TestValidator.error("should reject multiple @ symbols", async () => {
    await api.functional.auth.platformModerator.join(connection, {
      body: {
        nickname: RandomGenerator.alphabets(8),
        email: "user@@domain.com", // Double @
        password: RandomGenerator.alphaNumeric(12),
        href: "https://example.com",
        referrer: "https://previous.com",
      } satisfies IRedditCommunityPlatformModerator.ICreate,
    });
  });

  // Test 8: Spaces in email
  await TestValidator.error("should reject spaces in email", async () => {
    await api.functional.auth.platformModerator.join(connection, {
      body: {
        nickname: RandomGenerator.alphabets(8),
        email: "user @domain.com", // Space before @
        password: RandomGenerator.alphaNumeric(12),
        href: "https://example.com",
        referrer: "https://previous.com",
      } satisfies IRedditCommunityPlatformModerator.ICreate,
    });
  });

  // Test 9: Consecutive dots in domain
  await TestValidator.error(
    "should reject consecutive dots in domain",
    async () => {
      await api.functional.auth.platformModerator.join(connection, {
        body: {
          nickname: RandomGenerator.alphabets(8),
          email: "user@domain..com", // Double dots
          password: RandomGenerator.alphaNumeric(12),
          href: "https://example.com",
          referrer: "https://previous.com",
        } satisfies IRedditCommunityPlatformModerator.ICreate,
      });
    },
  );

  // Test 10: Invalid characters in domain (e.g., underscores)
  await TestValidator.error("should reject underscores in domain", async () => {
    await api.functional.auth.platformModerator.join(connection, {
      body: {
        nickname: RandomGenerator.alphabets(8),
        email: "user@domain_name.com", // Underscore in domain
        password: RandomGenerator.alphaNumeric(12),
        href: "https://example.com",
        referrer: "https://previous.com",
      } satisfies IRedditCommunityPlatformModerator.ICreate,
    });
  });

  // Test 11: Missing top-level domain
  await TestValidator.error("should reject missing TLD", async () => {
    await api.functional.auth.platformModerator.join(connection, {
      body: {
        nickname: RandomGenerator.alphabets(8),
        email: "user@domain", // Missing TLD
        password: RandomGenerator.alphaNumeric(12),
        href: "https://example.com",
        referrer: "https://previous.com",
      } satisfies IRedditCommunityPlatformModerator.ICreate,
    });
  });
}
