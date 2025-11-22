import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

export async function test_api_post_data_consistency_with_listing(
  connection: api.IConnection,
) {
  /**
   * Test data consistency for post retrieval endpoints.
   *
   * This test validates data integrity across individual post retrieval
   * operations, ensuring that engagement metrics, author information, community
   * data, and content fields are consistent and properly formatted. Since only
   * individual post retrieval is available, we focus on internal data
   * consistency within single post objects that should remain constant
   * regardless of access method.
   *
   * Key validation areas:
   *
   * 1. Author information completeness and format validation
   * 2. Community data integrity and proper formatting
   * 3. Engagement metrics reasonableness and consistency
   * 4. Content type field alignment and data integrity
   * 5. Timestamp validation and logical ordering
   * 6. Status information accuracy and implications
   */

  // Generate a test post ID for retrieval
  const testPostId = typia.random<string & tags.Format<"uuid">>();

  // Retrieve the post details
  const post: IRedditPlatformPost =
    await api.functional.redditPlatform.posts.getByPostid(connection, {
      postId: testPostId,
    });

  // Validate the post object structure and data integrity
  typia.assert(post);

  // Validate author information consistency and completeness
  TestValidator.predicate(
    "author information should be complete and properly formatted",
    post.author !== null &&
      post.author !== undefined &&
      typeof post.author.id === "string" &&
      post.author.id.length > 0 &&
      typeof post.author.username === "string" &&
      post.author.username.length > 0 &&
      typeof post.author.karma_score === "number" &&
      post.author.karma_score >= 0 &&
      typeof post.author.account_status === "string" &&
      post.author.account_status.length > 0 &&
      typeof post.author.email_verified === "boolean" &&
      typeof post.author.account_created === "string",
  );

  // Validate community information consistency and completeness
  TestValidator.predicate(
    "community information should be complete and properly formatted",
    post.community !== null &&
      post.community !== undefined &&
      typeof post.community.id === "string" &&
      post.community.id.length > 0 &&
      typeof post.community.name === "string" &&
      post.community.name.length > 0 &&
      typeof post.community.title === "string" &&
      post.community.title.length > 0 &&
      typeof post.community.type === "string" &&
      ["public", "restricted", "private"].includes(post.community.type) &&
      typeof post.community.status === "string" &&
      ["active", "restricted", "archived", "banned"].includes(
        post.community.status,
      ) &&
      typeof post.community.member_count === "number" &&
      post.community.member_count >= 0 &&
      typeof post.community.post_count === "number" &&
      post.community.post_count >= 0 &&
      typeof post.community.subscriber_count === "number" &&
      post.community.subscriber_count >= 0 &&
      typeof post.community.nsfw_content_allowed === "boolean",
  );

  // Validate engagement metrics consistency and reasonableness
  TestValidator.predicate(
    "engagement metrics should be consistent and reasonable",
    typeof post.score === "number" &&
      typeof post.commentCount === "number" &&
      typeof post.viewCount === "number" &&
      post.commentCount >= 0 &&
      post.viewCount >= 0 &&
      // Score can be negative but should be reasonable (not extremely large negative values)
      post.score > -1000000 &&
      post.score < 1000000 &&
      // Comment count should not exceed reasonable limits for a single post
      post.commentCount < 1000000 &&
      // View count should be non-negative and reasonable
      post.viewCount >= 0 &&
      post.viewCount < 1000000000,
  );

  // Validate content type consistency with content fields
  TestValidator.predicate(
    "content type should align with content fields availability",
    typeof post.contentType === "string" &&
      ["text", "link", "image"].includes(post.contentType) &&
      ((post.contentType === "text" &&
        (post.textContent === undefined ||
          typeof post.textContent === "string")) ||
        (post.contentType === "link" &&
          (post.linkUrl === undefined || typeof post.linkUrl === "string") &&
          (post.linkTitle === undefined ||
            typeof post.linkTitle === "string") &&
          (post.linkDescription === undefined ||
            typeof post.linkDescription === "string")) ||
        (post.contentType === "image" &&
          (post.imageUrls === undefined ||
            typeof post.imageUrls === "string") &&
          (post.imageAltTexts === undefined ||
            typeof post.imageAltTexts === "string"))),
  );

  // Validate post status consistency and implications
  TestValidator.predicate(
    "post status should be valid and consistent",
    typeof post.status === "string" &&
      ["active", "removed", "locked", "hidden"].includes(post.status) &&
      // If post is removed, deletedAt should not be null
      (post.status !== "removed" ||
        (post.deletedAt !== null && post.deletedAt !== undefined)) &&
      // If post is active, deletedAt should be null
      (post.status === "active" ||
        post.deletedAt === null ||
        post.deletedAt === undefined),
  );

  // Validate timestamp consistency and logical ordering
  TestValidator.predicate(
    "timestamps should be consistent and logically ordered",
    (typeof post.createdAt === "string" &&
      typeof post.updatedAt === "string" &&
      typeof post.deletedAt === "undefined") ||
      (post.deletedAt !== null &&
        typeof post.deletedAt === "string" &&
        // createdAt should not be in the future
        new Date(post.createdAt) <= new Date() &&
        // updatedAt should be >= createdAt
        new Date(post.updatedAt) >= new Date(post.createdAt) &&
        // If deletedAt exists, it should be >= createdAt
        (post.deletedAt === null ||
          post.deletedAt === undefined ||
          new Date(post.deletedAt) >= new Date(post.createdAt))),
  );

  // Validate title field consistency and format
  TestValidator.predicate(
    "post title should be properly formatted and within length constraints",
    typeof post.title === "string" &&
      post.title.length >= 5 &&
      post.title.length <= 300 &&
      post.title.trim().length === post.title.length, // No leading/trailing whitespace
  );

  // Test data consistency across related fields
  TestValidator.predicate(
    "related fields should maintain data consistency",
    // Community member count should be >= 0 and reasonable relative to post count
    post.community.member_count >= post.community.post_count &&
      // Author karma score should be non-negative
      post.author.karma_score >= 0 &&
      // Account creation timestamp should be in the past
      new Date(post.author.account_created) <= new Date() &&
      // Email verification status should be boolean
      typeof post.author.email_verified === "boolean",
  );
}
