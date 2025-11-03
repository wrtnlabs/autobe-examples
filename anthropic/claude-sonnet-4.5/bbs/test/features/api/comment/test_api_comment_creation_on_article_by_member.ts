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
 * Test the complete workflow of a member posting a comment on a published
 * article.
 *
 * This test validates that authenticated members can successfully create
 * comments on articles, the comment content is properly stored, and the comment
 * appears immediately without requiring moderation approval. The workflow
 * covers member registration, category creation, article publication, and
 * comment posting with comprehensive validation of the comment entity.
 *
 * Workflow steps:
 *
 * 1. Create new member account with join (new user context)
 * 2. Create a category for article organization
 * 3. Create and publish an article that will receive comments
 * 4. Post a new comment on the article with valid content (between 1-5000
 *    characters)
 * 5. Validate the comment is created successfully with correct author attribution
 * 6. Verify the comment content matches the submitted text
 * 7. Verify creation and update timestamps are set
 * 8. Verify the comment appears immediately without moderation delay
 */
export async function test_api_comment_creation_on_article_by_member(
  connection: api.IConnection,
) {
  // Step 1: Create new member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.alphaNumeric(10);
  const memberPassword = "SecurePass123!";

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: memberUsername,
        email: memberEmail,
        password: memberPassword,
        href: "https://example.com/register" satisfies string &
          tags.Format<"uri">,
        referrer: "https://example.com/home" satisfies string &
          tags.Format<"uri">,
      } satisfies IDiscussionBoardMember.IJoin,
    });
  typia.assert(member);

  // Step 2: Create a category for article organization
  const category: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Economic Policy Analysis",
          description:
            "Discussion of economic policies and their impact on society",
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create and publish an article that will receive the comment
  const articleTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const articleBody = RandomGenerator.content({
    paragraphs: 5,
    sentenceMin: 15,
    sentenceMax: 25,
    wordMin: 4,
    wordMax: 8,
  });

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: articleTitle,
        body: articleBody,
        category_ids: [category.id],
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);

  // Step 4: Post a new comment on the article with valid content
  const commentContent = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 10,
    sentenceMax: 20,
    wordMin: 4,
    wordMax: 8,
  });

  const comment: IDiscussionBoardComment =
    await api.functional.discussionBoard.articles.comments.create(connection, {
      articleId: article.id,
      body: {
        discussion_board_article_id: article.id,
        content: commentContent,
      } satisfies IDiscussionBoardComment.ICreate,
    });
  typia.assert(comment);

  // Step 5: Validate the comment is created successfully with correct author attribution
  TestValidator.equals(
    "comment author type is member",
    comment.author_type,
    "member",
  );
  TestValidator.equals(
    "comment member ID matches authenticated member",
    comment.discussion_board_member_id,
    member.id,
  );
  TestValidator.equals(
    "comment has no moderator ID",
    comment.discussion_board_moderator_id,
    null,
  );

  // Step 6: Verify the comment content matches the submitted text
  TestValidator.equals(
    "comment content matches submitted text",
    comment.content,
    commentContent,
  );

  // Step 7: Verify creation and update timestamps are set
  TestValidator.predicate(
    "created_at timestamp is set",
    comment.created_at !== null && comment.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at timestamp is set",
    comment.updated_at !== null && comment.updated_at !== undefined,
  );

  // Step 8: Verify the comment appears immediately without moderation delay (deleted_at should be null)
  TestValidator.equals("comment is not deleted", comment.deleted_at, null);

  // Additional validation: Verify member author information is populated
  TestValidator.predicate(
    "member author is populated",
    comment.memberAuthor !== null && comment.memberAuthor !== undefined,
  );
  if (comment.memberAuthor) {
    TestValidator.equals(
      "member author ID matches member",
      comment.memberAuthor.id,
      member.id,
    );
    TestValidator.equals(
      "member author username matches",
      comment.memberAuthor.username,
      member.username,
    );
  }

  // Verify moderator author is not populated for member comments
  TestValidator.equals(
    "moderator author is null for member comment",
    comment.moderatorAuthor,
    null,
  );

  // Verify comment belongs to the correct article
  TestValidator.equals(
    "comment belongs to correct article",
    comment.discussion_board_article_id,
    article.id,
  );

  // Verify this is a top-level comment (no parent)
  TestValidator.equals(
    "comment has no parent (top-level)",
    comment.discussion_board_parent_comment_id,
    null,
  );
}
