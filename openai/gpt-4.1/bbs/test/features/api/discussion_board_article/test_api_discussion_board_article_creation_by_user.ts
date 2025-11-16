import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuthorizationToken";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Test the successful creation of a new discussion board article by an
 * authenticated user.
 *
 * This scenario verifies:
 *
 * 1. Registration of a new discussion board user
 * 2. Establishment of an authenticated session for the user
 * 3. Creation of an article through the user endpoint with valid title and body
 *    length
 * 4. Verification that the returned article is available, retrievable, and
 *    attributes the author correctly
 *
 * Steps:
 *
 * 1. Register a user account (establish authentication context)
 * 2. Create an article as the user with a valid title (5-150 chars) and body
 *    (20-5000 chars)
 * 3. Assert API response type and validate all core fields populated, including
 *    user author attribution
 * 4. Check title/body match request input, author_user field is set and matches
 *    user
 *
 * Business rules:
 *
 * - Title: 5-150 chars
 * - Body: 20-5000 chars
 * - Author_user is set (not null), author_admin is null
 * - Metadata fields: id (uuid), created_at/updated_at (date-time)
 */
export async function test_api_discussion_board_article_creation_by_user(
  connection: api.IConnection,
) {
  // 1. Register a new discussion board user (join)
  const userInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://www.example.com/signup",
    referrer: "https://www.example.com/landing",
    ip: undefined,
  } satisfies IDiscussionBoardUser.ICreate;
  const userAuth = await api.functional.auth.user.join(connection, {
    body: userInput,
  });
  typia.assert(userAuth);
  TestValidator.predicate(
    "joined user is active and not blocked",
    userAuth.is_active && !userAuth.is_blocked,
  );

  // 2. Create article with valid title and body (by authenticated user)
  const title = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 10,
    wordMax: 20,
  }); // 10-20 chars approx
  const body = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 10,
    sentenceMax: 20,
    wordMin: 4,
    wordMax: 10,
  }); // Satisfies 20-5000 chars
  const articleInput = {
    title: title,
    body: body,
  } satisfies IDiscussionBoardArticle.ICreate;
  const article = await api.functional.discussionBoard.user.articles.create(
    connection,
    {
      body: articleInput,
    },
  );
  typia.assert(article);

  // 3. Verify article content and attribution
  TestValidator.equals("article title matches input", article.title, title);
  TestValidator.equals("article body matches input", article.body, body);
  TestValidator.predicate(
    "author_user is present and matches user",
    !!article.author_user &&
      article.author_user.email === userAuth.email &&
      article.author_user.id === userAuth.id,
  );
  TestValidator.equals(
    "author_admin should be null or undefined",
    article.author_admin,
    null,
  );
  TestValidator.predicate(
    "article id should be UUID",
    typeof article.id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        article.id,
      ),
  );
  TestValidator.predicate(
    "created_at and updated_at are valid date-time strings",
    typeof article.created_at === "string" &&
      !Number.isNaN(Date.parse(article.created_at)) &&
      typeof article.updated_at === "string" &&
      !Number.isNaN(Date.parse(article.updated_at)),
  );
}
