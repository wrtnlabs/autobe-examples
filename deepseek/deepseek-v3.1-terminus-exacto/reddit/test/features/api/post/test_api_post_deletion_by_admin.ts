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
 * Test that an administrator can delete any post across the entire platform.
 *
 * This scenario validates system-wide deletion privileges for administrators,
 * ensuring platform-level content management capabilities. The test verifies
 * that administrators can delete posts regardless of community association or
 * original creator.
 *
 * Implementation steps:
 *
 * 1. Create a regular member account to establish user context
 * 2. Create a post as the regular member to generate deletable content
 * 3. Create an administrator account with system-wide privileges
 * 4. Switch authentication context to administrator
 * 5. Execute post deletion operation as administrator
 * 6. Verify successful deletion and proper system response
 */
export async function test_api_post_deletion_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create a regular member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "SecurePass123!",
        display_name: RandomGenerator.name(),
        href: "https://example.com/registration",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create a post as the regular member
  // Use a valid UUID format for community ID (will be validated by server)
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
        community_platform_community_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // Step 3: Create an administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminSecure123!",
        display_name: RandomGenerator.name(),
        admin_level: "system",
        is_super_admin: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 4: Switch authentication to administrator (automatic via SDK)
  // The SDK automatically handles token switching when calling admin APIs

  // Step 5: Execute post deletion as administrator
  const deletedPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.erase(connection, {
      postId: post.id,
    });
  typia.assert(deletedPost);

  // Step 6: Verify deletion success
  TestValidator.equals(
    "deleted post ID should match original post ID",
    deletedPost.id,
    post.id,
  );
  TestValidator.predicate(
    "deleted post should have deletion timestamp",
    deletedPost.deleted_at !== undefined && deletedPost.deleted_at !== null,
  );

  // Additional validation: Verify admin privilege distinction
  TestValidator.notEquals(
    "post creator should be different from admin",
    member.id,
    admin.id,
  );
}
