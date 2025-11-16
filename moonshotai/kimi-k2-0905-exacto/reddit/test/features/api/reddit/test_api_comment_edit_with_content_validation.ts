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
 * Test comment editing with content validation to ensure updated comments meet
 * platform standards.
 *
 * This test validates that edited comments follow the same content rules as new
 * comments including minimum length requirements (1 character) and maximum
 * character limits (10,000 characters). The test ensures comment updates are
 * properly validated and maintains content quality standards throughout the
 * editing process. Implementation enforces identical validation rules for both
 * comment creation and updates.
 *
 * Test flow:
 *
 * 1. Register a new member account for authentication
 * 2. Create a post in a community for comment testing
 * 3. Create a comment with valid content for editing
 * 4. Update the comment with various content scenarios to validate editing rules
 * 5. Verify that updated comment maintains the same validation standards as new
 *    comments
 */
export async function test_api_comment_edit_with_content_validation(
  connection: api.IConnection,
) {
  // 1. Register a new member account
  const member = await api.functional.auth.member.join(connection, {
    body: {
      nickname: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(member);

  // 2. Create a post for comment testing - use random IDs for testing scenario
  const post = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 10,
        }),
        content: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 8,
        }),
        reddit_community_id: typia.random<string & tags.Format<"uuid">>(),
        reddit_post_type_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);

  // 3. Create a comment with valid content
  const comment =
    await api.functional.redditCommunity.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          content: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 10,
            wordMax: 20,
          }),
          reddit_post_id: post.id,
          href: "https://reddit-community.com/posts/1",
          referrer: "https://reddit-community.com/posts",
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(comment);

  // 4. Test valid comment update with minimum content (1 character)
  const minimalContent = "a";
  const updatedWithMinimal =
    await api.functional.redditCommunity.member.posts.comments.update(
      connection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          content: minimalContent,
        } satisfies IRedditCommunityComment.IUpdate,
      },
    );
  typia.assert(updatedWithMinimal);
  TestValidator.equals(
    "minimal content update success",
    updatedWithMinimal.content,
    minimalContent,
  );

  // 5. Test valid comment update with maximum content (10000 characters)
  // Generate exactly 10000 characters using a more efficient approach
  const maxContentParts = ArrayUtil.repeat(100, () =>
    RandomGenerator.paragraph({ sentences: 1, wordMin: 10, wordMax: 15 }),
  );
  const maximumContent = maxContentParts.join("").substring(0, 10000);
  const updatedWithMaximum =
    await api.functional.redditCommunity.member.posts.comments.update(
      connection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          content: maximumContent,
        } satisfies IRedditCommunityComment.IUpdate,
      },
    );
  typia.assert(updatedWithMaximum);
  TestValidator.equals(
    "maximum content update success",
    updatedWithMaximum.content,
    maximumContent,
  );

  // 6. Test that empty content (invalid) should fail
  await TestValidator.error(
    "empty content should fail validation",
    async () => {
      await api.functional.redditCommunity.member.posts.comments.update(
        connection,
        {
          postId: post.id,
          commentId: comment.id,
          body: {
            content: "",
          } satisfies IRedditCommunityComment.IUpdate,
        },
      );
    },
  );

  // 7. Test content exceeding maximum limit (10001 characters) should fail
  const excessiveContent = maximumContent + "x";
  await TestValidator.error(
    "excessive content should fail validation",
    async () => {
      await api.functional.redditCommunity.member.posts.comments.update(
        connection,
        {
          postId: post.id,
          commentId: comment.id,
          body: {
            content: excessiveContent,
          } satisfies IRedditCommunityComment.IUpdate,
        },
      );
    },
  );

  // 8. Verify that updated_at timestamp is properly set
  TestValidator.predicate(
    "updated_at should be set after edit",
    updatedWithMinimal.updated_at !== null,
  );
  TestValidator.predicate(
    "updated_at should be after created_at",
    updatedWithMinimal.updated_at !== undefined &&
      new Date(updatedWithMinimal.updated_at!).getTime() >=
        new Date(comment.created_at).getTime(),
  );

  // 9. Test that comment ownership and relationships are maintained
  TestValidator.equals(
    "comment author ID matches member ID",
    updatedWithMinimal.author.id,
    comment.author.id,
  );
  TestValidator.equals(
    "comment post ID matches original post ID",
    updatedWithMinimal.post.id,
    comment.post.id,
  );

  // 10. Test that other comment properties remain unchanged after update
  TestValidator.equals(
    "upvote_count unchanged after edit",
    updatedWithMinimal.upvote_count,
    comment.upvote_count,
  );
  TestValidator.equals(
    "downvote_count unchanged after edit",
    updatedWithMinimal.downvote_count,
    comment.downvote_count,
  );
  TestValidator.equals(
    "is_deleted unchanged after edit",
    updatedWithMinimal.is_deleted,
    false,
  );
  TestValidator.equals(
    "is_removed unchanged after edit",
    updatedWithMinimal.is_removed,
    false,
  );
}
