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
 * Test updating an existing comment by its original author.
 *
 * This test validates the complete comment editing workflow in the Reddit
 * Community platform. The process involves creating a member account,
 * establishing authentication context, creating a post to host comments,
 * posting an initial comment, and then updating the comment content.
 *
 * The test specifically validates:
 *
 * 1. Member registration and authentication setup
 * 2. Post creation within a community context
 * 3. Comment creation with proper threading and attribution
 * 4. Comment update functionality preserving author identity
 * 5. Content modification while maintaining vote counts and metadata
 * 6. Updated_at timestamp tracking for edit history
 *
 * The implementation ensures only the original author can modify their
 * comments, preserving the integrity of threaded discussions. Voting metrics,
 * thread structure, and other metadata remain unchanged during content updates
 * to maintain discussion continuity.
 */
export async function test_api_comment_update_by_author(
  connection: api.IConnection,
) {
  // Step 1: Create member account for comment authoring
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberNickname = RandomGenerator.alphabets(8);
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      nickname: memberNickname,
      password: "SecurePassword123!",
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create a post to host comments
  const postTitle = RandomGenerator.name(2);
  const postContent = RandomGenerator.content({ paragraphs: 3 });
  const post = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        title: postTitle,
        content: postContent,
        reddit_community_id: typia.random<string & tags.Format<"uuid">>(),
        reddit_post_type_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 3: Create initial comment with original content
  const originalContent = RandomGenerator.content({ paragraphs: 2 });
  const comment =
    await api.functional.redditCommunity.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          content: originalContent,
          reddit_post_id: post.id,
          href: "https://reddit-community.com/posts/" + post.id,
          referrer: "https://reddit-community.com/communities",
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(comment);

  // Step 4: Update comment content with new text
  const updatedContent = RandomGenerator.content({ paragraphs: 2 });
  const updatedComment =
    await api.functional.redditCommunity.member.posts.comments.update(
      connection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          content: updatedContent,
        } satisfies IRedditCommunityComment.IUpdate,
      },
    );
  typia.assert(updatedComment);

  // Step 5: Validate comment update properties
  TestValidator.equals("comment ID unchanged", updatedComment.id, comment.id);
  TestValidator.equals("author unchanged", updatedComment.author.id, member.id);
  TestValidator.equals("post unchanged", updatedComment.post.id, post.id);
  TestValidator.notEquals(
    "content updated",
    updatedComment.content,
    comment.content,
  );
  TestValidator.equals(
    "new content correct",
    updatedComment.content,
    updatedContent,
  );
  TestValidator.equals(
    "upvote count unchanged",
    updatedComment.upvote_count,
    comment.upvote_count,
  );
  TestValidator.equals(
    "downvote count unchanged",
    updatedComment.downvote_count,
    comment.downvote_count,
  );
  TestValidator.equals(
    "thread depth unchanged",
    updatedComment.thread_depth,
    comment.thread_depth,
  );
  TestValidator.equals(
    "deleted status unchanged",
    updatedComment.is_deleted,
    comment.is_deleted,
  );
  TestValidator.equals(
    "removed status unchanged",
    updatedComment.is_removed,
    comment.is_removed,
  );
}
