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
 * Test administrator's ability to update posts across different communities
 * while maintaining proper community context and association.
 *
 * This test validates that administrators can manage content platform-wide
 * without community restrictions, ensuring consistent content policies and
 * moderation standards are applied regardless of post origin. The test includes
 * verification of community association immutability during updates.
 */
export async function test_api_post_update_cross_community_by_admin(
  connection: api.IConnection,
) {
  // Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        display_name: RandomGenerator.name(),
        admin_level: "content",
        is_super_admin: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // Create member account
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

  // Create post as member
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
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

  // Switch to admin authentication
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      href: "https://example.com/admin",
      referrer: "https://example.com",
      session_id: typia.random<string>(),
      user_agent: "TestAgent/1.0",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

  // Update post as administrator across community boundaries
  const updatedPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.admin.posts.update(connection, {
      postId: post.id,
      body: {
        title: RandomGenerator.paragraph({
          sentences: 4,
          wordMin: 4,
          wordMax: 10,
        }),
        post_type: "text",
        status: "published",
      } satisfies ICommunityPlatformPost.IUpdate,
    });
  typia.assert(updatedPost);

  // Verify post was updated successfully using only existing properties
  TestValidator.equals(
    "post ID should remain the same",
    updatedPost.id,
    post.id,
  );
  TestValidator.notEquals(
    "post title should be updated",
    updatedPost.title,
    post.title,
  );
  TestValidator.equals(
    "post type should remain the same",
    updatedPost.post_type,
    post.post_type,
  );
  TestValidator.equals(
    "post status should remain published",
    updatedPost.status,
    "published",
  );

  // Validate community context persistence using available community properties
  TestValidator.equals(
    "community ID should remain unchanged",
    updatedPost.community.id,
    post.community.id,
  );
  TestValidator.equals(
    "community name should remain the same",
    updatedPost.community.name,
    post.community.name,
  );
  TestValidator.equals(
    "community slug should remain the same",
    updatedPost.community.slug,
    post.community.slug,
  );
  TestValidator.equals(
    "community status should remain the same",
    updatedPost.community.status,
    post.community.status,
  );
}
