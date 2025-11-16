import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuthorizationToken";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Validate that an authenticated user can update their own discussion board
 * article.
 *
 * 1. Register a new user via /auth/user/join and ensure user onboarding completes
 *    successfully.
 * 2. Create a new article with valid title and body, saving the resulting
 *    articleId.
 * 3. Issue an update (PUT) to /discussionBoard/user/articles/{articleId} with new
 *    valid title and body.
 * 4. Verify that the updated article object reflects the new title/body, preserves
 *    user-author linkage, and updates audit fields (updated_at changes;
 *    created_at is unchanged).
 * 5. Verify title and body still meet length constraints.
 * 6. Confirm that only the original creator can update via this endpoint (e.g. a
 *    second different user attempting update receives an error).
 * 7. (If possible) re-fetch article and validate persistence of update.
 */
export async function test_api_discussion_board_article_update_by_user(
  connection: api.IConnection,
) {
  // 1. Register new user
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const userPassword: string = RandomGenerator.alphaNumeric(12);
  const userJoin = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: "https://app.example.com/register",
      referrer: "https://app.example.com/landing",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(userJoin);
  TestValidator.equals("user account is active", userJoin.is_active, true);
  TestValidator.equals("user email matches", userJoin.email, userEmail);

  // 2. Create new article as user
  const createArticleBody = {
    title: RandomGenerator.paragraph({ sentences: 1, wordMin: 5, wordMax: 20 }),
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 5,
      wordMax: 20,
    }),
  } satisfies IDiscussionBoardArticle.ICreate;
  const created = await api.functional.discussionBoard.user.articles.create(
    connection,
    {
      body: createArticleBody,
    },
  );
  typia.assert(created);
  TestValidator.equals(
    "author_user.email matches",
    created.author_user?.email,
    userEmail,
  );

  // 3. Update the article with new valid title/body
  const newTitle = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 10,
    wordMax: 20,
  });
  const newBody = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 10,
    sentenceMax: 15,
    wordMin: 6,
    wordMax: 20,
  });
  const updateOutput =
    await api.functional.discussionBoard.user.articles.update(connection, {
      articleId: created.id,
      body: {
        title: newTitle,
        body: newBody,
      } satisfies IDiscussionBoardArticle.IUpdate,
    });
  typia.assert(updateOutput);
  TestValidator.equals(
    "article id remains the same after update",
    updateOutput.id,
    created.id,
  );
  TestValidator.equals(
    "author_user.id after update is unchanged",
    updateOutput.author_user?.id,
    created.author_user?.id,
  );
  TestValidator.notEquals(
    "title is updated",
    updateOutput.title,
    created.title,
  );
  TestValidator.notEquals("body is updated", updateOutput.body, created.body);
  TestValidator.equals(
    "title is updated correctly",
    updateOutput.title,
    newTitle,
  );
  TestValidator.equals("body is updated correctly", updateOutput.body, newBody);
  TestValidator.notEquals(
    "updated_at is changed after update",
    updateOutput.updated_at,
    created.updated_at,
  );
  TestValidator.equals(
    "created_at remains same after update",
    updateOutput.created_at,
    created.created_at,
  );
  TestValidator.predicate(
    "title length after update within constraint",
    updateOutput.title.length >= 5 && updateOutput.title.length <= 150,
  );
  TestValidator.predicate(
    "body length after update within constraint",
    updateOutput.body.length >= 20 && updateOutput.body.length <= 5000,
  );
  TestValidator.equals(
    "article user link remains present",
    !!updateOutput.author_user,
    true,
  );

  // 4. Attempt update as a DIFFERENT user (should fail)
  const otherUserEmail: string = typia.random<string & tags.Format<"email">>();
  const otherUserPassword: string = RandomGenerator.alphaNumeric(12);
  await api.functional.auth.user.join(connection, {
    body: {
      email: otherUserEmail,
      password: otherUserPassword,
      href: "https://app.example.com/register",
      referrer: "https://app.example.com/landing",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardUser.ICreate,
  });

  await TestValidator.error(
    "non-owner user cannot update another user's article",
    async () => {
      await api.functional.discussionBoard.user.articles.update(connection, {
        articleId: created.id,
        body: {
          title: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 15,
            wordMax: 20,
          }),
          body: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 10,
            sentenceMax: 20,
            wordMin: 10,
            wordMax: 20,
          }),
        } satisfies IDiscussionBoardArticle.IUpdate,
      });
    },
  );
}
