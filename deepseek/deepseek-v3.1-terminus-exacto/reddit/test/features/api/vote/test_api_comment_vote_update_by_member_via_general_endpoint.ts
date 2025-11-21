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
 * Test vote updates on comments using the general vote update endpoint.
 *
 * This test validates cross-endpoint vote update functionality by creating a
 * member, posting content, creating a comment, voting on the comment, and then
 * updating the vote through the general vote update endpoint. It ensures that
 * votes created through specific content endpoints can be properly managed
 * through unified voting APIs.
 *
 * Note: This test assumes a valid community context exists for post creation.
 */
export async function test_api_comment_vote_update_by_member_via_general_endpoint(
  connection: api.IConnection,
) {
  // 1. Create member account for authentication
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

  // 2. Create a post for the comment context
  // Note: Using a valid UUID format - in a real scenario, this would be an existing community ID
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

  // 3. Create a comment on the post
  const comment = await api.functional.communityPlatform.member.comments.create(
    connection,
    {
      body: {
        body: RandomGenerator.content({ paragraphs: 1 }),
        community_platform_post_id: post.id,
        status: "published",
      } satisfies ICommunityPlatformComment.ICreate,
    },
  );
  typia.assert(comment);

  // 4. Create initial vote on the comment (upvote)
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
  TestValidator.equals(
    "initial vote should be upvote",
    initialVote.vote_type,
    "upvote",
  );

  // 5. Update the vote using general vote update endpoint (change to downvote)
  const updatedVote =
    await api.functional.communityPlatform.member.votes.update(connection, {
      voteId: initialVote.id,
      body: {
        vote_type: "downvote",
      } satisfies ICommunityPlatformVote.IUpdate,
    });
  typia.assert(updatedVote);

  // 6. Validate the vote was successfully updated
  TestValidator.equals(
    "vote ID should remain the same",
    updatedVote.id,
    initialVote.id,
  );
  TestValidator.equals(
    "vote type should change to downvote",
    updatedVote.vote_type,
    "downvote",
  );
  TestValidator.equals(
    "content type should remain comment",
    updatedVote.content_type,
    "comment",
  );
  TestValidator.equals(
    "actor type should remain member",
    updatedVote.actor_type,
    "member",
  );
  TestValidator.equals(
    "comment ID reference should remain",
    updatedVote.community_platform_comment_id,
    comment.id,
  );
  TestValidator.predicate(
    "post ID should be null for comment votes",
    updatedVote.community_platform_post_id === null ||
      updatedVote.community_platform_post_id === undefined,
  );
}
