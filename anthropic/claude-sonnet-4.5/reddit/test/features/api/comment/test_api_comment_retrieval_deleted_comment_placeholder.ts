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
 * Test that deleted comments are retrieved with appropriate placeholder content
 * while preserving thread structure.
 *
 * This test validates the complete workflow of comment deletion and retrieval,
 * ensuring that deleted comments display placeholder text ('[deleted]'), hide
 * author information, but maintain thread structure integrity including depth,
 * parent references, and proper positioning within the discussion thread.
 *
 * Steps:
 *
 * 1. Create a member account to author and delete the comment
 * 2. Create a community for the discussion context
 * 3. Create a post to enable commenting
 * 4. Create a comment on the post
 * 5. Delete the comment as its author
 * 6. Retrieve the deleted comment
 * 7. Verify placeholder content ('[deleted]' text)
 * 8. Verify author information is hidden or removed
 * 9. Verify thread structure is preserved (depth, parent references)
 * 10. Validate that the comment maintains its position in the thread
 */
export async function test_api_comment_retrieval_deleted_comment_placeholder(
  connection: api.IConnection,
) {
  // Step 1: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.alphaNumeric(10);
  const memberPassword = RandomGenerator.alphaNumeric(12);

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: memberUsername,
      email: memberEmail,
      password: memberPassword,
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create community
  const communityCode = RandomGenerator.alphaNumeric(10);
  const communityName = RandomGenerator.name(2);
  const communityDescription = RandomGenerator.paragraph({ sentences: 5 });

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

  // Step 3: Create post
  const postTitle = RandomGenerator.paragraph({ sentences: 2 });
  const postBody = RandomGenerator.content({ paragraphs: 3 });

  const post = await api.functional.redditLike.member.posts.create(connection, {
    body: {
      community_id: community.id,
      type: "text",
      title: postTitle,
      body: postBody,
    } satisfies IRedditLikePost.ICreate,
  });
  typia.assert(post);

  // Step 4: Create comment
  const commentText = RandomGenerator.paragraph({ sentences: 4 });

  const comment = await api.functional.redditLike.member.comments.create(
    connection,
    {
      body: {
        reddit_like_post_id: post.id,
        content_text: commentText,
      } satisfies IRedditLikeComment.ICreate,
    },
  );
  typia.assert(comment);

  // Verify original comment content before deletion
  TestValidator.equals(
    "original comment text matches",
    comment.content_text,
    commentText,
  );
  TestValidator.equals("comment depth is 0 for top-level", comment.depth, 0);
  TestValidator.equals(
    "comment parent is undefined for top-level",
    comment.reddit_like_parent_comment_id,
    undefined,
  );

  // Step 5: Delete the comment
  await api.functional.redditLike.member.comments.erase(connection, {
    commentId: comment.id,
  });

  // Step 6: Retrieve the deleted comment
  const deletedComment = await api.functional.redditLike.comments.at(
    connection,
    {
      commentId: comment.id,
    },
  );
  typia.assert(deletedComment);

  // Step 7: Verify placeholder content
  TestValidator.equals(
    "deleted comment shows placeholder text",
    deletedComment.content_text,
    "[deleted]",
  );

  // Step 8: Verify thread structure is preserved
  TestValidator.equals(
    "deleted comment preserves ID",
    deletedComment.id,
    comment.id,
  );
  TestValidator.equals(
    "deleted comment preserves post reference",
    deletedComment.reddit_like_post_id,
    post.id,
  );
  TestValidator.equals(
    "deleted comment preserves depth",
    deletedComment.depth,
    0,
  );
  TestValidator.equals(
    "deleted comment preserves parent reference",
    deletedComment.reddit_like_parent_comment_id,
    undefined,
  );

  // Step 9: Verify vote score is preserved
  TestValidator.equals(
    "deleted comment preserves vote score",
    deletedComment.vote_score,
    0,
  );
}
