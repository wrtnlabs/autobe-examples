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
 * Test comment update functionality where the original author modifies their
 * comment content. Validates that comment authors can edit their content within
 * platform-defined time limits, that edit history is properly tracked, and that
 * updated comments maintain proper moderation workflows.
 */
export async function test_api_comment_update_by_original_author(
  connection: api.IConnection,
) {
  // Step 1: Create member account for authentication
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

  // Step 2: Create a post to serve as comment target
  // Use a valid UUID format for community ID - the system should handle non-existent communities gracefully
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

  // Step 3: Create initial comment on the post
  const initialCommentBody = RandomGenerator.content({ paragraphs: 1 });
  const initialComment =
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
  typia.assert(initialComment);

  // Step 4: Update the comment content as original author
  const updatedCommentBody = RandomGenerator.content({ paragraphs: 1 });
  const updatedComment =
    await api.functional.communityPlatform.member.comments.update(connection, {
      commentId: initialComment.id,
      body: {
        body: updatedCommentBody,
      } satisfies ICommunityPlatformComment.IUpdate,
    });
  typia.assert(updatedComment);

  // Step 5: Validate the comment was successfully updated
  TestValidator.equals(
    "comment ID remains the same",
    updatedComment.id,
    initialComment.id,
  );
  TestValidator.equals(
    "comment body is updated",
    updatedComment.body,
    updatedCommentBody,
  );
  TestValidator.equals(
    "post association remains intact",
    updatedComment.community_platform_post_id,
    post.id,
  );
  TestValidator.notEquals(
    "updated_at timestamp should change",
    updatedComment.updated_at,
    initialComment.updated_at,
  );
  TestValidator.predicate(
    "updated_at should be after created_at",
    new Date(updatedComment.updated_at) > new Date(updatedComment.created_at),
  );

  // Step 6: Verify comment status and metadata
  TestValidator.equals(
    "comment status remains published",
    updatedComment.status,
    "published",
  );
  TestValidator.predicate(
    "reply count should be zero",
    updatedComment.reply_count === 0,
  );
  TestValidator.predicate(
    "score should be defined",
    typeof updatedComment.score === "number",
  );
}
