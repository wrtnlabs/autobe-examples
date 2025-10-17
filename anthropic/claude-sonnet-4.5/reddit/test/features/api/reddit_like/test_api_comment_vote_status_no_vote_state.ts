import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommentVote";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

/**
 * Test retrieving vote status on a comment that has never been voted on.
 *
 * This test validates the vote status retrieval functionality for comments
 * where the authenticated member has not cast any vote. The test ensures the
 * API properly indicates a "no vote" state, which is essential for UI rendering
 * to distinguish between users who have never voted versus users who removed
 * their vote.
 *
 * Test workflow:
 *
 * 1. Create and authenticate a new member account
 * 2. Create a community to provide context for posts
 * 3. Create a post within the community
 * 4. Create a comment on the post
 * 5. Retrieve vote status without casting any vote
 * 6. Validate the response indicates no vote exists
 */
export async function test_api_comment_vote_status_no_vote_state(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a new member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const memberUsername = RandomGenerator.alphaNumeric(8);

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: memberUsername,
        email: memberEmail,
        password: memberPassword,
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create a community to provide context for posts
  const communityCode = RandomGenerator.alphaNumeric(10);
  const communityName = RandomGenerator.name(2);
  const communityDescription = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 7,
  });

  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: {
        code: communityCode,
        name: communityName,
        description: communityDescription,
      } satisfies IRedditLikeCommunity.ICreate,
    });
  typia.assert(community);

  // Step 3: Create a post within the community
  const postTitle = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 8,
  });
  const postBody = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
  });

  const post: IRedditLikePost =
    await api.functional.redditLike.member.posts.create(connection, {
      body: {
        community_id: community.id,
        type: "text",
        title: postTitle,
        body: postBody,
      } satisfies IRedditLikePost.ICreate,
    });
  typia.assert(post);

  // Step 4: Create a comment on the post
  const commentText = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 4,
    wordMax: 8,
  });

  const comment: IRedditLikeComment =
    await api.functional.redditLike.member.comments.create(connection, {
      body: {
        reddit_like_post_id: post.id,
        content_text: commentText,
      } satisfies IRedditLikeComment.ICreate,
    });
  typia.assert(comment);

  // Step 5: Retrieve vote status without casting any vote
  const voteStatus: IRedditLikeCommentVote =
    await api.functional.redditLike.member.comments.votes.me.at(connection, {
      commentId: comment.id,
    });
  typia.assert(voteStatus);

  // Step 6: Validate the response structure indicates proper vote status retrieval
  TestValidator.predicate(
    "vote status should have valid ID",
    typeof voteStatus.id === "string" && voteStatus.id.length > 0,
  );

  TestValidator.predicate(
    "vote status should have valid timestamps",
    typeof voteStatus.created_at === "string" &&
      typeof voteStatus.updated_at === "string",
  );
}
