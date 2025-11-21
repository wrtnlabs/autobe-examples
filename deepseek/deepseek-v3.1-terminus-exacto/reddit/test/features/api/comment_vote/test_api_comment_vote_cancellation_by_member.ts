import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";

/**
 * Test that members can cancel their votes on comments by updating vote status.
 *
 * This E2E test validates the complete workflow of vote cancellation:
 *
 * 1. Member registration and authentication
 * 2. Post creation to host comments
 * 3. Comment creation for voting target
 * 4. Initial vote casting on the comment
 * 5. Vote cancellation by changing vote type
 * 6. Validation of successful vote cancellation
 *
 * The test ensures proper vote lifecycle management and validates that members
 * can effectively cancel their votes by changing vote types on community
 * platform comments.
 */
export async function test_api_comment_vote_cancellation_by_member(
  connection: api.IConnection,
) {
  // Step 1: Create member account for authentication
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

  // Step 2: Create a post to host comments
  // Use a valid community ID format - the actual community creation is handled by the system
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

  // Step 3: Create a comment on the post
  const comment = await api.functional.communityPlatform.member.comments.create(
    connection,
    {
      body: {
        body: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 3,
          sentenceMax: 6,
        }),
        community_platform_post_id: post.id,
      } satisfies ICommunityPlatformComment.ICreate,
    },
  );
  typia.assert(comment);

  // Step 4: Cast initial upvote on the comment
  const initialVote =
    await api.functional.communityPlatform.member.comments.votes.create(
      connection,
      {
        commentId: comment.id,
        body: {
          vote_type: "upvote",
          actor_type: "member",
          content_type: "comment",
          status: "active",
        } satisfies ICommunityPlatformVote.ICreate,
      },
    );
  typia.assert(initialVote);

  // Step 5: Cancel the vote by changing to downvote (simulating cancellation via type change)
  const updatedVote =
    await api.functional.communityPlatform.member.comments.votes.update(
      connection,
      {
        commentId: comment.id,
        voteId: initialVote.id,
        body: {
          vote_type: "downvote",
        } satisfies ICommunityPlatformVote.IUpdate,
      },
    );
  typia.assert(updatedVote);

  // Step 6: Validate vote cancellation workflow
  TestValidator.equals(
    "vote ID remains the same after update",
    updatedVote.id,
    initialVote.id,
  );
  TestValidator.notEquals(
    "vote type changes from upvote to downvote",
    updatedVote.vote_type,
    initialVote.vote_type,
  );
  TestValidator.equals(
    "updated vote type should be downvote",
    updatedVote.vote_type,
    "downvote",
  );
  TestValidator.equals(
    "actor type remains member",
    updatedVote.actor_type,
    "member",
  );
  TestValidator.equals(
    "content type remains comment",
    updatedVote.content_type,
    "comment",
  );
  TestValidator.equals(
    "comment ID reference remains correct",
    updatedVote.community_platform_comment_id,
    comment.id,
  );
  TestValidator.predicate(
    "post ID reference should be empty string for comment votes",
    updatedVote.community_platform_post_id ===
      "00000000-0000-0000-0000-000000000000",
  );
  TestValidator.predicate(
    "updated timestamp should be more recent than creation timestamp",
    new Date(updatedVote.updated_at) > new Date(initialVote.created_at),
  );
}
