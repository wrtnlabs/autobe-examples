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
 * Test permission validation for comment deletion operations, ensuring that
 * only administrators can delete comments regardless of who created them. This
 * scenario validates role-based access control by attempting deletion with
 * different user roles and verifying that only administrators have the
 * necessary permissions. The test confirms proper authorization checks are in
 * place for content moderation operations.
 */
export async function test_api_admin_comment_deletion_permission_validation(
  connection: api.IConnection,
) {
  // Generate unique email addresses for admin and member
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const memberEmail = typia.random<string & tags.Format<"email">>();

  // 1. Create admin account for authorized deletion
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

  // 2. Create member account to create the original comment
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

  // Note: Since we don't have a community creation API, we'll need to use a valid community ID
  // For testing purposes, we'll assume there's at least one existing community
  // In a real scenario, we would create a community first or use a known valid ID
  const communityId = typia.random<string & tags.Format<"uuid">>();

  // 3. Create post as prerequisite for comment creation
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 5 }),
        post_type: "text",
        status: "published",
        community_platform_community_id: communityId,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // 4. Create comment that will be deleted
  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        body: RandomGenerator.paragraph({ sentences: 3 }),
        community_platform_post_id: post.id,
        status: "published",
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(comment);

  // 5. Test that member cannot delete comment using admin endpoint
  // This tests the authorization boundary - members should not access admin endpoints
  await TestValidator.error(
    "member should not access admin comment deletion endpoint",
    async () => {
      await api.functional.communityPlatform.admin.comments.erase(connection, {
        commentId: comment.id,
      });
    },
  );

  // 6. Switch to admin account
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      href: "https://example.com/login",
      referrer: "https://example.com",
      session_id: typia.random<string>(),
      user_agent: "Test Agent",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

  // 7. Admin should be able to delete the comment
  const deletedComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.admin.comments.erase(connection, {
      commentId: comment.id,
    });
  typia.assert(deletedComment);

  // 8. Verify the comment was soft deleted
  TestValidator.predicate(
    "comment should have deletion timestamp",
    deletedComment.deleted_at !== null &&
      deletedComment.deleted_at !== undefined,
  );

  // 9. Additional validation: Ensure the comment content is preserved for audit
  TestValidator.equals(
    "comment body should be preserved after deletion",
    deletedComment.body,
    comment.body,
  );

  TestValidator.equals(
    "comment ID should remain the same after deletion",
    deletedComment.id,
    comment.id,
  );
}
