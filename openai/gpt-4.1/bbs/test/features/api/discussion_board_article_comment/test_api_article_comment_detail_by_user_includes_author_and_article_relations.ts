import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleComment";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Validate detail retrieval of a comment under a user article including
 * relations.
 *
 * This test verifies that an authenticated (joined) user can create an article,
 * post a comment, and then retrieve the comment's detail using the appropriate
 * endpoint. The scenario ensures:
 *
 * 1. Successful authentication and session establishment for a discussion board
 *    user
 * 2. Ability for the user to create an article with valid title/body (attachments
 *    omitted for simplicity)
 * 3. Ability for the same user to create a comment on that article
 * 4. Successful retrieval of the comment using the article and comment IDs with
 *    proper result
 * 5. Proper inclusion of all required fields on the comment: id,
 *    discussion_board_article_id, author (summary), body, created_at,
 *    updated_at, (deleted_at nullable)
 * 6. Validation that the author relation matches the authenticated user used to
 *    create the comment
 * 7. Validation that the discussion_board_article_id matches the created article's
 *    id
 * 8. Confirm the comment is not soft-deleted (deleted_at is null/undefined)
 * 9. Validate body string is correct as posted
 *
 * The test focuses only on the happy path for an active comment (not
 * soft-deleted). Attachments to articles and advanced edge cases are not
 * handled to keep the flow direct.
 */
export async function test_api_article_comment_detail_by_user_includes_author_and_article_relations(
  connection: api.IConnection,
) {
  // 1. User registration and authentication
  const email: string = typia.random<string & tags.Format<"email">>();
  const password: string = RandomGenerator.alphaNumeric(12);
  const displayName: string = RandomGenerator.name();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email,
      password,
      display_name: displayName,
      avatar_url: undefined,
    },
  });
  typia.assert(user);

  // 2. User creates an article
  const articleTitle: string = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 5,
    wordMax: 12,
  });
  const articleBody: string = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
    wordMin: 4,
    wordMax: 12,
  });
  const createdArticle =
    await api.functional.discussionBoard.user.articles.create(connection, {
      body: {
        title: articleTitle,
        body: articleBody,
        attachments: undefined,
      },
    });
  typia.assert(createdArticle);

  // 3. User posts a comment on the article
  const commentBody: string = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 12,
    wordMax: 24,
  });
  const createdComment =
    await api.functional.discussionBoard.user.articles.comments.create(
      connection,
      {
        articleId: createdArticle.id,
        body: {
          body: commentBody,
        },
      },
    );
  typia.assert(createdComment);

  // 4. Retrieve the comment detail
  const readComment =
    await api.functional.discussionBoard.user.articles.comments.at(connection, {
      articleId: createdArticle.id,
      commentId: createdComment.id,
    });
  typia.assert(readComment);

  // 5. Validate all expected fields and relations
  TestValidator.equals("comment id", readComment.id, createdComment.id);
  TestValidator.equals(
    "discussion_board_article_id",
    readComment.discussion_board_article_id,
    createdArticle.id,
  );
  TestValidator.equals("comment body matches", readComment.body, commentBody);
  TestValidator.equals("author id matches", readComment.author.id, user.id);
  TestValidator.equals(
    "author display_name matches",
    readComment.author.display_name,
    user.display_name,
  );
  TestValidator.equals(
    "author avatar_url matches",
    readComment.author.avatar_url,
    user.avatar_url,
  );
  TestValidator.equals(
    "not soft-deleted (deleted_at is null)",
    readComment.deleted_at,
    null,
  );
}
