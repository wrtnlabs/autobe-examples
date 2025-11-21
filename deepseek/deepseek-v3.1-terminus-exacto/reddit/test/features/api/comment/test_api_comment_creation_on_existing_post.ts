import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Comprehensive E2E test for comment creation workflow on community platform
 * posts.
 *
 * This test validates the complete user journey from member registration
 * through post creation and comment functionality. It ensures that
 * authenticated members can create comments on existing posts, supports
 * threaded replies to existing comments, and maintains proper referential
 * integrity between posts and comments.
 *
 * The test covers:
 *
 * 1. Member account creation and authentication
 * 2. Community post creation as comment target
 * 3. Top-level comment creation on posts
 * 4. Threaded comment replies to existing comments
 * 5. Validation of response structures and relationships
 * 6. Proper handling of comment metadata and counts
 */
export async function test_api_comment_creation_on_existing_post(
  connection: api.IConnection,
) {
  // Step 1: Create member account for authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphabets(12);

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create a community post to serve as comment target
  // Use a valid UUID format for community ID (the API will validate existence)
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 5 }),
        post_type: "text",
        status: "published",
        community_platform_community_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 3: Create top-level comment on the post
  const topLevelComment =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        body: RandomGenerator.content({ paragraphs: 1 }),
        community_platform_post_id: post.id,
        status: "published",
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(topLevelComment);

  // Validate top-level comment properties
  TestValidator.equals(
    "top-level comment should reference correct post",
    topLevelComment.community_platform_post_id,
    post.id,
  );
  TestValidator.equals(
    "top-level comment should have no parent",
    topLevelComment.parent_id,
    undefined,
  );
  TestValidator.equals(
    "top-level comment reply count should be 0",
    topLevelComment.reply_count,
    0,
  );

  // Step 4: Create threaded reply to the top-level comment
  const threadedReply =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        body: RandomGenerator.content({ paragraphs: 1 }),
        community_platform_post_id: post.id,
        parent_id: topLevelComment.id,
        status: "published",
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(threadedReply);

  // Validate threaded reply properties
  TestValidator.equals(
    "threaded reply should reference correct post",
    threadedReply.community_platform_post_id,
    post.id,
  );
  TestValidator.equals(
    "threaded reply should reference parent comment",
    threadedReply.parent_id,
    topLevelComment.id,
  );

  // Step 5: Test comment creation using post-specific endpoint
  const postSpecificComment =
    await api.functional.communityPlatform.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          body: RandomGenerator.content({ paragraphs: 1 }),
          community_platform_post_id: post.id,
          status: "published",
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(postSpecificComment);

  // Validate post-specific comment properties
  TestValidator.equals(
    "post-specific comment should reference correct post",
    postSpecificComment.community_platform_post_id,
    post.id,
  );

  // Step 6: Validate comment relationships and structure
  TestValidator.notEquals(
    "comments should have unique IDs",
    topLevelComment.id,
    threadedReply.id,
  );
  TestValidator.notEquals(
    "comments should have unique IDs",
    topLevelComment.id,
    postSpecificComment.id,
  );
  TestValidator.notEquals(
    "comments should have unique IDs",
    threadedReply.id,
    postSpecificComment.id,
  );

  // Validate comment content and metadata
  TestValidator.predicate(
    "comment body should not be empty",
    topLevelComment.body.length > 0,
  );
  TestValidator.predicate(
    "comment body should not be empty",
    threadedReply.body.length > 0,
  );
  TestValidator.predicate(
    "comment body should not be empty",
    postSpecificComment.body.length > 0,
  );

  // Validate timestamps
  TestValidator.predicate(
    "comment should have creation timestamp",
    topLevelComment.created_at !== undefined,
  );
  TestValidator.predicate(
    "comment should have update timestamp",
    topLevelComment.updated_at !== undefined,
  );

  // Step 7: Test error scenario - comment on non-existent post
  await TestValidator.error(
    "should fail when creating comment on non-existent post",
    async () => {
      await api.functional.communityPlatform.member.comments.create(
        connection,
        {
          body: {
            body: RandomGenerator.content({ paragraphs: 1 }),
            community_platform_post_id: typia.random<
              string & tags.Format<"uuid">
            >(),
            status: "published",
          } satisfies ICommunityPlatformComment.ICreate,
        },
      );
    },
  );

  // Step 8: Test error scenario - reply to non-existent parent comment
  await TestValidator.error(
    "should fail when replying to non-existent parent comment",
    async () => {
      await api.functional.communityPlatform.member.comments.create(
        connection,
        {
          body: {
            body: RandomGenerator.content({ paragraphs: 1 }),
            community_platform_post_id: post.id,
            parent_id: typia.random<string & tags.Format<"uuid">>(),
            status: "published",
          } satisfies ICommunityPlatformComment.ICreate,
        },
      );
    },
  );
}
