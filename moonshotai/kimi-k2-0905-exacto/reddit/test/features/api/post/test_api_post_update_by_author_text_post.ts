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

export async function test_api_post_update_by_author_text_post(
  connection: api.IConnection,
) {
  // Register a new member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      nickname: RandomGenerator.alphaNumeric(8),
      email: memberEmail,
      password: "TestPassword123!",
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(member);

  // Generate random post data for initial creation
  const initialTitle = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 3,
    wordMax: 8,
  });
  const initialContent = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
  });

  // Create initial text post - using a valid community and post type
  const originalPost = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        title: initialTitle,
        content: initialContent,
        reddit_community_id: typia.random<string & tags.Format<"uuid">>(),
        reddit_post_type_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(originalPost);

  // Store original timestamps for verification
  const originalCreatedAt = originalPost.created_at;
  const originalUpdatedAt = originalPost.updated_at;

  // Generate updated content
  const updatedTitle = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 3,
    wordMax: 8,
  });
  const updatedContent = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 5,
    sentenceMax: 10,
  });

  // Wait briefly to ensure timestamp difference
  await new Promise((resolve) => setTimeout(resolve, 200));

  // Update the post with new title and content
  const updatedPost = await api.functional.redditCommunity.member.posts.update(
    connection,
    {
      postId: originalPost.id,
      body: {
        title: updatedTitle,
        content: updatedContent,
      } satisfies IRedditCommunityPost.IUpdate,
    },
  );
  typia.assert(updatedPost);

  // Verify the post content was updated correctly
  TestValidator.equals("updated post title", updatedPost.title, updatedTitle);
  TestValidator.notEquals(
    "title should be different",
    originalPost.title,
    updatedPost.title,
  );

  // Handle nullable content properly
  if (updatedPost.content !== null && originalPost.content !== null) {
    TestValidator.equals(
      "updated post content",
      updatedPost.content,
      updatedContent,
    );
    TestValidator.notEquals(
      "content should be different",
      originalPost.content,
      updatedPost.content,
    );
  } else {
    TestValidator.equals(
      "updated post content should be non-null",
      updatedPost.content,
      updatedContent,
    );
  }

  // Verify that engagement metrics are preserved
  TestValidator.equals(
    "upvote count preserved",
    updatedPost.upvote_count,
    originalPost.upvote_count,
  );
  TestValidator.equals(
    "downvote count preserved",
    updatedPost.downvote_count,
    originalPost.downvote_count,
  );
  TestValidator.equals(
    "view count preserved",
    updatedPost.view_count,
    originalPost.view_count,
  );
  TestValidator.equals(
    "comment count preserved",
    updatedPost.comment_count,
    originalPost.comment_count,
  );
  TestValidator.equals(
    "is_locked preserved",
    updatedPost.is_locked,
    originalPost.is_locked,
  );
  TestValidator.equals(
    "is_pinned preserved",
    updatedPost.is_pinned,
    originalPost.is_pinned,
  );

  // Verify that creation metadata is preserved
  TestValidator.equals(
    "author preserved",
    updatedPost.author,
    originalPost.author,
  );
  TestValidator.equals(
    "community preserved",
    updatedPost.community,
    originalPost.community,
  );
  TestValidator.equals(
    "post_type preserved",
    updatedPost.post_type,
    originalPost.post_type,
  );
  TestValidator.equals(
    "created_at preserved",
    updatedPost.created_at,
    originalCreatedAt,
  );

  // Verify that updated_at timestamp was modified
  TestValidator.notEquals(
    "updated_at should be different",
    updatedPost.updated_at,
    originalUpdatedAt,
  );
  TestValidator.predicate(
    "updated_at should be later than created_at",
    new Date(updatedPost.updated_at) > new Date(updatedPost.created_at),
  );

  // Verify that the post ID remained the same
  TestValidator.equals("post id unchanged", updatedPost.id, originalPost.id);
}
