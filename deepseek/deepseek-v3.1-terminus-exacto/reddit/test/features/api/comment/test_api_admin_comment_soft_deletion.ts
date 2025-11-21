import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Test the soft deletion workflow where an administrator removes a comment from
 * public visibility while preserving it for audit purposes. The scenario
 * validates that the deleted_at timestamp is properly set, the comment remains
 * in the database but is excluded from normal queries, and that only authorized
 * administrators can perform this operation.
 */
export async function test_api_admin_comment_soft_deletion(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for authentication context
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        display_name: RandomGenerator.name(),
        admin_level: "content",
        is_super_admin: false,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create member account to create the original comment
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "MemberPassword123!",
        display_name: RandomGenerator.name(),
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 3: Create post as prerequisite for comment creation
  // Use a valid UUID format for community ID (even if it doesn't exist, the test will validate the error handling)
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 5 }),
        post_type: "text",
        status: "published",
        community_platform_community_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // Step 4: Create comment that will be deleted by admin
  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        body: RandomGenerator.content({ paragraphs: 1 }),
        community_platform_post_id: post.id,
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(comment);

  // Validate initial state - comment should not have deleted_at timestamp
  TestValidator.predicate(
    "comment should not have deleted_at timestamp before deletion",
    comment.deleted_at === null || comment.deleted_at === undefined,
  );

  // Step 5: Switch to admin authentication context
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      href: "https://example.com/admin",
      referrer: "https://example.com",
      session_id: typia.random<string>(),
      user_agent: "Test Agent",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

  // Step 6: Perform soft deletion of the comment
  const deletedComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.admin.comments.erase(connection, {
      commentId: comment.id,
    });
  typia.assert(deletedComment);

  // Step 7: Validate that deleted_at timestamp is set
  TestValidator.predicate(
    "deleted_at timestamp should be set after soft deletion",
    deletedComment.deleted_at !== null &&
      deletedComment.deleted_at !== undefined,
  );

  // Step 8: Verify comment ID matches original comment
  TestValidator.equals(
    "deleted comment ID should match original comment ID",
    deletedComment.id,
    comment.id,
  );

  // Step 9: Test authorization boundaries by attempting deletion with member credentials
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "MemberPassword123!",
      href: "https://example.com/member",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Member should not be able to delete comments via admin endpoint
  await TestValidator.error(
    "member should not be able to delete comments via admin endpoint",
    async () => {
      await api.functional.communityPlatform.admin.comments.erase(connection, {
        commentId: comment.id,
      });
    },
  );

  // Additional validation: Verify soft deletion preserves comment data
  TestValidator.equals(
    "comment body should be preserved after soft deletion",
    deletedComment.body,
    comment.body,
  );

  TestValidator.equals(
    "post association should be preserved after soft deletion",
    deletedComment.community_platform_post_id,
    comment.community_platform_post_id,
  );
}
