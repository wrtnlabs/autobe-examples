import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuthorizationToken";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Test that an authenticated admin can update any article (created by user or
 * admin) in the discussion board.
 *
 * 1. Register and authenticate a new admin (for update privileges).
 * 2. Register and authenticate a new user (to create an article).
 * 3. User creates a new article in the discussion board.
 * 4. Switch authentication to the admin.
 * 5. Admin updates the article (title/body) using the admin endpoint.
 * 6. Validate that:
 *
 *    - The article's title/body are updated correctly.
 *    - The response's author_admin is present and valid.
 *    - The author_user reference still matches the original user.
 *    - Created_at remains the same, but updated_at is changed (after update).
 *    - All validation/business rules are upheld.
 */
export async function test_api_discussion_board_article_update_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate an admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12) + "@A1"; // Ensure length & complexity
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword satisfies string as string, // tags.MinLength<8>
      href: "https://admin-join.example.com/", // Must be URI
      referrer: "https://admin-join.example.com/landing",
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminJoin);

  // Step 2: Register and authenticate a user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(10) + "1aA@";
  const userJoin = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword satisfies string as string, // tags.Format<"password">
      href: "https://user-join.example.com/", // Must be URI
      referrer: "https://user-join.example.com/landing",
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(userJoin);

  // Step 3: User creates an article
  const articleTitle = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 5,
    wordMax: 10,
  }).slice(0, 80) as string & tags.MinLength<5> & tags.MaxLength<150>;
  const articleBody = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 10,
    sentenceMax: 20,
    wordMin: 5,
    wordMax: 10,
  }).slice(0, 400) as string & tags.MinLength<20> & tags.MaxLength<5000>;
  const article = await api.functional.discussionBoard.user.articles.create(
    connection,
    {
      body: {
        title: articleTitle,
        body: articleBody,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);

  // Step 4: Switch authentication to admin (login as admin to get fresh admin token)
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword satisfies string as string,
      href: "https://admin-login.example.com/dashboard",
      referrer: "https://admin-login.example.com/login",
    } satisfies IDiscussionBoardAdmin.ILogin,
  });

  // Step 5: Admin updates the article
  const newTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 12,
  }).slice(0, 80) as string & tags.MinLength<5> & tags.MaxLength<150>;
  const newBody = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 10,
    sentenceMax: 20,
    wordMin: 10,
    wordMax: 14,
  }).slice(0, 500) as string & tags.MinLength<20> & tags.MaxLength<5000>;
  const updated = await api.functional.discussionBoard.admin.articles.update(
    connection,
    {
      articleId: article.id,
      body: {
        title: newTitle,
        body: newBody,
      } satisfies IDiscussionBoardArticle.IUpdate,
    },
  );
  typia.assert(updated);

  // Step 6: Validate the update
  // Title and body are updated
  TestValidator.equals(
    "article title updated by admin",
    updated.title,
    newTitle,
  );
  TestValidator.equals("article body updated by admin", updated.body, newBody);
  // Admin authorship - author_admin is present, author_user is still the original user
  TestValidator.predicate(
    "author_admin is set after admin update",
    updated.author_admin !== null &&
      updated.author_admin !== undefined &&
      typeof updated.author_admin.id === "string" &&
      updated.author_admin.id === adminJoin.id,
  );
  TestValidator.predicate(
    "author_user still present and unchanged",
    updated.author_user !== null &&
      updated.author_user !== undefined &&
      typeof updated.author_user.id === "string" &&
      updated.author_user.id === article.author_user?.id,
  );
  // created_at should not change, updated_at should be updated (later than original article)
  TestValidator.equals(
    "created_at unchanged after update",
    updated.created_at,
    article.created_at,
  );
  TestValidator.predicate(
    "updated_at is updated and later than before update",
    new Date(updated.updated_at).getTime() >
      new Date(article.updated_at).getTime(),
  );
}
