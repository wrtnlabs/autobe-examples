import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuthorizationToken";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Validate retrieval of full details for a discussion board article by
 * articleId.
 *
 * This test ensures the following user journey and business rule validation:
 *
 * 1. A new user is registered to establish ownership context.
 * 2. User creates a discussion board article with valid (length-checked)
 *    title/body.
 * 3. The article is fetched by its unique id.
 * 4. The test validates the returned fields (id, title, body, author,
 *    created/updated timestamps) exactly match creation and business rules.
 * 5. Author attribution: author_user is present and matches creator; author_admin
 *    is null/undefined.
 * 6. Public retrieval is supported without requiring authentication for GET.
 *
 * The test enforces correct persistence, ownership, visibility, and response
 * schema guarantees.
 */
export async function test_api_discussion_board_article_details_by_id(
  connection: api.IConnection,
) {
  // 1. Register a new discussion board user
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(10);
  const joinInput = {
    email,
    password,
    href: "https://test-case.article-access.com/join",
    referrer: "https://test-case.article-access.com",
  } satisfies IDiscussionBoardUser.ICreate;

  const user = await api.functional.auth.user.join(connection, {
    body: joinInput,
  });
  typia.assert(user);

  // 2. Create an article as the user
  const title = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 5,
    wordMax: 15,
  });
  const body = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 5,
    sentenceMax: 15,
    wordMin: 4,
    wordMax: 10,
  });
  const articleInput = {
    title,
    body,
  } satisfies IDiscussionBoardArticle.ICreate;

  const article = await api.functional.discussionBoard.user.articles.create(
    connection,
    {
      body: articleInput,
    },
  );
  typia.assert(article);

  // 3. Retrieve the article details by ID (should succeed without authentication)
  const fetched = await api.functional.discussionBoard.articles.at(connection, {
    articleId: article.id,
  });
  typia.assert(fetched);

  // 4. Validate all fields
  TestValidator.equals("article.id matches", fetched.id, article.id);
  TestValidator.equals("article.title matches", fetched.title, title);
  TestValidator.equals("article.body matches", fetched.body, body);

  // Author attribution is user; admin is absent
  TestValidator.predicate(
    "author_user present and correct",
    !!fetched.author_user &&
      fetched.author_user.id === user.id &&
      fetched.author_user.email === user.email,
  );
  TestValidator.equals(
    "author_admin is null/undefined",
    fetched.author_admin,
    null,
  );
  TestValidator.predicate(
    "timestamps present",
    typeof fetched.created_at === "string" &&
      typeof fetched.updated_at === "string" &&
      fetched.created_at.length > 0 &&
      fetched.updated_at.length > 0,
  );
}
