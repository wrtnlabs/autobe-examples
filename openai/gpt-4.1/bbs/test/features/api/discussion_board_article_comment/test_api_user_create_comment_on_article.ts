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
 * Validate that authenticated user can comment on their own article and
 * unauthenticated user cannot comment on an article.
 *
 * 1. Register as a standard user on the discussion board.
 * 2. Confirm the credentials and token are correctly returned (type-check and
 *    non-null).
 * 3. Create a new article as the registered/authenticated user.
 * 4. Post a new comment to that article as the authenticated user.
 * 5. Verify the comment links to the correct article, has the correct author
 *    fields, and response shape.
 * 6. Attempt to post a comment as an unauthenticated/anonymous user and expect
 *    failure (proper error raised).
 */
export async function test_api_user_create_comment_on_article(
  connection: api.IConnection,
) {
  // 1. Register a new user and authenticate
  const userInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    avatar_url: undefined,
  } satisfies IDiscussionBoardUser.ICreate;
  const authorizedUser = await api.functional.auth.user.join(connection, {
    body: userInput,
  });
  typia.assert(authorizedUser);

  // 2. Create a new article as this user
  const articleInput = {
    title: RandomGenerator.paragraph({ sentences: 4, wordMin: 3, wordMax: 8 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 15,
      wordMin: 4,
      wordMax: 10,
    }),
    attachments: [],
  } satisfies IDiscussionBoardArticle.ICreate;
  const article = await api.functional.discussionBoard.user.articles.create(
    connection,
    { body: articleInput },
  );
  typia.assert(article);
  TestValidator.equals(
    "article author is user",
    article.author.id,
    authorizedUser.id,
  );
  TestValidator.equals(
    "article has 0 comments initially",
    article.comments_count,
    0,
  );

  // 3. Post a comment to the article as the authenticated user
  const commentInput = {
    body: RandomGenerator.paragraph({ sentences: 2, wordMin: 4, wordMax: 20 }),
  } satisfies IDiscussionBoardArticleComment.ICreate;
  const comment =
    await api.functional.discussionBoard.user.articles.comments.create(
      connection,
      { articleId: article.id, body: commentInput },
    );
  typia.assert(comment);
  TestValidator.equals(
    "comment is linked to correct article",
    comment.discussion_board_article_id,
    article.id,
  );
  TestValidator.equals(
    "comment author is user",
    comment.author.id,
    authorizedUser.id,
  );
  TestValidator.equals(
    "comment body matches input",
    comment.body,
    commentInput.body,
  );

  // 4. Try to post a comment as an unauthenticated user (should fail)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot comment on article",
    async () => {
      await api.functional.discussionBoard.user.articles.comments.create(
        unauthConn,
        { articleId: article.id, body: commentInput },
      );
    },
  );
}
