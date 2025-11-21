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
 * Test that a member can successfully create an upvote on a post they have
 * access to.
 *
 * This test validates the complete voting workflow for community platform
 * members. It ensures that authenticated members can express their opinion on
 * community content through voting, with proper vote recording, score
 * calculation, and content engagement tracking. The test verifies that votes
 * are correctly associated with target posts, vote types are properly recorded,
 * and member voting activity is tracked in the system.
 */
export async function test_api_member_vote_post_creation(
  connection: api.IConnection,
) {
  // Step 1: Create member account for authentication context
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "password123",
      display_name: RandomGenerator.name(),
      ip: "192.168.1.1",
      href: "https://community.example.com/register",
      referrer: "https://community.example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create a post using a randomly generated community ID
  // Since community creation API is not available, we'll use a valid UUID
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

  // Step 3: Cast an upvote on the created post
  const vote = await api.functional.communityPlatform.member.votes.create(
    connection,
    {
      body: {
        vote_type: "upvote",
        actor_type: "member",
        content_type: "post",
        status: "active",
      } satisfies ICommunityPlatformVote.ICreate,
    },
  );
  typia.assert(vote);

  // Step 4: Validate vote creation response
  TestValidator.equals("vote type should be upvote", vote.vote_type, "upvote");
  TestValidator.equals("vote status should be active", vote.status, "active");
  TestValidator.equals(
    "vote content type should be post",
    vote.content_type,
    "post",
  );
  TestValidator.equals(
    "vote actor type should be member",
    vote.actor_type,
    "member",
  );
  TestValidator.equals(
    "vote should be associated with the post",
    vote.community_platform_post_id,
    post.id,
  );

  // Step 5: Verify vote does not have comment association (since it's a post vote)
  TestValidator.equals(
    "vote should not have comment association",
    vote.community_platform_comment_id,
    undefined,
  );

  // Step 6: Validate timestamps are properly set
  const createdAt = new Date(vote.created_at);
  const updatedAt = new Date(vote.updated_at);
  TestValidator.predicate(
    "created_at should be valid date",
    !isNaN(createdAt.getTime()),
  );
  TestValidator.predicate(
    "updated_at should be valid date",
    !isNaN(updatedAt.getTime()),
  );
  TestValidator.predicate(
    "updated_at should be same or later than created_at",
    updatedAt >= createdAt,
  );
}
