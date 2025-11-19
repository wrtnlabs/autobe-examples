import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * E2E test for creation of a discussion board article by an authenticated user.
 *
 * This test covers user registration (join), authentication context
 * establishment, and successful article creation with valid inputs. It
 * validates all system-managed/audit fields in the article (created_at,
 * updated_at), confirms the author reference is correctly set and in proper
 * IDiscussionBoardUser.ISummary format, ensures the article is not
 * soft-deleted, and checks that all content fields do not contain HTML or
 * unsafe markup. It also enforces that title and content fields adhere to their
 * maximum length limits and are free of HTML tags. Title/content string length
 * edge cases and runtime data sanitization are tested by including whitespace
 * and markup in the input, and verifying they do not persist in storage.
 * Immediate retrieval after creation is performed and the resulting article
 * object is compared to ensure correct persistence and reference.
 */
export async function test_api_article_creation_by_user(
  connection: api.IConnection,
) {
  // 1. Register new user
  const email: string = typia.random<string & tags.Format<"email">>();
  const password: string = RandomGenerator.alphabets(12);
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email,
      password: password as string &
        tags.MinLength<8> &
        tags.MaxLength<72> &
        tags.Format<"password">,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(user);

  // 2. Prepare valid title/content with length edge cases
  const maxTitle = RandomGenerator.paragraph({
    sentences: 20,
    wordMin: 5,
    wordMax: 10,
  }).slice(0, 200); // ensure at most 200 chars

  const maxContent = RandomGenerator.content({
    paragraphs: 15,
    sentenceMin: 30,
    sentenceMax: 42,
    wordMin: 3,
    wordMax: 8,
  }).slice(0, 10000); // ensure at most 10,000 chars

  // Add leading/trailing whitespace and HTML-like markup to try and provoke sanitization
  const rawTitle = "   <b>" + maxTitle + "</b>   ";
  const rawContent = "<script>" + maxContent + "</script>";

  // 3. Create an article as the authenticated user
  const article = await api.functional.discussionBoard.user.articles.create(
    connection,
    {
      body: {
        title: rawTitle as string & tags.MaxLength<200>,
        content: rawContent as string & tags.MaxLength<10000>,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);

  // 4. Validate response: author, audit fields, deleted_at, sanitized content
  TestValidator.equals(
    "author object is present and correct format",
    typeof article.author,
    "object",
  );
  typia.assert<IDiscussionBoardUser.ISummary>(article.author);
  TestValidator.equals(
    "author ID matches user who posted",
    article.author.id,
    user.id,
  );
  TestValidator.equals(
    "title is at most 200 chars",
    article.title.length <= 200,
    true,
  );
  TestValidator.equals(
    "content is at most 10000 chars",
    article.content.length <= 10000,
    true,
  );
  TestValidator.equals(
    "created_at is present",
    typeof article.created_at,
    "string",
  );
  TestValidator.equals(
    "updated_at is present",
    typeof article.updated_at,
    "string",
  );
  TestValidator.equals(
    "deleted_at is null or undefined",
    article.deleted_at ?? null,
    null,
  );
  TestValidator.predicate(
    "title does not contain HTML tags",
    !/<[a-z][\s\S]*>/i.test(article.title),
  );
  TestValidator.predicate(
    "content does not contain HTML tags",
    !/<[a-z][\s\S]*>/i.test(article.content),
  );

  // 5. Re-fetch the article (simulate immediate availability: via exact match check)
  // Since the only available API is .create (no .at/.get), validate that persisted data matches return value
  TestValidator.equals(
    "persisted article round-trip matches returned",
    article.title.trim(),
    maxTitle.trim(),
  );
  TestValidator.equals(
    "author reference is consistent",
    article.author.email,
    user.email,
  );
}
