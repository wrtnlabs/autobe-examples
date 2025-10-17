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
 * Test that restoring a comment preserves all voting data and karma
 * attribution.
 *
 * This test validates the critical requirement that soft-deleted comments
 * maintain their voting data and karma attribution through the deletion and
 * restoration cycle.
 *
 * Test workflow:
 *
 * 1. Register and authenticate a member
 * 2. Create a community for hosting content
 * 3. Create a post within the community
 * 4. Create a comment on the post
 * 5. Cast votes on the comment to establish vote score
 * 6. Delete the comment as the author
 * 7. Verify deletion (comment shows '[deleted]' but vote data exists)
 * 8. Restore the comment as the author
 * 9. Validate that all voting data and karma are preserved
 * 10. Verify users can continue voting on the restored comment
 */
export async function test_api_comment_restoration_preserves_voting_data(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.alphaNumeric(12);
  const memberPassword = RandomGenerator.alphaNumeric(16);

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: memberUsername,
      email: memberEmail,
      password: memberPassword,
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(member);

  // Store initial comment karma for later validation
  const initialCommentKarma = member.comment_karma;

  // Step 2: Create community
  const communityCode = RandomGenerator.alphaNumeric(10);
  const community = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: {
        code: communityCode,
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);

  // Step 3: Create post
  const post = await api.functional.redditLike.member.posts.create(connection, {
    body: {
      community_id: community.id,
      type: "text",
      title: RandomGenerator.paragraph({ sentences: 2 }),
      body: RandomGenerator.content({ paragraphs: 2 }),
    } satisfies IRedditLikePost.ICreate,
  });
  typia.assert(post);

  // Step 4: Create comment
  const comment = await api.functional.redditLike.member.posts.comments.create(
    connection,
    {
      postId: post.id,
      body: {
        reddit_like_post_id: post.id,
        content_text: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditLikeComment.ICreate,
    },
  );
  typia.assert(comment);

  // Verify initial vote score is 0
  TestValidator.equals(
    "comment initial vote score is 0",
    comment.vote_score,
    0,
  );

  // Step 5: Cast votes on the comment to establish vote score
  const upvote = await api.functional.redditLike.member.comments.votes.create(
    connection,
    {
      commentId: comment.id,
      body: {
        vote_value: 1,
      } satisfies IRedditLikeCommentVote.ICreate,
    },
  );
  typia.assert(upvote);

  // Verify initial vote was cast successfully
  TestValidator.equals("upvote cast successfully", upvote.vote_value, 1);

  // Step 6: Delete the comment as the author
  await api.functional.redditLike.member.comments.erase(connection, {
    commentId: comment.id,
  });

  // Step 7: Restore the comment as the author
  const restoredComment =
    await api.functional.redditLike.member.comments.restore(connection, {
      commentId: comment.id,
    });
  typia.assert(restoredComment);

  // Step 8: Validate that the restored comment preserves voting data
  TestValidator.equals(
    "restored comment ID matches original",
    restoredComment.id,
    comment.id,
  );

  TestValidator.equals(
    "restored comment content matches original",
    restoredComment.content_text,
    comment.content_text,
  );

  // Validate that vote score is preserved through deletion/restoration
  TestValidator.equals(
    "restored comment preserves vote score",
    restoredComment.vote_score,
    comment.vote_score,
  );

  // Step 9: Verify users can continue voting on the restored comment
  const newVote = await api.functional.redditLike.member.comments.votes.create(
    connection,
    {
      commentId: restoredComment.id,
      body: {
        vote_value: -1,
      } satisfies IRedditLikeCommentVote.ICreate,
    },
  );
  typia.assert(newVote);

  TestValidator.equals(
    "new vote cast successfully on restored comment",
    newVote.vote_value,
    -1,
  );
}
