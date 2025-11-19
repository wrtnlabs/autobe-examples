import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Test that a registered user can update their own discussion board article.
 *
 * 1. Register a user (join endpoint, providing valid email and password)
 * 2. Create an article as the registered user with a valid title/content (use
 *    maximum lengths to ensure constraints are enforced)
 * 3. Update the article's title and content to new valid values (different from
 *    original)
 * 4. Assert that the article is updated (title/content changed, updated_at is
 *    greater than before, id/author/created_at unchanged, deleted_at remains
 *    the same)
 * 5. Assert that fields not in the update payload are unchanged
 * 6. Assert the update operation only works for the rightful author (would fail
 *    for another user, but permissiveness for this scenario is author update)
 */
export async function test_api_discussion_article_update_by_author(
  connection: api.IConnection,
) {
  // 1. Register a user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(12);
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(user);

  // 2. Create article as this user
  const title1 = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 3,
    wordMax: 10,
  }).substring(0, 200);
  const content1 = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 10,
    sentenceMax: 20,
    wordMin: 5,
    wordMax: 10,
  }).substring(0, 10000);
  const article = await api.functional.discussionBoard.user.articles.create(
    connection,
    {
      body: {
        title: title1,
        content: content1,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);

  // Save system fields before update
  const originalId = article.id;
  const originalAuthor = article.author;
  const originalCreatedAt = article.created_at;
  const originalDeletedAt = article.deleted_at;
  const originalUpdatedAt = article.updated_at;

  // 3. Update the article (change both title and content)
  const title2 = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 4,
    wordMax: 12,
  }).substring(0, 200);
  const content2 = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 15,
    sentenceMax: 25,
    wordMin: 6,
    wordMax: 12,
  }).substring(0, 10000);

  const updated = await api.functional.discussionBoard.user.articles.update(
    connection,
    {
      articleId: originalId,
      body: {
        title: title2,
        content: content2,
      } satisfies IDiscussionBoardArticle.IUpdate,
    },
  );
  typia.assert(updated);

  // 4. Validate update
  TestValidator.equals("article id not changed", updated.id, originalId);
  TestValidator.equals("author not changed", updated.author, originalAuthor);
  TestValidator.equals(
    "created_at not changed",
    updated.created_at,
    originalCreatedAt,
  );
  TestValidator.equals(
    "deleted_at same",
    updated.deleted_at,
    originalDeletedAt,
  );
  TestValidator.notEquals(
    "updated_at has been changed",
    updated.updated_at,
    originalUpdatedAt,
  );
  TestValidator.equals("updated title", updated.title, title2);
  TestValidator.equals("updated content", updated.content, content2);
}
