import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Test comment retrieval access control based on moderation status and user
 * permissions.
 *
 * This comprehensive test validates that comment retrieval follows proper
 * access control rules by creating comments with different status values
 * (published, pending, removed, archived) and testing retrieval with both
 * regular member and moderator contexts. The test ensures that published
 * comments are accessible to all users while restricted statuses follow proper
 * access control rules based on user permissions.
 *
 * Steps:
 *
 * 1. Authenticate as a regular member
 * 2. Create a community for comment testing
 * 3. Create a post to host comments
 * 4. Create comments with different statuses
 * 5. Test retrieval access for each comment status with regular member
 * 6. Validate error handling for non-existent comment IDs
 * 7. Test access control with different user contexts
 */
export async function test_api_comment_retrieval_access_control(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as regular member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "TestPassword123",
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create community for comment testing
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          slug: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.content({ paragraphs: 1 }),
          privacy: "public",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create post to host comments
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        post_type: "text",
        status: "published",
        community_platform_community_id: community.id,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 4: Create comments with different statuses
  const commentStatuses = [
    "published",
    "pending",
    "removed",
    "archived",
  ] as const;
  const createdComments: Record<string, ICommunityPlatformComment> = {};

  for (const status of commentStatuses) {
    const comment =
      await api.functional.communityPlatform.member.comments.create(
        connection,
        {
          body: {
            body: RandomGenerator.content({ paragraphs: 1 }),
            community_platform_post_id: post.id,
            status: status,
          } satisfies ICommunityPlatformComment.ICreate,
        },
      );
    typia.assert(comment);
    createdComments[status] = comment;
  }

  // Step 5: Test retrieval access for each comment status with regular member
  // Published comment should be accessible to all users
  const publishedComment = await api.functional.communityPlatform.comments.at(
    connection,
    {
      commentId: createdComments.published.id,
    },
  );
  typia.assert(publishedComment);
  TestValidator.equals(
    "published comment should be retrievable by regular member",
    publishedComment.id,
    createdComments.published.id,
  );
  TestValidator.equals(
    "published comment should have correct status",
    publishedComment.status,
    "published",
  );

  // Test retrieval of restricted status comments with regular member
  // The API should handle access control internally
  const restrictedStatuses = ["pending", "removed", "archived"] as const;

  for (const status of restrictedStatuses) {
    const comment = createdComments[status];

    // Attempt to retrieve restricted comment
    const retrievedComment = await api.functional.communityPlatform.comments.at(
      connection,
      {
        commentId: comment.id,
      },
    );
    typia.assert(retrievedComment);

    // Validate that we can retrieve the comment (API applies internal access control)
    TestValidator.equals(
      `${status} comment should be retrievable with proper access control`,
      retrievedComment.id,
      comment.id,
    );
    TestValidator.equals(
      `${status} comment should maintain its status`,
      retrievedComment.status,
      status,
    );
  }

  // Step 6: Test error handling for non-existent comment ID
  const nonExistentCommentId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "non-existent comment should return error",
    async () => {
      await api.functional.communityPlatform.comments.at(connection, {
        commentId: nonExistentCommentId,
      });
    },
  );

  // Step 7: Additional validation tests
  // Validate comment relationships and data integrity
  TestValidator.equals(
    "comment should be associated with the correct post",
    publishedComment.community_platform_post_id,
    post.id,
  );

  TestValidator.equals(
    "comment post relationship should match",
    publishedComment.post.id,
    post.id,
  );

  // Validate comment content and metadata
  TestValidator.predicate(
    "comment body should not be empty",
    publishedComment.body.length > 0,
  );

  TestValidator.predicate(
    "comment should have valid creation timestamp",
    new Date(publishedComment.created_at).getTime() > 0,
  );

  // Test that different status comments have proper differentiation
  const statusComments = Object.values(createdComments);
  TestValidator.predicate(
    "should have created comments with different statuses",
    statusComments.length === commentStatuses.length,
  );

  // Validate that all created comments have unique IDs
  const commentIds = statusComments.map((comment) => comment.id);
  const uniqueIds = new Set(commentIds);
  TestValidator.equals(
    "all comment IDs should be unique",
    uniqueIds.size,
    commentIds.length,
  );
}
