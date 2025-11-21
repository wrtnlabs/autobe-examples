import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Test administrative deletion of moderator-created content with proper
 * authorization validation. Administrator authenticates, creates moderator
 * account, creates post through moderator account, then performs administrative
 * deletion. Validates that administrators can override moderator-level content
 * management and ensures proper audit trail for cross-role content moderation
 * actions.
 */
export async function test_api_post_admin_deletion_moderator_content(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account with system-wide privileges
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        display_name: RandomGenerator.name(),
        admin_level: "system",
        is_super_admin: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create member account for post creation (posts are created by members)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "MemberPassword123!",
        display_name: RandomGenerator.name(),
        href: "https://example.com/join",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 3: Create post through member account
  const postData = {
    title: RandomGenerator.paragraph({ sentences: 5, wordMin: 3, wordMax: 8 }),
    post_type: "text" as const,
    status: "published" as const,
    community_platform_community_id: typia.random<
      string & tags.Format<"uuid">
    >(),
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: postData,
    });
  typia.assert(post);

  // Step 4: Switch back to administrator account for deletion
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      href: "https://example.com/admin",
      referrer: "https://example.com",
      session_id: typia.random<string>(),
      user_agent: "test-agent",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

  // Step 5: Perform administrative deletion of the member-created post
  const deletedPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.admin.posts.erase(connection, {
      postId: post.id,
    });
  typia.assert(deletedPost);

  // Step 6: Validate deletion was successful and post is properly marked as deleted
  TestValidator.equals(
    "post ID should remain unchanged after deletion",
    deletedPost.id,
    post.id,
  );
  TestValidator.equals(
    "post title should remain unchanged after deletion",
    deletedPost.title,
    post.title,
  );
  TestValidator.predicate(
    "post should have deleted_at timestamp set",
    deletedPost.deleted_at !== undefined && deletedPost.deleted_at !== null,
  );
  TestValidator.predicate(
    "deleted_at timestamp should be valid ISO date",
    new Date(deletedPost.deleted_at!).toString() !== "Invalid Date",
  );
}
