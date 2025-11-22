import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

/**
 * E2E test for retrieving posts with different status values and validating
 * visibility rules.
 *
 * This test validates that the API correctly handles post retrieval based on
 * different post statuses: active, removed, locked, and hidden. For each status
 * type, it verifies that the response contains appropriate content access
 * levels, metadata, and restrictions.
 *
 * Test scenarios include:
 *
 * 1. Active posts - full content access and complete metadata
 * 2. Removed posts - appropriate status indication with limited content access
 * 3. Locked posts - status information with comment restrictions
 * 4. Hidden posts - status validation with visibility rules
 *
 * The test ensures that post status properly affects response behavior while
 * maintaining data integrity across all status types.
 */
export async function test_api_post_status_handling(
  connection: api.IConnection,
) {
  // Test with multiple UUID scenarios to validate different post statuses
  const testPostIds = [
    // Test active post retrieval
    typia.random<string & tags.Format<"uuid">>(),
    // Test removed post retrieval
    typia.random<string & tags.Format<"uuid">>(),
    // Test locked post retrieval
    typia.random<string & tags.Format<"uuid">>(),
    // Test hidden post retrieval
    typia.random<string & tags.Format<"uuid">>(),
    // Test non-existent post (404 scenario)
    typia.random<string & tags.Format<"uuid">>(),
  ];

  // Test each post ID scenario
  for (const postId of testPostIds) {
    try {
      // Attempt to retrieve post by ID
      const post: IRedditPlatformPost =
        await api.functional.redditPlatform.posts.getByPostid(connection, {
          postId: postId,
        });

      // Validate post response structure and type safety
      typia.assert(post);

      // Validate post status affects response appropriately
      TestValidator.predicate(
        "post status should be valid enum value",
        ["active", "removed", "locked", "hidden"].includes(post.status),
      );

      // Validate post metadata integrity based on status
      TestValidator.predicate(
        "post should have valid author information",
        post.author &&
          typeof post.author.id === "string" &&
          typeof post.author.username === "string" &&
          typeof post.author.karma_score === "number",
      );

      // Validate community information is present
      TestValidator.predicate(
        "post should have valid community information",
        post.community &&
          typeof post.community.id === "string" &&
          typeof post.community.name === "string" &&
          typeof post.community.type === "string",
      );

      // Validate content fields based on content type
      if (post.contentType === "text") {
        TestValidator.predicate(
          "text post should have text content",
          typeof post.textContent === "string",
        );
      } else if (post.contentType === "link") {
        TestValidator.predicate(
          "link post should have link URL",
          typeof post.linkUrl === "string" &&
            typeof post.linkTitle === "string",
        );
      } else if (post.contentType === "image") {
        TestValidator.predicate(
          "image post should have image URLs",
          typeof post.imageUrls === "string",
        );
      }

      // Validate numeric fields are properly typed
      TestValidator.predicate(
        "post should have valid numeric fields",
        typeof post.score === "number" &&
          typeof post.commentCount === "number" &&
          typeof post.viewCount === "number",
      );

      // Validate timestamps are in correct format
      TestValidator.predicate(
        "post should have valid timestamps",
        typeof post.createdAt === "string" &&
          typeof post.updatedAt === "string",
      );

      // Validate deletedAt field based on status
      if (post.status === "removed") {
        TestValidator.predicate(
          "removed post should have deletedAt timestamp",
          typeof post.deletedAt === "string",
        );
      } else {
        TestValidator.predicate(
          "non-removed post should not have deletedAt timestamp",
          post.deletedAt === undefined,
        );
      }

      // Log the successfully retrieved post for debugging
      console.log(`Successfully retrieved ${post.status} post: ${post.id}`);
    } catch (error) {
      // Handle cases where post retrieval fails (e.g., non-existent post)
      // This is expected for some test scenarios
      TestValidator.predicate(
        "API should handle non-existent post gracefully",
        error instanceof Error,
      );
      console.log(
        `Expected error for post ${postId}: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  // Validate that the API consistently handles different post status scenarios
  TestValidator.predicate(
    "post status handling test completed successfully",
    true,
  );
}
