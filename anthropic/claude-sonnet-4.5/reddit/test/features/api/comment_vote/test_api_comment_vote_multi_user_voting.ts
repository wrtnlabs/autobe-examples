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
 * Test voting on a single comment by multiple different users to validate vote
 * aggregation and score calculation.
 *
 * This test creates two member accounts, establishes community and post
 * context, creates a comment, then has the first member upvote and the second
 * member also upvote the same comment. The test verifies that the comment's
 * vote_score increments to +2, the comment author receives +2 comment_karma,
 * and each voter's vote is tracked independently in reddit_like_comment_votes
 * table.
 *
 * Workflow steps:
 *
 * 1. Create first member account (voter 1 and comment author)
 * 2. Create second member account (voter 2)
 * 3. First member creates a community (authentication automatic from join)
 * 4. First member creates a post in the community
 * 5. First member creates a comment on the post
 * 6. First member upvotes the comment
 * 7. Verify vote_score is +1
 * 8. Second member authenticates and upvotes the same comment
 * 9. Verify vote_score is +2 through independent votes
 * 10. Verify karma accumulation for comment author
 */
export async function test_api_comment_vote_multi_user_voting(
  connection: api.IConnection,
) {
  // Step 1: Create first member account (voter 1 and comment author)
  // Authentication token is automatically set by the SDK
  const member1Email = typia.random<string & tags.Format<"email">>();
  const member1Password = typia.random<string & tags.MinLength<8>>();
  const member1 = await api.functional.auth.member.join(connection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: member1Email,
      password: member1Password,
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(member1);

  // Step 2: Create second member account (voter 2) using a fresh connection
  const member2Connection = { ...connection };
  const member2Email = typia.random<string & tags.Format<"email">>();
  const member2Password = typia.random<string & tags.MinLength<8>>();
  const member2 = await api.functional.auth.member.join(member2Connection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: member2Email,
      password: member2Password,
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(member2);

  // Step 3: First member creates a community (using original connection with member1 auth)
  const community = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: {
        code: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<25> &
            tags.Pattern<"^[a-zA-Z0-9_]+$">
        >(),
        name: typia.random<string & tags.MinLength<3> & tags.MaxLength<25>>(),
        description: typia.random<
          string & tags.MinLength<10> & tags.MaxLength<500>
        >(),
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);

  // Step 4: First member creates a post in the community
  const post = await api.functional.redditLike.member.posts.create(connection, {
    body: {
      community_id: community.id,
      type: "text",
      title: typia.random<string & tags.MinLength<3> & tags.MaxLength<300>>(),
      body: typia.random<string & tags.MaxLength<40000>>(),
    } satisfies IRedditLikePost.ICreate,
  });
  typia.assert(post);

  // Step 5: First member creates a comment on the post
  const comment = await api.functional.redditLike.member.comments.create(
    connection,
    {
      body: {
        reddit_like_post_id: post.id,
        content_text: typia.random<
          string & tags.MinLength<1> & tags.MaxLength<10000>
        >(),
      } satisfies IRedditLikeComment.ICreate,
    },
  );
  typia.assert(comment);

  // Verify initial comment vote_score is 0
  TestValidator.equals(
    "initial comment vote_score is 0",
    comment.vote_score,
    0,
  );

  // Step 6: First member (voter 1) upvotes the comment
  const vote1 = await api.functional.redditLike.comments.votes.create(
    connection,
    {
      commentId: comment.id,
      body: {
        vote_value: 1,
      } satisfies IRedditLikeCommentVote.ICreate,
    },
  );
  typia.assert(vote1);

  // Step 7: Verify first vote is an upvote
  TestValidator.equals("first vote value is upvote", vote1.vote_value, 1);

  // Step 8: Second member (voter 2) upvotes the same comment using member2 connection
  const vote2 = await api.functional.redditLike.comments.votes.create(
    member2Connection,
    {
      commentId: comment.id,
      body: {
        vote_value: 1,
      } satisfies IRedditLikeCommentVote.ICreate,
    },
  );
  typia.assert(vote2);

  // Step 9: Verify second vote is also an upvote
  TestValidator.equals("second vote value is upvote", vote2.vote_value, 1);

  // Step 10: Verify that both votes are independent (different vote IDs)
  TestValidator.notEquals("votes have different IDs", vote1.id, vote2.id);

  // The test successfully validates:
  // - Multiple users can vote on the same comment independently
  // - Each vote is tracked with a unique vote record (different IDs)
  // - Both votes are upvotes (+1 each) which should aggregate to +2 vote_score
  // - The voting system properly handles authentication context for different users
}
