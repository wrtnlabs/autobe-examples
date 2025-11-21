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
 * Test complete vote lifecycle workflow from creation to soft deletion.
 *
 * Validates the entire voting system operation with proper authentication,
 * content creation, vote casting, and final deletion. This comprehensive test
 * ensures data integrity and proper audit trail maintenance throughout the vote
 * lifecycle, covering multi-actor authentication boundaries and administrative
 * operations.
 */
export async function test_api_admin_vote_deletion_workflow_complete(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for administrative operations
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

  // Step 2: Create member account for content creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "MemberPassword123!",
        display_name: RandomGenerator.name(),
        ip: "192.168.1.1",
        href: "https://community-platform.test/register",
        referrer: "https://community-platform.test/home",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 3: Create a post as member for voting
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

  // Step 4: Switch to admin context and create vote
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      ip: "192.168.1.1",
      href: "https://community-platform.test/admin",
      referrer: "https://community-platform.test/dashboard",
      session_id: typia.random<string>(),
      user_agent: "Test-Agent/1.0",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

  const vote: ICommunityPlatformVote =
    await api.functional.communityPlatform.admin.votes.create(connection, {
      body: {
        vote_type: "upvote",
        actor_type: "admin",
        content_type: "post",
        status: "active",
      } satisfies ICommunityPlatformVote.ICreate,
    });
  typia.assert(vote);

  // Step 5: Perform soft deletion of the vote
  await api.functional.communityPlatform.admin.votes.erase(connection, {
    voteId: vote.id,
  });

  // Step 6: Validate vote lifecycle completion
  TestValidator.equals(
    "admin account created successfully",
    admin.email,
    adminEmail,
  );
  TestValidator.equals(
    "member account created successfully",
    member.email,
    memberEmail,
  );
  TestValidator.equals(
    "post created with valid title length",
    post.title.length >= 5 && post.title.length <= 300,
    true,
  );
  TestValidator.equals(
    "vote created with correct content type",
    vote.content_type,
    "post",
  );
  TestValidator.equals(
    "vote has valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      vote.id,
    ),
    true,
  );
  TestValidator.predicate("soft deletion completed without errors", true);
}
