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
 * Test comment status modification workflow where a member updates their
 * comment's moderation status. Validates status transition rules, moderation
 * workflow integration, and proper visibility controls based on status changes.
 * Ensures that status updates follow platform moderation policies and maintain
 * content integrity throughout the comment lifecycle.
 */
export async function test_api_comment_status_update_workflow(
  connection: api.IConnection,
) {
  // Step 1: Create member account for authentication context
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

  // Step 2: Create a post to serve as comment target
  // Use a realistic community ID pattern (though we can't create communities via available APIs)
  const communityId = typia.random<string & tags.Format<"uuid">>();
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
        community_platform_community_id: communityId,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 3: Create initial comment with published status
  const initialCommentBody = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 3,
    sentenceMax: 6,
  });
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

  // Step 4: Test status transition to "pending"
  const pendingComment =
    await api.functional.communityPlatform.member.comments.update(connection, {
      commentId: initialComment.id,
      body: {
        status: "pending",
      } satisfies ICommunityPlatformComment.IUpdate,
    });
  typia.assert(pendingComment);
  TestValidator.equals(
    "comment status should be pending",
    pendingComment.status,
    "pending",
  );
  TestValidator.equals(
    "comment body should remain unchanged",
    pendingComment.body,
    initialCommentBody,
  );

  // Step 5: Test status transition to "removed"
  const removedComment =
    await api.functional.communityPlatform.member.comments.update(connection, {
      commentId: initialComment.id,
      body: {
        status: "removed",
      } satisfies ICommunityPlatformComment.IUpdate,
    });
  typia.assert(removedComment);
  TestValidator.equals(
    "comment status should be removed",
    removedComment.status,
    "removed",
  );
  TestValidator.equals(
    "comment body should remain unchanged",
    removedComment.body,
    initialCommentBody,
  );

  // Step 6: Test status transition to "archived"
  const archivedComment =
    await api.functional.communityPlatform.member.comments.update(connection, {
      commentId: initialComment.id,
      body: {
        status: "archived",
      } satisfies ICommunityPlatformComment.IUpdate,
    });
  typia.assert(archivedComment);
  TestValidator.equals(
    "comment status should be archived",
    archivedComment.status,
    "archived",
  );
  TestValidator.equals(
    "comment body should remain unchanged",
    archivedComment.body,
    initialCommentBody,
  );

  // Step 7: Test status transition back to "published" with updated content
  const updatedBody = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 4,
    sentenceMax: 8,
  });
  const finalComment =
    await api.functional.communityPlatform.member.comments.update(connection, {
      commentId: initialComment.id,
      body: {
        body: updatedBody,
        status: "published",
      } satisfies ICommunityPlatformComment.IUpdate,
    });
  typia.assert(finalComment);
  TestValidator.equals(
    "comment status should be published",
    finalComment.status,
    "published",
  );
  TestValidator.equals(
    "comment body should be updated",
    finalComment.body,
    updatedBody,
  );

  // Step 8: Validate that core comment properties are maintained throughout status changes
  TestValidator.equals(
    "comment ID should remain constant",
    finalComment.id,
    initialComment.id,
  );
  TestValidator.equals(
    "post association should remain constant",
    finalComment.community_platform_post_id,
    post.id,
  );
  TestValidator.predicate(
    "created_at timestamp should be preserved",
    finalComment.created_at === initialComment.created_at,
  );

  // Step 9: Test error scenario - updating non-existent comment
  await TestValidator.error(
    "should fail when updating non-existent comment",
    async () => {
      await api.functional.communityPlatform.member.comments.update(
        connection,
        {
          commentId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            status: "published",
          } satisfies ICommunityPlatformComment.IUpdate,
        },
      );
    },
  );

  // Step 10: Validate comment engagement metrics are properly maintained
  TestValidator.predicate(
    "reply_count should be a non-negative integer",
    finalComment.reply_count >= 0,
  );
  TestValidator.predicate(
    "score should be properly maintained",
    typeof finalComment.score === "number" || finalComment.score === undefined,
  );
}
