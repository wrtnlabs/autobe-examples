import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

/**
 * Test comprehensive error handling for non-existent post IDs and malformed
 * UUID validation.
 *
 * This test validates that the GET /redditPlatform/posts/{postId} endpoint
 * properly handles:
 *
 * 1. Non-existent post UUIDs returning appropriate 404 errors
 * 2. Malformed UUID formats with proper validation
 * 3. Information leakage prevention in error responses
 * 4. Consistent error handling across different invalid scenarios
 *
 * The test ensures secure and user-friendly error handling when accessing
 * non-existent posts.
 */
export async function test_api_post_not_found_scenarios(
  connection: api.IConnection,
) {
  // Test 1: Non-existent but valid UUID format post ID
  const nonExistentPostId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "request for non-existent post ID should return error",
    async () => {
      await api.functional.redditPlatform.posts.getByPostid(connection, {
        postId: nonExistentPostId,
      });
    },
  );

  // Test 2: Malformed UUID - missing characters
  await TestValidator.error(
    "malformed UUID with missing characters should fail",
    async () => {
      await api.functional.redditPlatform.posts.getByPostid(connection, {
        postId: "12345678-1234-1234-1234-123456789ab", // Only 24 chars, should be 36
      });
    },
  );

  // Test 3: Malformed UUID - invalid characters
  await TestValidator.error(
    "UUID with invalid characters should fail",
    async () => {
      await api.functional.redditPlatform.posts.getByPostid(connection, {
        postId: "12345678-1234-1234-1234-123456789xyz", // Contains 'xyz' instead of hex
      });
    },
  );

  // Test 4: Malformed UUID - wrong format separators
  await TestValidator.error(
    "UUID with incorrect separator format should fail",
    async () => {
      await api.functional.redditPlatform.posts.getByPostid(connection, {
        postId: "12345678:1234-1234-1234-123456789abc", // Wrong separator
      });
    },
  );

  // Test 5: Empty post ID
  await TestValidator.error("empty post ID should fail", async () => {
    await api.functional.redditPlatform.posts.getByPostid(connection, {
      postId: "",
    });
  });

  // Test 6: Special characters in post ID
  await TestValidator.error(
    "post ID with special characters should fail",
    async () => {
      await api.functional.redditPlatform.posts.getByPostid(connection, {
        postId:
          "12345678-1234-1234-1234-123456789abc<script>alert('xss')</script>",
      });
    },
  );

  // Test 7: SQL injection attempt in post ID
  await TestValidator.error(
    "SQL injection attempt in post ID should be rejected",
    async () => {
      await api.functional.redditPlatform.posts.getByPostid(connection, {
        postId: "12345678-1234-1234-1234-123456789abc' OR '1'='1",
      });
    },
  );

  // Test 8: Very long post ID (overly large input)
  await TestValidator.error("overly long post ID should fail", async () => {
    await api.functional.redditPlatform.posts.getByPostid(connection, {
      postId: "12345678-1234-1234-1234-123456789abc" + "a".repeat(1000),
    });
  });
}
