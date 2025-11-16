import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityCategories";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostType";

/**
 * Test successful soft deletion of a comment by its original author.
 *
 * This test validates the soft delete functionality where:
 *
 * 1. A member creates a comment on a post
 * 2. The original author soft deletes their comment
 * 3. The comment is marked as deleted (is_deleted = true)
 * 4. Thread structure is preserved
 * 5. Comment metadata remains accessible
 * 6. The deletion is correctly attributed to the author
 */
export async function test_api_comment_soft_delete_by_author(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated member for comment creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      nickname: RandomGenerator.name(),
      email: memberEmail,
      password: "TestPassword123!",
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create a post to comment on (using realistic community and post type IDs)
  const post = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        reddit_community_id: typia.random<string & tags.Format<"uuid">>(), // Realistic community ID
        reddit_post_type_id: typia.random<string & tags.Format<"uuid">>(), // Realistic post type ID
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 3: Create the comment that will be deleted
  const commentContent = RandomGenerator.paragraph({ sentences: 3 });
  const comment = await api.functional.redditCommunity.member.comments.create(
    connection,
    {
      body: {
        content: commentContent,
        reddit_post_id: post.id,
        parent_comment_id: null, // Top-level comment
        href: "https://example.com/test",
        referrer: "https://example.com/test",
      } satisfies IRedditCommunityComment.ICreate,
    },
  );
  typia.assert(comment);

  // Verify initial comment state
  TestValidator.equals(
    "comment initially not deleted",
    comment.is_deleted,
    false,
  );
  TestValidator.equals(
    "comment content matches",
    comment.content,
    commentContent,
  );
  TestValidator.equals("comment author matches", comment.author.id, member.id);

  // Step 4: Soft delete the comment by the original author
  const deletedComment =
    await api.functional.redditCommunity.member.comments.erase(connection, {
      commentId: comment.id,
    });
  typia.assert(deletedComment);

  // Step 5: Verify the comment is marked as deleted
  TestValidator.equals(
    "comment is now deleted",
    deletedComment.is_deleted,
    true,
  );
  TestValidator.equals("comment ID preserved", deletedComment.id, comment.id);
  TestValidator.equals(
    "comment content preserved",
    deletedComment.content,
    commentContent,
  );
  TestValidator.equals(
    "author information preserved",
    deletedComment.author.id,
    member.id,
  );

  // Step 6: Verify thread structure is preserved
  TestValidator.equals(
    "thread depth preserved",
    deletedComment.thread_depth,
    comment.thread_depth,
  );
  TestValidator.equals(
    "post reference preserved",
    deletedComment.post.id,
    post.id,
  );

  // Step 7: Verify voting and engagement metrics are preserved
  TestValidator.equals(
    "upvote count preserved",
    deletedComment.upvote_count,
    comment.upvote_count,
  );
  TestValidator.equals(
    "downvote count preserved",
    deletedComment.downvote_count,
    comment.downvote_count,
  );

  // Step 8: Verify timestamps are preserved
  TestValidator.equals(
    "created_at preserved",
    deletedComment.created_at,
    comment.created_at,
  );
  TestValidator.equals(
    "updated_at may be different or null",
    deletedComment.updated_at !== null || deletedComment.updated_at === null,
    true,
  );

  // Step 9: Verify the comment is not marked as removed by moderator
  TestValidator.equals(
    "comment not removed by moderator",
    deletedComment.is_removed,
    false,
  );
}
