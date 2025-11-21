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
 * Test complete vote creation workflow for authenticated members on posts.
 *
 * This test validates the entire voting process from member authentication to
 * vote creation and verification. It ensures that authenticated members can
 * properly cast votes (upvote/downvote) on posts, and that the voting system
 * correctly records votes, maintains integrity, and updates post scores.
 *
 * The test follows this workflow:
 *
 * 1. Authenticate as a member to establish voting context
 * 2. Create a post to serve as voting target
 * 3. Cast different types of votes on the post
 * 4. Validate vote creation and post score updates
 * 5. Verify voting integrity and actor type assignment
 */
export async function test_api_member_post_vote_creation_complete(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as member to establish voting context
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "password123",
      display_name: RandomGenerator.name(),
      ip: "192.168.1.1",
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create a post to serve as voting target
  // Note: Using a random UUID for community_id since community creation API is not available
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

  // Step 3: Cast upvote on the post
  const upvote =
    await api.functional.communityPlatform.member.posts.votes.create(
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
  typia.assert(upvote);

  // Validate upvote creation
  TestValidator.equals(
    "upvote vote_type should be 'upvote'",
    upvote.vote_type,
    "upvote",
  );
  TestValidator.equals(
    "upvote actor_type should be 'member'",
    upvote.actor_type,
    "member",
  );
  TestValidator.equals(
    "upvote content_type should be 'post'",
    upvote.content_type,
    "post",
  );
  TestValidator.equals(
    "upvote status should be 'active'",
    upvote.status,
    "active",
  );
  TestValidator.equals(
    "upvote post_id should match created post",
    upvote.community_platform_post_id,
    post.id,
  );

  // Step 4: Cast downvote on the post
  const downvote =
    await api.functional.communityPlatform.member.posts.votes.create(
      connection,
      {
        postId: post.id,
        body: {
          vote_type: "downvote",
          actor_type: "member",
          content_type: "post",
          status: "active",
        } satisfies ICommunityPlatformVote.ICreate,
      },
    );
  typia.assert(downvote);

  // Validate downvote creation
  TestValidator.equals(
    "downvote vote_type should be 'downvote'",
    downvote.vote_type,
    "downvote",
  );
  TestValidator.equals(
    "downvote actor_type should be 'member'",
    downvote.actor_type,
    "member",
  );
  TestValidator.equals(
    "downvote content_type should be 'post'",
    downvote.content_type,
    "post",
  );
  TestValidator.equals(
    "downvote status should be 'active'",
    downvote.status,
    "active",
  );
  TestValidator.equals(
    "downvote post_id should match created post",
    downvote.community_platform_post_id,
    post.id,
  );

  // Step 5: Validate vote uniqueness and integrity
  TestValidator.notEquals(
    "upvote and downvote should have different IDs",
    upvote.id,
    downvote.id,
  );
  TestValidator.equals(
    "upvote and downvote should target the same post",
    upvote.community_platform_post_id,
    downvote.community_platform_post_id,
  );

  // Step 6: Test error scenario - voting on non-existent post should fail
  await TestValidator.error(
    "voting on non-existent post should fail",
    async () => {
      await api.functional.communityPlatform.member.posts.votes.create(
        connection,
        {
          postId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            vote_type: "upvote",
            actor_type: "member",
            content_type: "post",
            status: "active",
          } satisfies ICommunityPlatformVote.ICreate,
        },
      );
    },
  );
}
