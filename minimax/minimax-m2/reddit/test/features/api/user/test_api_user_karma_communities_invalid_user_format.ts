import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";
import type { IRedditPlatformUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUserKarma";

/**
 * Test API behavior with invalid user ID format validation.
 *
 * This test validates that the API properly rejects malformed user identifiers
 * and returns appropriate 400 error responses. Tests various invalid formats
 * including empty strings, invalid UUID structures, and non-UUID strings to
 * ensure consistent input validation across all user ID parameters.
 *
 * Test scenarios:
 *
 * 1. Empty string userId - should reject completely empty identifiers
 * 2. Invalid UUID format - should reject UUIDs that don't follow standard format
 * 3. Malformed UUID - should reject UUIDs with invalid hex characters
 * 4. Non-UUID strings - should reject any string that isn't a valid UUID
 */
export async function test_api_user_karma_communities_invalid_user_format(
  connection: api.IConnection,
) {
  // Test 1: Empty string userId
  await TestValidator.error("should reject empty string userId", async () => {
    await api.functional.redditPlatform.users.karma.communities.at(connection, {
      userId: "" satisfies string,
    });
  });

  // Test 2: Invalid UUID format (too short)
  await TestValidator.error(
    "should reject invalid UUID format - too short",
    async () => {
      await api.functional.redditPlatform.users.karma.communities.at(
        connection,
        {
          userId: "12345" satisfies string,
        },
      );
    },
  );

  // Test 3: Invalid UUID format (wrong structure)
  await TestValidator.error(
    "should reject invalid UUID format - wrong structure",
    async () => {
      await api.functional.redditPlatform.users.karma.communities.at(
        connection,
        {
          userId: "12345678-1234-1234-1234-12345678901" satisfies string,
        },
      );
    },
  );

  // Test 4: Malformed UUID (invalid hex characters)
  await TestValidator.error(
    "should reject malformed UUID with invalid hex characters",
    async () => {
      await api.functional.redditPlatform.users.karma.communities.at(
        connection,
        {
          userId: "12345678-1234-1234-1234-123456789GHI" satisfies string,
        },
      );
    },
  );

  // Test 5: Non-UUID string format
  await TestValidator.error(
    "should reject non-UUID string format",
    async () => {
      await api.functional.redditPlatform.users.karma.communities.at(
        connection,
        {
          userId: "user123" satisfies string,
        },
      );
    },
  );

  // Test 6: UUID with wrong hyphen placement
  await TestValidator.error(
    "should reject UUID with wrong hyphen placement",
    async () => {
      await api.functional.redditPlatform.users.karma.communities.at(
        connection,
        {
          userId: "12345678-1234-1234-1234-12345678901" satisfies string,
        },
      );
    },
  );
}
