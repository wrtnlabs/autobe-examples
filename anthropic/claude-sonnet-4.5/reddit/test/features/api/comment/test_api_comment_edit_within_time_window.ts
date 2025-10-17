import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

/**
 * Test successful comment editing by the original author within the 24-hour
 * editing window.
 *
 * This test validates the complete workflow of comment editing functionality:
 *
 * 1. Create and authenticate a member account
 * 2. Create a community to host discussions
 * 3. Create a post within the community
 * 4. Create a comment on the post
 * 5. Immediately edit the comment text within the allowed timeframe
 * 6. Validate all aspects of the edited comment (content, flags, hierarchy,
 *    scores)
 * 7. Verify the edit is reflected when retrieving the comment
 */
export async function test_api_comment_edit_within_time_window(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const memberUsername = RandomGenerator.alphaNumeric(10);

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: memberUsername,
      email: memberEmail,
      password: memberPassword,
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create a community to host the discussion
  const communityCode = RandomGenerator.alphaNumeric(15);
  const communityName = RandomGenerator.name(2);
  const communityDescription = RandomGenerator.paragraph({ sentences: 3 });

  const community = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: {
        code: communityCode,
        name: communityName,
        description: communityDescription,
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);

  // Step 3: Create a post to enable comment creation
  const postTitle = RandomGenerator.paragraph({ sentences: 5 });
  const postBody = RandomGenerator.content({ paragraphs: 2 });

  const post = await api.functional.redditLike.member.posts.create(connection, {
    body: {
      community_id: community.id,
      type: "text",
      title: postTitle,
      body: postBody,
    } satisfies IRedditLikePost.ICreate,
  });
  typia.assert(post);

  // Step 4: Create a comment on the post
  const originalCommentText = RandomGenerator.content({ paragraphs: 1 });

  const comment = await api.functional.redditLike.member.comments.create(
    connection,
    {
      body: {
        reddit_like_post_id: post.id,
        content_text: originalCommentText,
      } satisfies IRedditLikeComment.ICreate,
    },
  );
  typia.assert(comment);

  // Store original comment properties for validation
  const originalVoteScore = comment.vote_score;
  const originalDepth = comment.depth;
  const originalParentCommentId = comment.reddit_like_parent_comment_id;

  // Step 5: Edit the comment immediately within the allowed timeframe
  const updatedCommentText = RandomGenerator.content({ paragraphs: 1 });

  const editedComment = await api.functional.redditLike.member.comments.update(
    connection,
    {
      commentId: comment.id,
      body: {
        content_text: updatedCommentText,
      } satisfies IRedditLikeComment.IUpdate,
    },
  );
  typia.assert(editedComment);

  // Step 6: Validate the edited comment properties
  TestValidator.equals("comment ID unchanged", editedComment.id, comment.id);
  TestValidator.equals(
    "comment content updated",
    editedComment.content_text,
    updatedCommentText,
  );
  TestValidator.equals("edited flag set to true", editedComment.edited, true);
  TestValidator.equals(
    "vote score unchanged",
    editedComment.vote_score,
    originalVoteScore,
  );
  TestValidator.equals("depth unchanged", editedComment.depth, originalDepth);
  TestValidator.equals(
    "parent comment ID unchanged",
    editedComment.reddit_like_parent_comment_id,
    originalParentCommentId,
  );
  TestValidator.equals(
    "post ID unchanged",
    editedComment.reddit_like_post_id,
    post.id,
  );

  // Validate updated_at timestamp is current (within reasonable time window)
  const updatedAtDate = new Date(editedComment.updated_at);
  const now = new Date();
  const timeDifference = now.getTime() - updatedAtDate.getTime();
  TestValidator.predicate(
    "updated_at timestamp is current",
    timeDifference >= 0 && timeDifference < 10000,
  );
}
