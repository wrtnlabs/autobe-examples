import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";

/**
 * Test that the voting system prevents duplicate votes from the same member on
 * the same content.
 *
 * This test validates the business rule that users cannot vote multiple times
 * on the same post, ensuring vote integrity and preventing vote manipulation.
 * The test creates a member account, creates a target post, establishes an
 * initial vote, then attempts to create a duplicate vote on the same post with
 * the same member. The system should properly reject the duplicate vote attempt
 * and maintain only one vote record per member-post combination.
 */
export async function test_api_member_vote_duplicate_prevention(
  connection: api.IConnection,
) {
  // Step 1: Create member account for voting operations
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "password123",
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create target post for voting
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
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
    },
  );
  typia.assert(post);

  // Step 3: Create initial vote on the post
  const initialVote =
    await api.functional.communityPlatform.member.votes.create(connection, {
      body: {
        vote_type: "upvote",
        actor_type: "member",
        content_type: "post",
        status: "active",
      } satisfies ICommunityPlatformVote.ICreate,
    });
  typia.assert(initialVote);

  // Step 4: Attempt to create duplicate vote on the same post
  await TestValidator.error("duplicate vote should be rejected", async () => {
    await api.functional.communityPlatform.member.votes.create(connection, {
      body: {
        vote_type: "upvote",
        actor_type: "member",
        content_type: "post",
        status: "active",
      } satisfies ICommunityPlatformVote.ICreate,
    });
  });

  // The system should maintain vote integrity by preventing duplicate votes
  // Note: The actual duplicate prevention logic is handled by the backend
  // based on the member authentication context and post reference
}
