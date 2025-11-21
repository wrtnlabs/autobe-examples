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
 * Test comment status update workflow where a member changes their comment's
 * moderation status. This scenario validates that comment authors can update
 * status fields within platform-defined constraints, including transitions
 * between published, pending, removed, and archived states. The test verifies
 * status validation rules, ensures proper audit trail maintenance for status
 * changes, and confirms that status updates respect platform moderation
 * policies and user permissions.
 */
export async function test_api_comment_update_status_change(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as member to establish user context
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
  // Using a valid UUID format for community ID (the system should handle non-existent communities appropriately)
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 5 }),
        post_type: "text",
        status: "published",
        community_platform_community_id: communityId,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 3: Create initial comment with default status
  const initialComment =
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
  typia.assert(initialComment);

  // Step 4: Update comment status to "pending"
  const updatedToPending =
    await api.functional.communityPlatform.member.posts.comments.update(
      connection,
      {
        postId: post.id,
        commentId: initialComment.id,
        body: {
          status: "pending",
        } satisfies ICommunityPlatformComment.IUpdate,
      },
    );
  typia.assert(updatedToPending);
  TestValidator.equals(
    "comment status should be updated to pending",
    updatedToPending.status,
    "pending",
  );

  // Step 5: Update comment status to "archived"
  const updatedToArchived =
    await api.functional.communityPlatform.member.posts.comments.update(
      connection,
      {
        postId: post.id,
        commentId: initialComment.id,
        body: {
          status: "archived",
        } satisfies ICommunityPlatformComment.IUpdate,
      },
    );
  typia.assert(updatedToArchived);
  TestValidator.equals(
    "comment status should be updated to archived",
    updatedToArchived.status,
    "archived",
  );

  // Step 6: Update comment status to "removed"
  const updatedToRemoved =
    await api.functional.communityPlatform.member.posts.comments.update(
      connection,
      {
        postId: post.id,
        commentId: initialComment.id,
        body: {
          status: "removed",
        } satisfies ICommunityPlatformComment.IUpdate,
      },
    );
  typia.assert(updatedToRemoved);
  TestValidator.equals(
    "comment status should be updated to removed",
    updatedToRemoved.status,
    "removed",
  );

  // Step 7: Update comment status back to "published"
  const updatedToPublished =
    await api.functional.communityPlatform.member.posts.comments.update(
      connection,
      {
        postId: post.id,
        commentId: initialComment.id,
        body: {
          status: "published",
        } satisfies ICommunityPlatformComment.IUpdate,
      },
    );
  typia.assert(updatedToPublished);
  TestValidator.equals(
    "comment status should be updated to published",
    updatedToPublished.status,
    "published",
  );

  // Step 8: Verify comment body can also be updated
  const updatedBody =
    await api.functional.communityPlatform.member.posts.comments.update(
      connection,
      {
        postId: post.id,
        commentId: initialComment.id,
        body: {
          body: "Updated comment content with new status workflow validation",
          status: "published",
        } satisfies ICommunityPlatformComment.IUpdate,
      },
    );
  typia.assert(updatedBody);
  TestValidator.equals(
    "comment body should be updated",
    updatedBody.body,
    "Updated comment content with new status workflow validation",
  );
  TestValidator.equals(
    "comment status should remain published",
    updatedBody.status,
    "published",
  );

  // Step 9: Verify audit trail - timestamps should be updated
  TestValidator.predicate(
    "updated_at timestamp should be newer than created_at",
    new Date(updatedBody.updated_at) > new Date(initialComment.created_at),
  );
}
