import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Test administrator's role in post moderation workflows including content
 * review, policy enforcement, and platform-wide moderation actions. Validates
 * administrative capabilities for handling escalated moderation cases,
 * implementing platform-wide content policies, and managing posts that require
 * higher-level intervention beyond community moderator authority.
 */
export async function test_api_post_update_moderation_workflow_by_admin(
  connection: api.IConnection,
) {
  // 1. Create administrator account with platform-wide moderation privileges
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminSecurePassword123!";

  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        display_name: RandomGenerator.name(),
        admin_level: "content",
        is_super_admin: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create member account to generate content requiring moderation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "MemberPassword123!";

  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        display_name: RandomGenerator.name(),
        ip: "192.168.1.1",
        href: "https://community-platform.com/register",
        referrer: "https://community-platform.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Switch to member account to create post
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      ip: "192.168.1.1",
      href: "https://community-platform.com/create-post",
      referrer: "https://community-platform.com/dashboard",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // 3. Create a post that requires administrative moderation intervention
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
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
    });
  typia.assert(post);

  // Validate community ID format
  TestValidator.predicate(
    "community ID should be valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      post.community_platform_community_id,
    ),
  );

  // 4. Switch back to administrator account for moderation actions
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: "192.168.1.100",
      href: "https://community-platform.com/admin/moderation",
      referrer: "https://community-platform.com/admin",
      session_id: typia.random<string>(),
      user_agent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

  // 5. Test administrator's ability to update post status and metadata
  const updatedPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.admin.posts.update(connection, {
      postId: post.id,
      body: {
        status: "archived",
        title: "[ARCHIVED] " + post.title,
      } satisfies ICommunityPlatformPost.IUpdate,
    });
  typia.assert(updatedPost);

  // 6. Validate post was properly updated by administrator
  TestValidator.equals(
    "post status should be archived",
    updatedPost.status,
    "archived",
  );
  TestValidator.predicate(
    "title should contain ARCHIVED prefix",
    updatedPost.title.startsWith("[ARCHIVED] "),
  );
  TestValidator.equals(
    "post ID should remain unchanged",
    updatedPost.id,
    post.id,
  );
  TestValidator.equals(
    "community ID should remain unchanged",
    updatedPost.community_platform_community_id,
    post.community_platform_community_id,
  );

  // 7. Test additional moderation actions - change to removed status
  const removedPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.admin.posts.update(connection, {
      postId: post.id,
      body: {
        status: "removed",
      } satisfies ICommunityPlatformPost.IUpdate,
    });
  typia.assert(removedPost);

  TestValidator.equals(
    "post status should be removed",
    removedPost.status,
    "removed",
  );

  // 8. Test post type modification by administrator
  const typeChangedPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.admin.posts.update(connection, {
      postId: post.id,
      body: {
        post_type: "link",
      } satisfies ICommunityPlatformPost.IUpdate,
    });
  typia.assert(typeChangedPost);

  TestValidator.equals(
    "post type should be changed to link",
    typeChangedPost.post_type,
    "link",
  );

  // 9. Validate comprehensive post metadata preservation
  TestValidator.equals(
    "post ID preserved across updates",
    typeChangedPost.id,
    post.id,
  );
  TestValidator.equals(
    "community ID preserved",
    typeChangedPost.community_platform_community_id,
    post.community_platform_community_id,
  );
  TestValidator.predicate(
    "created_at timestamp preserved",
    typeChangedPost.created_at === post.created_at,
  );

  // 10. Test error handling for invalid post updates
  await TestValidator.error(
    "should reject update with invalid post ID",
    async () => {
      await api.functional.communityPlatform.admin.posts.update(connection, {
        postId: "invalid-post-id",
        body: {
          status: "published",
        } satisfies ICommunityPlatformPost.IUpdate,
      });
    },
  );

  // 11. Test error handling for non-existent post
  await TestValidator.error(
    "should reject update for non-existent post",
    async () => {
      const nonExistentPostId = typia.random<string & tags.Format<"uuid">>();
      await api.functional.communityPlatform.admin.posts.update(connection, {
        postId: nonExistentPostId,
        body: {
          status: "published",
        } satisfies ICommunityPlatformPost.IUpdate,
      });
    },
  );
}
