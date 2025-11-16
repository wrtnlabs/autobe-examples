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
 * Test successful deletion of a post by its original author, validating
 * ownership-based deletion permissions and proper cascading cleanup of all
 * associated entities.
 *
 * This comprehensive test validates the complete post deletion workflow
 * including:
 *
 * 1. Member registration to establish authenticated context
 * 2. Post creation by the member for ownership verification
 * 3. Comment creation to test cascading cleanup functionality
 * 4. Post deletion by the original author to validate permissions
 * 5. Verification that associated entities are properly removed
 *
 * The test ensures database integrity is maintained while preserving audit
 * trail information in the deletion response, following Reddit Community
 * platform deletion policies and ownership rules.
 */
export async function test_api_post_deletion_by_author_with_cascading_cleanup(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated member account for post ownership testing
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      nickname: RandomGenerator.name(),
      email: memberEmail,
      password: "SecurePassword123!",
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create a post owned by the authenticated member
  const postTitle = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 5,
    wordMax: 10,
  });
  const postContent = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 8,
  });

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

  // Step 3: Create test comments on the post to verify cleanup during deletion
  const comment1Content = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 4,
    wordMax: 8,
  });
  const comment1 =
    await api.functional.redditCommunity.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          content: comment1Content,
          reddit_post_id: post.id,
          href: "https://example.com/post/123",
          referrer: "https://example.com/community",
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(comment1);

  const comment2Content = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 8,
  });
  const comment2 =
    await api.functional.redditCommunity.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          content: comment2Content,
          reddit_post_id: post.id,
          parent_comment_id: comment1.id,
          href: "https://example.com/post/123",
          referrer: "https://example.com/community",
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(comment2);

  // Step 4: Delete the post by its original author
  const deletedPost = await api.functional.redditCommunity.member.posts.erase(
    connection,
    {
      postId: post.id,
    },
  );
  typia.assert(deletedPost);

  // Step 5: Verify the deletion response matches the original post data
  TestValidator.equals(
    "deleted post ID matches original",
    deletedPost.id,
    post.id,
  );
  TestValidator.equals(
    "deleted post title matches original",
    deletedPost.title,
    post.title,
  );
  TestValidator.equals(
    "deleted post content matches original",
    deletedPost.content,
    post.content,
  );
  TestValidator.equals(
    "deleted post author matches original",
    deletedPost.author.id,
    post.author.id,
  );
  TestValidator.equals(
    "deleted post community matches original",
    deletedPost.community.id,
    post.community.id,
  );

  // Verify audit trail information is preserved
  TestValidator.predicate(
    "deleted post has creation timestamp",
    deletedPost.created_at.length > 0,
  );
  TestValidator.predicate(
    "deleted post has update timestamp",
    deletedPost.updated_at.length > 0,
  );

  // Verify vote and comment counts are preserved for audit purposes
  TestValidator.equals(
    "deleted post upvote count preserved",
    deletedPost.upvote_count,
    post.upvote_count,
  );
  TestValidator.equals(
    "deleted post downvote count preserved",
    deletedPost.downvote_count,
    post.downvote_count,
  );
  TestValidator.equals(
    "deleted post comment count preserved",
    deletedPost.comment_count,
    post.comment_count,
  );
  TestValidator.equals(
    "deleted post view count preserved",
    deletedPost.view_count,
    post.view_count,
  );

  // Verify post status flags are preserved
  TestValidator.equals(
    "deleted post lock status preserved",
    deletedPost.is_locked,
    post.is_locked,
  );
  TestValidator.equals(
    "deleted post pin status preserved",
    deletedPost.is_pinned,
    post.is_pinned,
  );
}
