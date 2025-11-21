import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";

/**
 * Test administrator voting workflow with complete dependency chain.
 *
 * This test validates that administrators can participate in content curation
 * alongside regular members by casting votes on community platform posts. The
 * scenario involves multiple actors: a post author member, a voting member, and
 * an administrator, ensuring proper hierarchical voting system functionality
 * and vote tracking across different user roles.
 */
export async function test_api_admin_post_vote_creation(
  connection: api.IConnection,
) {
  // Step 1: Create first member account to author the post
  const member1Email = typia.random<string & tags.Format<"email">>();
  const member1: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: member1Email,
        password: "password123",
        display_name: RandomGenerator.name(),
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member1);

  // Step 2: Create post for voting operations
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

  // Step 3: Create second member account for initial voting
  const member2Email = typia.random<string & tags.Format<"email">>();
  const member2: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: member2Email,
        password: "password123",
        display_name: RandomGenerator.name(),
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member2);

  // Step 4: Create initial member vote on the post
  const memberVote: ICommunityPlatformVote =
    await api.functional.communityPlatform.member.posts.votes.create(
      connection,
      {
        postId: post.id,
        body: {
          vote_type: "upvote",
        } satisfies ICommunityPlatformVote.ICreate,
      },
    );
  typia.assert(memberVote);

  // Step 5: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "adminpassword123",
        display_name: RandomGenerator.name(),
        admin_level: "content",
        is_super_admin: false,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 6: Login as administrator to establish proper authentication context
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "adminpassword123",
      href: "https://example.com/login",
      referrer: "https://example.com",
      session_id: typia.random<string & tags.Format<"uuid">>(),
      user_agent: "test-agent",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

  // Step 7: Create administrator vote on the post
  const adminVote: ICommunityPlatformVote =
    await api.functional.communityPlatform.admin.posts.votes.create(
      connection,
      {
        postId: post.id,
        body: {
          vote_type: "upvote",
        } satisfies ICommunityPlatformVote.ICreate,
      },
    );
  typia.assert(adminVote);

  // Validations
  TestValidator.equals(
    "admin vote has correct post reference",
    adminVote.community_platform_post_id,
    post.id,
  );
  TestValidator.equals(
    "admin vote has correct content type",
    adminVote.content_type,
    "post",
  );
  TestValidator.equals(
    "admin vote has correct vote type",
    adminVote.vote_type,
    "upvote",
  );
  TestValidator.equals(
    "admin vote has active status",
    adminVote.status,
    "active",
  );
  TestValidator.notEquals(
    "admin vote ID differs from member vote ID",
    adminVote.id,
    memberVote.id,
  );
  TestValidator.predicate(
    "admin vote has valid actor type",
    adminVote.actor_type === "admin",
  );
}
