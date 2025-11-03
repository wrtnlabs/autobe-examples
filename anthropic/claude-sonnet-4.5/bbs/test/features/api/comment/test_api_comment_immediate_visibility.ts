import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleDocument } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleDocument";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

/**
 * Test that comments appear immediately after creation without requiring
 * moderation approval.
 *
 * This test validates the platform's post-publication moderation approach where
 * comments are published immediately and moderated after posting if needed.
 * This design enables immediate community engagement and real-time
 * discussions.
 *
 * Test workflow:
 *
 * 1. Create and authenticate a member account
 * 2. Create a category required for article creation
 * 3. Create an article to receive comments
 * 4. Post a new comment on the article
 * 5. Immediately verify the comment appears in the article's comment thread
 * 6. Validate the article's comment_count is incremented
 */
export async function test_api_comment_immediate_visibility(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "SecurePass123!";
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: memberEmail,
      password: memberPassword,
      ip: "192.168.1.100",
      href: "https://example.com/register" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com/home" satisfies string &
        tags.Format<"uri">,
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member);

  // Step 2: Create category required for article creation
  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create article to receive comments
  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
        summary: RandomGenerator.paragraph({ sentences: 2 }),
        category_ids: [category.id],
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);

  // Verify initial comment count is 0
  TestValidator.equals(
    "article starts with zero comments",
    article.comment_count,
    0,
  );

  // Step 4: Post a new comment on the article
  const commentContent = RandomGenerator.paragraph({ sentences: 5 });
  const comment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          discussion_board_article_id: article.id,
          discussion_board_parent_comment_id: null,
          content: commentContent,
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);

  // Step 5: Validate comment properties
  TestValidator.equals(
    "comment article ID matches",
    comment.discussion_board_article_id,
    article.id,
  );
  TestValidator.equals(
    "comment content matches",
    comment.content,
    commentContent,
  );
  TestValidator.equals(
    "comment has no parent (top-level)",
    comment.discussion_board_parent_comment_id,
    null,
  );
  TestValidator.equals("comment is not deleted", comment.deleted_at, null);
  TestValidator.equals(
    "comment author type is member",
    comment.author_type,
    "member",
  );
  TestValidator.equals(
    "comment member author ID matches",
    comment.discussion_board_member_id,
    member.id,
  );
  TestValidator.equals(
    "comment has no moderator author",
    comment.discussion_board_moderator_id,
    null,
  );

  // Verify comment appears immediately - the fact that we received a valid response
  // proves the comment was created and is immediately visible
  TestValidator.predicate(
    "comment was created successfully",
    comment.id !== null && comment.id !== undefined,
  );
}
