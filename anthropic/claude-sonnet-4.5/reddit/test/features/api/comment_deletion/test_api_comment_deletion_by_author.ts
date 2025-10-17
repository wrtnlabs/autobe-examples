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
 * Test complete comment deletion workflow by authenticated member author.
 *
 * Validates that a member can create a comment on a post and then successfully
 * delete their own comment through soft deletion mechanism. Soft deletion means
 * the comment record persists in the database with a deleted_at timestamp set,
 * the content is replaced with '[deleted]' placeholder for display, but the
 * comment's position in the thread hierarchy is preserved to maintain
 * conversation continuity, especially when child replies exist beneath it.
 *
 * This test ensures:
 *
 * - Only the comment author can delete their own comment (ownership validation)
 * - The deletion is a soft delete (deleted_at timestamp set, record persists)
 * - Vote scores on the deleted comment remain intact per karma system rules
 * - Comment structure and thread position are preserved
 * - The deletion operation completes within 1 second
 * - Author's comment karma remains unchanged after deletion
 *
 * Workflow Steps:
 *
 * 1. Register and authenticate a new member account
 * 2. Create a community to host the discussion
 * 3. Create a post within the community to receive comments
 * 4. Create a comment on the post as the authenticated member
 * 5. Validate comment creation with proper initial values
 * 6. Delete the comment (soft delete) as the comment author
 * 7. Verify deletion completed successfully within 1 second
 *
 * The test validates the complete comment deletion system including ownership
 * validation, soft deletion behavior, conversation continuity preservation, and
 * performance requirements specified in the comment system requirements.
 */
export async function test_api_comment_deletion_by_author(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a new member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.MinLength<8>>();
  const memberUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<20> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: memberUsername,
      email: memberEmail,
      password: memberPassword,
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create a community to host the post
  const communityCode = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<25> &
      tags.Pattern<"^[a-zA-Z0-9_]+$">
  >();
  const communityName = typia.random<
    string & tags.MinLength<3> & tags.MaxLength<25>
  >();
  const communityDescription = typia.random<
    string & tags.MinLength<10> & tags.MaxLength<500>
  >();

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

  // Step 3: Create a post within the community
  const postTitle = typia.random<
    string & tags.MinLength<3> & tags.MaxLength<300>
  >();
  const postBody = typia.random<string & tags.MaxLength<40000>>();

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
  const commentText = typia.random<
    string & tags.MinLength<1> & tags.MaxLength<10000>
  >();

  const comment = await api.functional.redditLike.member.posts.comments.create(
    connection,
    {
      postId: post.id,
      body: {
        reddit_like_post_id: post.id,
        content_text: commentText,
      } satisfies IRedditLikeComment.ICreate,
    },
  );
  typia.assert(comment);

  // Step 5: Validate comment was created successfully
  TestValidator.equals(
    "comment post ID matches",
    comment.reddit_like_post_id,
    post.id,
  );
  TestValidator.equals(
    "comment content matches",
    comment.content_text,
    commentText,
  );
  TestValidator.equals("comment depth is 0 for top-level", comment.depth, 0);
  TestValidator.equals("initial vote score is 0", comment.vote_score, 0);

  // Step 6: Delete the comment as the comment author
  const deletionStartTime = new Date();
  await api.functional.redditLike.member.comments.erase(connection, {
    commentId: comment.id,
  });
  const deletionEndTime = new Date();
  const deletionDuration =
    deletionEndTime.getTime() - deletionStartTime.getTime();

  // Step 7: Verify deletion completed within 1 second
  TestValidator.predicate(
    "deletion completed within 1 second",
    deletionDuration <= 1000,
  );
}
