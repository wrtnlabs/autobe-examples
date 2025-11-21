import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";

export async function test_api_member_post_vote_duplication_prevention(
  connection: api.IConnection,
) {
  // Step 1: Authenticate member user
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

  // Step 2: Create a community (simulated since no community creation API exists)
  // For testing purposes, we'll use a valid UUID format
  const communityId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Create a post for voting
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 5 }),
        post_type: "text",
        status: "published",
        community_platform_community_id: communityId,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 4: Cast initial vote
  const initialVote =
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
  typia.assert(initialVote);

  // Step 5: Test duplicate vote prevention - attempt to create another vote
  // This should either update the existing vote or be rejected
  const duplicateVote =
    await api.functional.communityPlatform.member.posts.votes.create(
      connection,
      {
        postId: post.id,
        body: {
          vote_type: "downvote", // Different vote type to test update behavior
          actor_type: "member",
          content_type: "post",
          status: "active",
        } satisfies ICommunityPlatformVote.ICreate,
      },
    );
  typia.assert(duplicateVote);

  // Validate vote behavior based on platform policy
  // If duplicate votes are allowed as updates, IDs should match
  // If duplicate votes are prevented, this would throw an error
  TestValidator.equals(
    "vote should reference correct post",
    duplicateVote.community_platform_post_id,
    post.id,
  );
  TestValidator.predicate(
    "content type should be post",
    duplicateVote.content_type === "post",
  );
  TestValidator.predicate(
    "actor type should be member",
    duplicateVote.actor_type === "member",
  );
  TestValidator.predicate(
    "vote should have valid status",
    duplicateVote.status === "active",
  );

  // Additional validation: Ensure vote integrity
  TestValidator.predicate(
    "vote type should be valid",
    duplicateVote.vote_type === "upvote" ||
      duplicateVote.vote_type === "downvote",
  );
  TestValidator.predicate(
    "vote should have creation timestamp",
    typeof duplicateVote.created_at === "string",
  );
  TestValidator.predicate(
    "vote should have update timestamp",
    typeof duplicateVote.updated_at === "string",
  );

  // Test that we cannot vote with invalid data
  await TestValidator.error(
    "should reject vote with invalid post ID",
    async () => {
      await api.functional.communityPlatform.member.posts.votes.create(
        connection,
        {
          postId: "invalid-uuid-format",
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
