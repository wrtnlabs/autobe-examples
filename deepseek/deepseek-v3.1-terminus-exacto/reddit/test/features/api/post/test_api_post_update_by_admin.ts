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
 * Test administrator's ability to update posts across the platform with full
 * system access privileges. Validates that administrators can modify any post
 * regardless of original creator or community association. Includes
 * comprehensive testing of title updates, status changes, content type
 * modifications, and verification of administrative override capabilities for
 * platform-wide content management.
 */
export async function test_api_post_update_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";

  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        display_name: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 8,
        }),
        admin_level: "system",
        is_super_admin: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "MemberPassword123!";

  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        display_name: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 8,
        }),
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 3: Authenticate as member
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: "https://example.com/create-post",
      referrer: "https://example.com/dashboard",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Step 4: Member creates a post with realistic community ID
  // Using a valid UUID format that would exist in a real system
  const communityId = typia.random<string & tags.Format<"uuid">>();

  const memberPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 3,
          wordMax: 10,
        }),
        post_type: "text",
        status: "published",
        community_platform_community_id: communityId,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(memberPost);

  // Step 5: Administrator authenticates
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: "127.0.0.1",
      href: "https://example.com/admin",
      referrer: "https://example.com",
      session_id: typia.random<string>(),
      user_agent: "Test Agent",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

  // Step 6: Administrator updates the post with comprehensive changes
  const updatedTitle =
    "Updated by Admin: " +
    RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 });

  const updatedPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.admin.posts.update(connection, {
      postId: memberPost.id,
      body: {
        title: updatedTitle,
        post_type: "media",
        status: "archived",
      } satisfies ICommunityPlatformPost.IUpdate,
    });
  typia.assert(updatedPost);

  // Step 7: Comprehensive validation of post updates
  TestValidator.equals(
    "post ID remains unchanged",
    updatedPost.id,
    memberPost.id,
  );
  TestValidator.notEquals(
    "title should be updated",
    updatedPost.title,
    memberPost.title,
  );
  TestValidator.notEquals(
    "post type should be updated",
    updatedPost.post_type,
    memberPost.post_type,
  );
  TestValidator.notEquals(
    "status should be updated",
    updatedPost.status,
    memberPost.status,
  );
  TestValidator.equals(
    "updated title matches expected",
    updatedPost.title,
    updatedTitle,
  );
  TestValidator.equals(
    "post type changed to media",
    updatedPost.post_type,
    "media",
  );
  TestValidator.equals(
    "status changed to archived",
    updatedPost.status,
    "archived",
  );

  // Step 8: Test partial updates (update only title)
  const titleOnlyUpdate: ICommunityPlatformPost =
    await api.functional.communityPlatform.admin.posts.update(connection, {
      postId: memberPost.id,
      body: {
        title:
          "Title Only Update: " +
          RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 6 }),
      } satisfies ICommunityPlatformPost.IUpdate,
    });
  typia.assert(titleOnlyUpdate);

  // Validate partial update preserved other fields
  TestValidator.equals(
    "post type remains media after partial update",
    titleOnlyUpdate.post_type,
    "media",
  );
  TestValidator.equals(
    "status remains archived after partial update",
    titleOnlyUpdate.status,
    "archived",
  );
  TestValidator.notEquals(
    "title should be updated again",
    titleOnlyUpdate.title,
    updatedPost.title,
  );

  // Step 9: Test administrative override capabilities
  // Verify admin can update posts created by different users
  TestValidator.predicate(
    "admin successfully updated member's post",
    titleOnlyUpdate.id === memberPost.id,
  );
}
