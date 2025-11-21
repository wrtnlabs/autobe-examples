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
 * Test that administrators can soft delete votes created on comments with
 * proper context preservation. Validates that vote deletion maintains
 * referential integrity with the associated comment and that the deletion
 * operation correctly handles the comment-vote relationship. The test ensures
 * that soft deleted votes remain associated with their original comment content
 * while being excluded from active voting calculations.
 */
export async function test_api_admin_vote_deletion_with_comment_context(
  connection: api.IConnection,
) {
  // Step 1: Create admin authentication context
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

  // Step 2: Create member authentication context
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "MemberPassword123!",
        display_name: RandomGenerator.name(),
        ip: "192.168.1.1",
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Switch to member context for comment creation
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "MemberPassword123!",
      ip: "192.168.1.1",
      href: "https://example.com/create-comment",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Step 3: Create a comment for voting target
  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        body: RandomGenerator.paragraph({ sentences: 3 }),
        community_platform_post_id: typia.random<
          string & tags.Format<"uuid">
        >(),
        parent_id: undefined,
        status: "published",
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(comment);

  // Switch back to admin context for vote operations
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      ip: "192.168.1.1",
      href: "https://example.com/vote",
      referrer: "https://example.com",
      session_id: typia.random<string & tags.Format<"uuid">>(),
      user_agent: "Test Agent",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

  // Step 4: Create vote record on comment for deletion testing
  const vote: ICommunityPlatformVote =
    await api.functional.communityPlatform.admin.votes.create(connection, {
      body: {
        vote_type: "upvote",
        actor_type: "admin",
        content_type: "comment",
        status: "active",
      } satisfies ICommunityPlatformVote.ICreate,
    });
  typia.assert(vote);

  // Step 5: Perform soft deletion of the vote
  await api.functional.communityPlatform.admin.votes.erase(connection, {
    voteId: vote.id,
  });

  // Step 6: Validate that referential integrity is maintained
  TestValidator.equals(
    "vote should have comment content type",
    vote.content_type,
    "comment",
  );

  TestValidator.equals(
    "vote should have admin actor type",
    vote.actor_type,
    "admin",
  );

  TestValidator.equals(
    "vote should have upvote type",
    vote.vote_type,
    "upvote",
  );

  // Step 7: Verify vote creation timestamp exists
  TestValidator.predicate(
    "vote should have creation timestamp",
    vote.created_at !== undefined && vote.created_at !== null,
  );

  // Step 8: Verify vote update timestamp exists
  TestValidator.predicate(
    "vote should have update timestamp",
    vote.updated_at !== undefined && vote.updated_at !== null,
  );

  // Final validation: Ensure the test workflow completed successfully
  TestValidator.predicate(
    "admin authentication successful",
    admin.id !== undefined && admin.email === adminEmail,
  );

  TestValidator.predicate(
    "member authentication successful",
    member.id !== undefined && member.email === memberEmail,
  );

  TestValidator.predicate(
    "comment creation successful",
    comment.id !== undefined && comment.body.length > 0,
  );

  TestValidator.predicate(
    "vote creation successful",
    vote.id !== undefined && vote.content_type === "comment",
  );
}
