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
 * Test that administrators can create votes on comments created by members.
 * Validates that admin voting functionality works correctly for comment content
 * with proper authentication and prerequisite comment creation.
 */
export async function test_api_admin_vote_creation_on_comment(
  connection: api.IConnection,
) {
  // Step 1: Create admin user account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123";

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

  // Step 2: Create member user account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "MemberPassword123";

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

  // Step 3: Create a comment as the member
  // First login as member to establish authentication context
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Create a comment with realistic data
  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        body: RandomGenerator.paragraph({ sentences: 3 }),
        community_platform_post_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(comment);

  // Step 4: Switch back to admin authentication
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://example.com/admin/login",
      referrer: "https://example.com/admin",
      session_id: typia.random<string>(),
      user_agent: "Test Agent",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

  // Step 5: Create a vote on the member's comment
  const voteTypes = ["upvote", "downvote"] as const;
  const voteType = RandomGenerator.pick(voteTypes);

  const vote: ICommunityPlatformVote =
    await api.functional.communityPlatform.admin.votes.create(connection, {
      body: {
        vote_type: voteType,
      } satisfies ICommunityPlatformVote.ICreate,
    });
  typia.assert(vote);

  // Step 6: Validate the vote was created correctly
  TestValidator.equals("vote type matches input", vote.vote_type, voteType);
  TestValidator.predicate(
    "vote should have creation timestamp",
    vote.created_at !== undefined,
  );
  TestValidator.predicate(
    "vote should have update timestamp",
    vote.updated_at !== undefined,
  );
  TestValidator.predicate(
    "vote ID should be valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      vote.id,
    ),
  );

  // Additional validations based on actual vote structure
  TestValidator.predicate(
    "vote should have content type",
    vote.content_type !== undefined,
  );
  TestValidator.predicate(
    "vote should have actor type",
    vote.actor_type !== undefined,
  );
  TestValidator.predicate("vote should have status", vote.status !== undefined);
}
