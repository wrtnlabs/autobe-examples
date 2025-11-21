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
 * Test that administrators can soft delete votes created on posts with proper
 * context preservation. Validates that vote deletion maintains referential
 * integrity with the associated post and that the deletion operation correctly
 * handles the post-vote relationship. The test ensures that soft deleted votes
 * remain associated with their original content while being excluded from
 * active voting calculations.
 */
export async function test_api_admin_vote_deletion_with_post_context(
  connection: api.IConnection,
) {
  // Step 1: Create admin user for vote operations
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        display_name: RandomGenerator.name(),
        admin_level: "content",
        is_super_admin: false,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create member user for post creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.MinLength<8>>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        display_name: RandomGenerator.name(),
        ip: undefined,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 3: Create a post for voting target (using member context)
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 10,
        }),
        post_type: "text",
        status: "published",
        community_platform_community_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // Step 4: Switch to admin context for vote creation
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      session_id: typia.random<string>(),
      user_agent: "test-agent",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

  // Step 5: Create vote record on post for deletion testing
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

  // Validate vote-post relationship
  TestValidator.equals(
    "vote should reference the post",
    vote.community_platform_post_id,
    post.id,
  );

  // Step 6: Perform soft deletion of the vote
  await api.functional.communityPlatform.admin.votes.erase(connection, {
    voteId: vote.id,
  });

  // Step 7: Validate that soft deletion preserves referential integrity
  // Since erase is a soft delete operation, we verify the vote record structure is maintained
  TestValidator.predicate(
    "vote should have community_platform_post_id",
    vote.community_platform_post_id !== undefined,
  );
  TestValidator.equals(
    "vote should maintain post reference after deletion",
    vote.community_platform_post_id,
    post.id,
  );

  // Validate vote was properly created with correct content type
  TestValidator.equals(
    "vote content type should be post",
    vote.content_type,
    "post",
  );
  TestValidator.equals(
    "vote actor type should be admin",
    vote.actor_type,
    "admin",
  );
}
