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
 * Test complete vote lifecycle management where a member creates a post, casts
 * a vote on their own post, and then deletes that vote. Validates that members
 * can manage their voting preferences by removing votes they previously cast.
 * The scenario ensures proper authentication flow, post creation prerequisites,
 * vote creation, and successful vote deletion with proper authorization
 * checks.
 */
export async function test_api_post_vote_deletion_by_member(
  connection: api.IConnection,
) {
  // Step 1: Member registration and authentication
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

  // Step 2: Create a post as prerequisite for voting
  // Note: Since we don't have community creation API, we'll use a realistic UUID format
  // In a real scenario, this would come from an existing community or community creation API
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 5 }),
        post_type: "text",
        status: "published",
        community_platform_community_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 3: Cast a vote on the created post
  const vote = await api.functional.communityPlatform.member.posts.votes.create(
    connection,
    {
      postId: post.id,
      body: {
        vote_type: "upvote",
        actor_type: "member",
        content_type: "post",
        status: "active",
      } satisfies ICommunityPlatformVote.ICreate,
    },
  );
  typia.assert(vote);

  // Step 4: Delete the vote
  await api.functional.communityPlatform.member.posts.votes.erase(connection, {
    postId: post.id,
    voteId: vote.id,
  });

  // Step 5: Verify vote deletion by attempting to delete again (should fail)
  await TestValidator.error("deleted vote should not be found", async () => {
    await api.functional.communityPlatform.member.posts.votes.erase(
      connection,
      {
        postId: post.id,
        voteId: vote.id,
      },
    );
  });
}
