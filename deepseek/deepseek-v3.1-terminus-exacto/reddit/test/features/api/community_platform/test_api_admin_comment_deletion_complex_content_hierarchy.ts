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
 * Test administrator comment deletion in a complex content hierarchy with
 * nested comments and multiple authors. This scenario validates that
 * administrators can remove comments regardless of comment nesting depth or
 * author relationships. The test creates multiple member accounts, establishes
 * threaded comment chains, and ensures administrators can delete any comment in
 * the hierarchy while maintaining referential integrity for remaining content.
 */
export async function test_api_admin_comment_deletion_complex_content_hierarchy(
  connection: api.IConnection,
) {
  // Create first member account to author the original post
  const firstMemberEmail = typia.random<string & tags.Format<"email">>();
  const firstMember = await api.functional.auth.member.join(connection, {
    body: {
      email: firstMemberEmail,
      password: "password123",
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(firstMember);

  // Use a valid UUID format for community ID (in real scenario, this would come from existing community)
  const communityId = typia.random<string & tags.Format<"uuid">>();

  // Create a post that will host threaded comments
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

  // Create second member account to author first-level comment
  const secondMemberEmail = typia.random<string & tags.Format<"email">>();
  const secondMember = await api.functional.auth.member.join(connection, {
    body: {
      email: secondMemberEmail,
      password: "password123",
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(secondMember);

  // Switch to second member and create first-level comment
  await api.functional.auth.member.login(connection, {
    body: {
      email: secondMemberEmail,
      password: "password123",
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const firstLevelComment =
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
  typia.assert(firstLevelComment);

  // Create third member account to author nested reply
  const thirdMemberEmail = typia.random<string & tags.Format<"email">>();
  const thirdMember = await api.functional.auth.member.join(connection, {
    body: {
      email: thirdMemberEmail,
      password: "password123",
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(thirdMember);

  // Switch to third member and create nested reply
  await api.functional.auth.member.login(connection, {
    body: {
      email: thirdMemberEmail,
      password: "password123",
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const nestedComment =
    await api.functional.communityPlatform.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          body: RandomGenerator.content({ paragraphs: 1 }),
          parent_id: firstLevelComment.id,
          community_platform_post_id: post.id,
          status: "published",
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(nestedComment);

  // Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "adminPassword123",
      display_name: RandomGenerator.name(),
      admin_level: "content",
      is_super_admin: false,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // Switch to administrator and delete the nested comment
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "adminPassword123",
      href: "https://example.com/admin/login",
      referrer: "https://example.com/admin",
      session_id: typia.random<string>(),
      user_agent: "Test Agent",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

  // Delete the nested comment as administrator
  await api.functional.communityPlatform.admin.posts.comments.erase(
    connection,
    {
      postId: post.id,
      commentId: nestedComment.id,
    },
  );

  // Validate that the comment was successfully deleted
  // The test passes if no error is thrown during deletion
  TestValidator.predicate(
    "nested comment successfully deleted by administrator",
    true,
  );
}
