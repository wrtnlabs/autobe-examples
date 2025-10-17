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
 * Test comment restoration by author workflow.
 *
 * This test validates that comment authors can restore their own soft-deleted
 * comments. It creates a complete workflow: member registration, community
 * creation, post creation, comment creation, comment deletion, and finally
 * comment restoration. The test verifies that restored comments maintain all
 * their original properties and become immediately available again.
 *
 * Workflow steps:
 *
 * 1. Register and authenticate as a member
 * 2. Create a community to host the post
 * 3. Create a post within the community
 * 4. Create a comment on the post
 * 5. Delete the comment (soft-delete)
 * 6. Restore the deleted comment
 * 7. Validate restoration success and data integrity
 */
export async function test_api_comment_restoration_by_author(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as a member
  const memberData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!@#",
  } satisfies IRedditLikeMember.ICreate;

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 2: Create a community
  const communityData = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
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
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IRedditLikePost.ICreate;

  const post: IRedditLikePost =
    await api.functional.redditLike.member.posts.create(connection, {
      body: postData,
    });
  typia.assert(post);

  // Step 4: Create a comment on the post
  const commentData = {
    reddit_like_post_id: post.id,
    content_text: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IRedditLikeComment.ICreate;

  const comment: IRedditLikeComment =
    await api.functional.redditLike.member.posts.comments.create(connection, {
      postId: post.id,
      body: commentData,
    });
  typia.assert(comment);

  // Store original comment properties for later validation
  const originalContentText = comment.content_text;
  const originalDepth = comment.depth;
  const originalVoteScore = comment.vote_score;
  const originalCreatedAt = comment.created_at;

  // Step 5: Delete the comment (soft-delete)
  await api.functional.redditLike.member.comments.erase(connection, {
    commentId: comment.id,
  });

  // Step 6: Restore the deleted comment
  const restoredComment: IRedditLikeComment =
    await api.functional.redditLike.member.comments.restore(connection, {
      commentId: comment.id,
    });
  typia.assert(restoredComment);

  // Step 7: Validate restoration success
  TestValidator.equals(
    "restored comment ID matches original",
    restoredComment.id,
    comment.id,
  );

  TestValidator.equals(
    "restored comment content matches original",
    restoredComment.content_text,
    originalContentText,
  );

  TestValidator.equals(
    "restored comment depth level preserved",
    restoredComment.depth,
    originalDepth,
  );

  TestValidator.equals(
    "restored comment vote score preserved",
    restoredComment.vote_score,
    originalVoteScore,
  );

  TestValidator.equals(
    "restored comment creation timestamp preserved",
    restoredComment.created_at,
    originalCreatedAt,
  );

  TestValidator.equals(
    "restored comment post reference preserved",
    restoredComment.reddit_like_post_id,
    post.id,
  );
}
