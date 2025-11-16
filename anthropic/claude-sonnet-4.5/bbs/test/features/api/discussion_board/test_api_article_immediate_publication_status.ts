import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test that articles are immediately published and visible upon creation.
 *
 * This test validates the immediate publication requirement by verifying that:
 *
 * 1. A member can successfully create an article
 * 2. The created article has deleted_at set to null (active/published status)
 * 3. All required fields are properly populated for public visibility
 * 4. The article is immediately accessible without moderation approval
 *
 * Process:
 *
 * 1. Register and authenticate a member
 * 2. Create a discussion board article
 * 3. Verify the article has immediate publication status (deleted_at is null)
 * 4. Validate all article properties are correctly initialized
 */
export async function test_api_article_immediate_publication_status(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a member
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    username: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const authenticatedMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(authenticatedMember);

  // Step 2: Create a discussion board article
  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    body: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 10,
      sentenceMax: 20,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IDiscussionBoardArticle.ICreate;

  const createdArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.articles.create(connection, {
      body: articleData,
    });
  typia.assert(createdArticle);

  // Step 3: Verify immediate publication status - deleted_at must be null
  TestValidator.equals(
    "article deleted_at should be null for published status",
    createdArticle.deleted_at,
    null,
  );

  // Step 4: Validate all required fields are properly populated
  TestValidator.equals(
    "article title matches input",
    createdArticle.title,
    articleData.title,
  );

  TestValidator.equals(
    "article body matches input",
    createdArticle.body,
    articleData.body,
  );

  TestValidator.equals(
    "article view_count initialized to 0",
    createdArticle.view_count,
    0,
  );

  // Step 5: Verify author association is correct
  TestValidator.equals(
    "article author ID matches authenticated member",
    createdArticle.author.id,
    authenticatedMember.id,
  );

  TestValidator.equals(
    "article author username matches authenticated member",
    createdArticle.author.username,
    authenticatedMember.username,
  );

  TestValidator.equals(
    "article author email matches authenticated member",
    createdArticle.author.email,
    authenticatedMember.email,
  );
}
