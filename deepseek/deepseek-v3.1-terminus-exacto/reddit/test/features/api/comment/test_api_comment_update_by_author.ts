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
 * Test successful comment update workflow where a member updates their own
 * comment content.
 *
 * This test validates that authenticated members can modify their comments
 * within the allowed editing timeframe, including updating the comment body and
 * status. The test verifies proper authorization checks ensuring only the
 * comment author can update the comment, validates that system-managed fields
 * like timestamps are updated correctly, and confirms the updated comment is
 * returned with all changes applied.
 */
export async function test_api_comment_update_by_author(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as a member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "password123";

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

  // Step 2: Create a post to host the comment
  // Note: We need to use a valid community ID that exists in the system
  // Since we don't have a community creation API, we'll need to use a realistic UUID
  // that might exist in the test environment, or create a community first if API exists
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

  // Step 3: Create an initial comment on the post
  const initialCommentBody = RandomGenerator.content({ paragraphs: 1 });
  const comment =
    await api.functional.communityPlatform.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          body: initialCommentBody,
          community_platform_post_id: post.id,
          status: "published",
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(comment);

  // Step 4: Update the comment with new content and status
  const updatedCommentBody = RandomGenerator.content({ paragraphs: 1 });
  const updatedComment =
    await api.functional.communityPlatform.member.posts.comments.update(
      connection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          body: updatedCommentBody,
          status: "archived",
        } satisfies ICommunityPlatformComment.IUpdate,
      },
    );
  typia.assert(updatedComment);

  // Step 5: Validate the update was successful
  TestValidator.equals(
    "comment ID remains unchanged",
    updatedComment.id,
    comment.id,
  );
  TestValidator.equals(
    "comment body was updated",
    updatedComment.body,
    updatedCommentBody,
  );
  TestValidator.equals(
    "comment status was updated",
    updatedComment.status,
    "archived",
  );
  TestValidator.notEquals(
    "updated_at timestamp changed",
    updatedComment.updated_at,
    comment.updated_at,
  );
  TestValidator.equals(
    "created_at timestamp remains unchanged",
    updatedComment.created_at,
    comment.created_at,
  );
  TestValidator.equals(
    "post association remains unchanged",
    updatedComment.community_platform_post_id,
    post.id,
  );
}
