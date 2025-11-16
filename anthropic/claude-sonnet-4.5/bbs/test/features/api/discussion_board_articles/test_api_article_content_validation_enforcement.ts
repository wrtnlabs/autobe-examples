import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test that article creation enforces content validation constraints before
 * database persistence.
 *
 * This test validates that the system properly checks title and body length
 * constraints (title 5-200 chars, body 10-50,000 chars) and ensures proper text
 * formatting before allowing article creation. The test verifies that articles
 * with valid content lengths and proper formatting are successfully created,
 * confirming that the validation process ensures quality requirements are met.
 *
 * Steps:
 *
 * 1. Register and authenticate a member account
 * 2. Create article with valid minimum length constraints (title: 5 chars, body:
 *    10 chars)
 * 3. Create article with valid typical length content
 * 4. Create article with valid maximum length constraints (title: 200 chars, body:
 *    50,000 chars)
 * 5. Validate all created articles have proper content and metadata
 */
export async function test_api_article_content_validation_enforcement(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "testPassword123";
  const memberUsername = RandomGenerator.name(1);

  const memberData = {
    email: memberEmail,
    password: memberPassword,
    username: memberUsername,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const authenticatedMember = await api.functional.auth.member.join(
    connection,
    {
      body: memberData,
    },
  );
  typia.assert(authenticatedMember);

  // Step 2: Create article with valid minimum length constraints (title: 5 chars, body: 10 chars)
  const minArticleData = {
    title: RandomGenerator.alphabets(5),
    body: RandomGenerator.alphabets(10),
  } satisfies IDiscussionBoardArticle.ICreate;

  const minArticle = await api.functional.discussionBoard.articles.create(
    connection,
    {
      body: minArticleData,
    },
  );
  typia.assert(minArticle);

  TestValidator.equals(
    "minimum title length matches",
    minArticle.title,
    minArticleData.title,
  );
  TestValidator.equals(
    "minimum body length matches",
    minArticle.body,
    minArticleData.body,
  );
  TestValidator.predicate(
    "minimum title meets constraint",
    minArticle.title.length >= 5 && minArticle.title.length <= 200,
  );
  TestValidator.predicate(
    "minimum body meets constraint",
    minArticle.body.length >= 10 && minArticle.body.length <= 50000,
  );

  // Step 3: Create article with valid typical length content
  const typicalArticleData = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    body: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 10,
      sentenceMax: 20,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IDiscussionBoardArticle.ICreate;

  const typicalArticle = await api.functional.discussionBoard.articles.create(
    connection,
    {
      body: typicalArticleData,
    },
  );
  typia.assert(typicalArticle);

  TestValidator.equals(
    "typical title matches",
    typicalArticle.title,
    typicalArticleData.title,
  );
  TestValidator.equals(
    "typical body matches",
    typicalArticle.body,
    typicalArticleData.body,
  );
  TestValidator.predicate(
    "typical title meets constraint",
    typicalArticle.title.length >= 5 && typicalArticle.title.length <= 200,
  );
  TestValidator.predicate(
    "typical body meets constraint",
    typicalArticle.body.length >= 10 && typicalArticle.body.length <= 50000,
  );

  // Step 4: Create article with valid maximum length constraints (title: 200 chars, body: 50,000 chars)
  const maxTitleLength = 200;
  const maxBodyLength = 50000;

  const maxArticleData = {
    title: RandomGenerator.alphabets(maxTitleLength),
    body: RandomGenerator.alphabets(maxBodyLength),
  } satisfies IDiscussionBoardArticle.ICreate;

  const maxArticle = await api.functional.discussionBoard.articles.create(
    connection,
    {
      body: maxArticleData,
    },
  );
  typia.assert(maxArticle);

  TestValidator.equals(
    "maximum title length matches",
    maxArticle.title,
    maxArticleData.title,
  );
  TestValidator.equals(
    "maximum body length matches",
    maxArticle.body,
    maxArticleData.body,
  );
  TestValidator.predicate(
    "maximum title meets constraint",
    maxArticle.title.length === 200,
  );
  TestValidator.predicate(
    "maximum body meets constraint",
    maxArticle.body.length === 50000,
  );

  // Step 5: Validate all created articles have proper metadata
  TestValidator.predicate(
    "min article has valid author",
    minArticle.author.id === authenticatedMember.id,
  );
  TestValidator.predicate(
    "typical article has valid author",
    typicalArticle.author.id === authenticatedMember.id,
  );
  TestValidator.predicate(
    "max article has valid author",
    maxArticle.author.id === authenticatedMember.id,
  );

  TestValidator.predicate(
    "min article view count initialized",
    minArticle.view_count === 0,
  );
  TestValidator.predicate(
    "typical article view count initialized",
    typicalArticle.view_count === 0,
  );
  TestValidator.predicate(
    "max article view count initialized",
    maxArticle.view_count === 0,
  );

  TestValidator.predicate(
    "min article not deleted",
    minArticle.deleted_at === null,
  );
  TestValidator.predicate(
    "typical article not deleted",
    typicalArticle.deleted_at === null,
  );
  TestValidator.predicate(
    "max article not deleted",
    maxArticle.deleted_at === null,
  );
}
