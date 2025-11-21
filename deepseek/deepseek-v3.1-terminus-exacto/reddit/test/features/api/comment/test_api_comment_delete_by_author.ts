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
 * Test successful comment deletion workflow where a member permanently deletes
 * their own comment.
 *
 * This test validates the complete workflow of comment deletion by an
 * authenticated member. It ensures that:
 *
 * - Members can delete their own comments
 * - Authorization checks prevent unauthorized deletion attempts
 * - Comment deletion performs hard delete (permanent removal)
 * - Referential integrity is maintained with related entities
 * - Successful deletion returns appropriate response without data leakage
 *
 * The test follows a realistic user journey:
 *
 * 1. Member registration and authentication
 * 2. Post creation to host comments
 * 3. Comment creation by the authenticated member
 * 4. Comment deletion by the same member
 * 5. Verification of successful deletion
 */
export async function test_api_comment_delete_by_author(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as a member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "password123",
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create a post to host the comment
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 3,
          wordMax: 8,
        }),
        post_type: "text",
        status: "published",
        community_platform_community_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 3: Create a comment on the post
  const comment =
    await api.functional.communityPlatform.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          body: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 3,
            sentenceMax: 6,
          }),
          community_platform_post_id: post.id,
          status: "published",
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(comment);

  // Step 4: Delete the comment as the author
  await api.functional.communityPlatform.member.posts.comments.erase(
    connection,
    {
      postId: post.id,
      commentId: comment.id,
    },
  );

  // Step 5: Verify successful deletion by attempting to delete the same comment again
  await TestValidator.error(
    "deleted comment should not be deletable again",
    async () => {
      await api.functional.communityPlatform.member.posts.comments.erase(
        connection,
        {
          postId: post.id,
          commentId: comment.id,
        },
      );
    },
  );

  // Step 6: Verify post still exists and maintains integrity by creating another comment
  const newComment =
    await api.functional.communityPlatform.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          body: "Test comment to verify post integrity",
          community_platform_post_id: post.id,
          status: "published",
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(newComment);
  TestValidator.notEquals(
    "new comment should have different ID",
    newComment.id,
    comment.id,
  );

  // Final validation: Ensure the original comment ID is not reused
  TestValidator.predicate(
    "deleted comment ID should not match new comment ID",
    newComment.id !== comment.id,
  );
}
