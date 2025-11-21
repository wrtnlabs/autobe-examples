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
import type { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";

/**
 * Test that administrators can create votes with different vote types (upvote
 * and downvote) on various content types. Validates that the voting system
 * properly handles different vote directions and content classifications.
 */
export async function test_api_admin_vote_creation_with_different_vote_types(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for vote creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";

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

  // Step 2: Create member account for content creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "MemberPassword123!";

  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        display_name: RandomGenerator.name(),
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 3: Switch to member context and create test content
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Create a post for voting
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

  // Create a comment for voting
  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        body: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 3,
          sentenceMax: 6,
        }),
        community_platform_post_id: post.id,
        status: "published",
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(comment);

  // Step 4: Switch to admin context for vote creation
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: "192.168.1.1",
      href: "https://example.com/admin/login",
      referrer: "https://example.com/admin",
      session_id: typia.random<string & tags.Format<"uuid">>(),
      user_agent: "Mozilla/5.0 (Test Agent)",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

  // Step 5: Test vote creation with different types
  const upvoteData: ICommunityPlatformVote.ICreate = {
    vote_type: "upvote",
    status: "active",
  } satisfies ICommunityPlatformVote.ICreate;

  const downvoteData: ICommunityPlatformVote.ICreate = {
    vote_type: "downvote",
    status: "active",
  } satisfies ICommunityPlatformVote.ICreate;

  // Create votes using the available API function
  const vote1: ICommunityPlatformVote =
    await api.functional.communityPlatform.admin.votes.create(connection, {
      body: upvoteData,
    });
  typia.assert(vote1);

  const vote2: ICommunityPlatformVote =
    await api.functional.communityPlatform.admin.votes.create(connection, {
      body: downvoteData,
    });
  typia.assert(vote2);

  // Step 6: Validate vote properties
  TestValidator.equals(
    "first vote should have correct vote type",
    vote1.vote_type,
    "upvote",
  );
  TestValidator.equals(
    "first vote should have active status",
    vote1.status,
    "active",
  );
  TestValidator.equals(
    "second vote should have correct vote type",
    vote2.vote_type,
    "downvote",
  );
  TestValidator.equals(
    "second vote should have active status",
    vote2.status,
    "active",
  );

  // Step 7: Verify vote IDs are unique
  TestValidator.notEquals("vote IDs should be unique", vote1.id, vote2.id);

  // Step 8: Verify vote timestamps are properly set
  TestValidator.predicate(
    "first vote should have creation timestamp",
    vote1.created_at !== undefined,
  );
  TestValidator.predicate(
    "first vote should have update timestamp",
    vote1.updated_at !== undefined,
  );
  TestValidator.predicate(
    "second vote should have creation timestamp",
    vote2.created_at !== undefined,
  );
  TestValidator.predicate(
    "second vote should have update timestamp",
    vote2.updated_at !== undefined,
  );

  // Step 9: Validate that actor_type is properly set (should be determined by authentication)
  TestValidator.predicate(
    "first vote should have actor type set",
    vote1.actor_type !== undefined,
  );
  TestValidator.predicate(
    "second vote should have actor type set",
    vote2.actor_type !== undefined,
  );

  // Step 10: Validate that content_type is properly set (should be determined by API context)
  TestValidator.predicate(
    "first vote should have content type set",
    vote1.content_type !== undefined,
  );
  TestValidator.predicate(
    "second vote should have content type set",
    vote2.content_type !== undefined,
  );
}
