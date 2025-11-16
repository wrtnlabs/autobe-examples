import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityCategories";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostType";

/**
 * Test that post updates preserve existing engagement metrics including
 * upvote_count, downvote_count, view_count, and comment_count without reset or
 * modification. Validates that content edits do not affect accumulated
 * community interaction data, ensuring that post rankings and analytics remain
 * accurate throughout the post lifecycle.
 */
export async function test_api_post_update_maintains_engagement_metrics(
  connection: api.IConnection,
) {
  // 1. Register as member to get authentication
  const member = await api.functional.auth.member.join(connection, {
    body: {
      nickname: RandomGenerator.alphabets(10),
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123!",
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(member);

  // 2. Create a post to test engagement metrics preservation
  const postCreateData = {
    title: RandomGenerator.paragraph({ sentences: 1, wordMin: 5, wordMax: 10 }),
    content: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    reddit_community_id: typia.random<string & tags.Format<"uuid">>(),
    reddit_post_type_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IRedditCommunityPost.ICreate;

  const post = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: postCreateData,
    },
  );
  typia.assert(post);

  // 3. Store original engagement metrics for comparison
  const originalEngagement = {
    upvote_count: post.upvote_count,
    downvote_count: post.downvote_count,
    view_count: post.view_count,
    comment_count: post.comment_count,
  };

  // 4. Update the post with new content - CRITICAL: Add await
  const updateData = {
    title: RandomGenerator.paragraph({ sentences: 1, wordMin: 5, wordMax: 10 }),
    content: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 3,
      sentenceMax: 8,
    }),
  } satisfies IRedditCommunityPost.IUpdate;

  const updatedPost = await api.functional.redditCommunity.member.posts.update(
    connection,
    {
      postId: post.id,
      body: updateData,
    },
  );
  typia.assert(updatedPost);

  // 5. Verify engagement metrics remain unchanged after update
  TestValidator.equals(
    "upvote count preserved after update",
    updatedPost.upvote_count,
    originalEngagement.upvote_count,
  );
  TestValidator.equals(
    "downvote count preserved after update",
    updatedPost.downvote_count,
    originalEngagement.downvote_count,
  );
  TestValidator.equals(
    "view count preserved after update",
    updatedPost.view_count,
    originalEngagement.view_count,
  );
  TestValidator.equals(
    "comment count preserved after update",
    updatedPost.comment_count,
    originalEngagement.comment_count,
  );

  // 6. Verify other post properties were updated correctly
  TestValidator.equals("post ID remains the same", updatedPost.id, post.id);
  TestValidator.notEquals(
    "title was updated from original",
    updatedPost.title,
    postCreateData.title,
  );
  TestValidator.equals(
    "title matches update data",
    updatedPost.title,
    updateData.title,
  );
  TestValidator.equals(
    "content matches update data",
    updatedPost.content,
    updateData.content,
  );
}
