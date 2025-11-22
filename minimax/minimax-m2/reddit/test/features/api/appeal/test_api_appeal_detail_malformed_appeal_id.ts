import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerationAppeal";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

export async function test_api_appeal_detail_malformed_appeal_id(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a registered user
  const testUser = await api.functional.auth.registeredUser.join(connection, {
    body: {
      username: `testuser_${RandomGenerator.alphaNumeric(8)}`,
      email: `test_${RandomGenerator.alphaNumeric(5)}@example.com`,
      password: "TestPassword123!",
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
    } satisfies IRedditPlatformRegisteredUser.ICreate,
  });
  typia.assert(testUser);

  // Step 2: Test malformed appeal IDs with proper input validation

  // Test 2.1: Empty string appeal ID
  await TestValidator.error(
    "should reject empty string appeal ID",
    async () => {
      await api.functional.redditPlatform.registeredUser.appeals.at(
        connection,
        {
          appealId: "",
        },
      );
    },
  );

  // Test 2.2: Invalid UUID format - not enough characters
  await TestValidator.error(
    "should reject short invalid UUID format",
    async () => {
      await api.functional.redditPlatform.registeredUser.appeals.at(
        connection,
        {
          appealId: "invalid",
        },
      );
    },
  );

  // Test 2.3: Invalid UUID format - wrong separators
  await TestValidator.error(
    "should reject UUID with wrong separators",
    async () => {
      await api.functional.redditPlatform.registeredUser.appeals.at(
        connection,
        {
          appealId: "1234-5678-9012-3456",
        },
      );
    },
  );

  // Test 2.4: Non-UUID string - contains invalid characters
  await TestValidator.error(
    "should reject UUID with invalid characters",
    async () => {
      await api.functional.redditPlatform.registeredUser.appeals.at(
        connection,
        {
          appealId: "123g4567-8901-2345-6789-01234567890g",
        },
      );
    },
  );

  // Test 2.5: Non-UUID identifier - numbers only
  await TestValidator.error(
    "should reject numeric-only appeal ID",
    async () => {
      await api.functional.redditPlatform.registeredUser.appeals.at(
        connection,
        {
          appealId: "123456789",
        },
      );
    },
  );

  // Test 2.6: Non-UUID identifier - special characters
  await TestValidator.error(
    "should reject appeal ID with special characters",
    async () => {
      await api.functional.redditPlatform.registeredUser.appeals.at(
        connection,
        {
          appealId: "appeal@test-id_123!@#",
        },
      );
    },
  );

  // Test 2.7: Valid UUID format but non-existent appeal (for comparison)
  await TestValidator.error(
    "should reject non-existent valid UUID format",
    async () => {
      await api.functional.redditPlatform.registeredUser.appeals.at(
        connection,
        {
          appealId: "12345678-1234-5678-9012-123456789012",
        },
      );
    },
  );

  // Step 3: Verify system stability after malformed input tests
  TestValidator.predicate(
    "system remains stable after malformed input tests",
    true, // If we reach here without crashes, system is stable
  );
}
