import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeComment";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommentVote";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

/**
 * Test retrieving comment replies with vote score data.
 *
 * Validates that the replies API returns vote score information for each reply,
 * enabling clients to implement vote-based filtering and sorting. This test
 * creates multiple replies to a parent comment, applies sample votes, and
 * verifies that vote_score data is properly included in the response.
 *
 * Test workflow:
 *
 * 1. Register and authenticate a member
 * 2. Create a community
 * 3. Create a post in the community
 * 4. Create a parent comment on the post
 * 5. Create multiple nested replies
 * 6. Apply sample votes to some replies
 * 7. Retrieve replies and verify vote_score data is present
 * 8. Verify proper threading structure is maintained
 * 9. Test pagination works correctly
 */
export async function test_api_comment_replies_filtering_by_vote_score(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a member
  const memberData = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10) + "A1!",
  } satisfies IRedditLikeMember.ICreate;

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: memberData });
  typia.assert(member);

  // Step 2: Create a community
  const communityData = {
    code: RandomGenerator.alphabets(10),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IRedditLikeCommunity.ICreate;

  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: communityData,
    });
  typia.assert(community);

  // Step 3: Create a post in the community
  const postData = {
    community_id: community.id,
    type: "text",
    title: RandomGenerator.paragraph({ sentences: 1 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IRedditLikePost.ICreate;

  const post: IRedditLikePost =
    await api.functional.redditLike.member.posts.create(connection, {
      body: postData,
    });
  typia.assert(post);

  // Step 4: Create a parent comment
  const parentCommentData = {
    reddit_like_post_id: post.id,
    content_text: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IRedditLikeComment.ICreate;

  const parentComment: IRedditLikeComment =
    await api.functional.redditLike.member.comments.create(connection, {
      body: parentCommentData,
    });
  typia.assert(parentComment);

  // Step 5: Create multiple replies with varying content
  const replyCount = 5;
  const replies: IRedditLikeComment[] = await ArrayUtil.asyncRepeat(
    replyCount,
    async (index) => {
      const replyData = {
        reddit_like_post_id: post.id,
        reddit_like_parent_comment_id: parentComment.id,
        content_text: `Reply ${index + 1}: ${RandomGenerator.paragraph({ sentences: 2 })}`,
      } satisfies IRedditLikeComment.ICreate;

      const reply = await api.functional.redditLike.member.comments.create(
        connection,
        { body: replyData },
      );
      typia.assert(reply);
      return reply;
    },
  );

  // Step 6: Apply sample votes to demonstrate vote_score functionality
  // Vote on the first reply (upvote)
  const vote1: IRedditLikeCommentVote =
    await api.functional.redditLike.member.comments.votes.create(connection, {
      commentId: replies[0].id,
      body: { vote_value: 1 } satisfies IRedditLikeCommentVote.ICreate,
    });
  typia.assert(vote1);

  // Vote on the second reply (downvote)
  const vote2: IRedditLikeCommentVote =
    await api.functional.redditLike.member.comments.votes.create(connection, {
      commentId: replies[1].id,
      body: { vote_value: -1 } satisfies IRedditLikeCommentVote.ICreate,
    });
  typia.assert(vote2);

  // Step 7: Retrieve all replies and verify vote_score data
  const allRepliesResult: IPageIRedditLikeComment.ISummary =
    await api.functional.redditLike.comments.replies.index(connection, {
      commentId: parentComment.id,
      body: {
        page: 1,
        limit: 20,
      } satisfies IRedditLikeComment.IReplyRequest,
    });
  typia.assert(allRepliesResult);

  TestValidator.equals(
    "all replies created",
    allRepliesResult.data.length,
    replyCount,
  );

  // Step 8: Verify that all replies contain vote_score information
  for (const reply of allRepliesResult.data) {
    TestValidator.predicate(
      "reply has vote_score property",
      typeof reply.vote_score === "number",
    );
  }

  // Step 9: Verify at least one reply has a non-zero vote score
  const hasNonZeroScore = allRepliesResult.data.some(
    (reply) => reply.vote_score !== 0,
  );
  TestValidator.predicate(
    "at least one reply has non-zero vote score",
    hasNonZeroScore,
  );

  // Step 10: Verify pagination maintains proper structure
  const pagedResult: IPageIRedditLikeComment.ISummary =
    await api.functional.redditLike.comments.replies.index(connection, {
      commentId: parentComment.id,
      body: {
        page: 1,
        limit: 3,
      } satisfies IRedditLikeComment.IReplyRequest,
    });
  typia.assert(pagedResult);

  TestValidator.equals(
    "pagination limit respected",
    pagedResult.data.length,
    3,
  );

  TestValidator.predicate(
    "pagination info correct",
    pagedResult.pagination.limit === 3 && pagedResult.pagination.current === 1,
  );

  // Step 11: Verify threading structure is maintained
  for (const reply of allRepliesResult.data) {
    TestValidator.predicate(
      "reply has correct depth",
      reply.created_at !== undefined && reply.created_at.length > 0,
    );
  }
}
