import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test the complete workflow of a member creating a new discussion board
 * article.
 *
 * This test validates that an authenticated member can successfully publish an
 * article with valid title and body content. The system properly associates the
 * article with the authenticated member's identity extracted from the JWT
 * token, initializes system-managed fields correctly, and returns the complete
 * article object with all metadata.
 *
 * Workflow:
 *
 * 1. Register a new member account and authenticate
 * 2. Create an article with valid title and body
 * 3. Verify the created article response
 * 4. Validate business logic for system-managed fields
 * 5. Confirm author information is correctly associated
 */
export async function test_api_article_creation_by_authenticated_member(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account and authenticate
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "securePassword123";
  const memberUsername = RandomGenerator.name(2);

  const registrationData = {
    email: memberEmail,
    password: memberPassword,
    username: memberUsername,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const authenticatedMember = await api.functional.auth.member.join(
    connection,
    {
      body: registrationData,
    },
  );
  typia.assert(authenticatedMember);

  // Step 2: Create an article with valid title and body
  const articleTitle = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 5,
    wordMax: 10,
  });
  const articleBody = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 10,
    sentenceMax: 20,
    wordMin: 4,
    wordMax: 8,
  });

  const articleData = {
    title: articleTitle,
    body: articleBody,
  } satisfies IDiscussionBoardArticle.ICreate;

  const createdArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: articleData,
    });
  typia.assert(createdArticle);

  // Step 3: Verify the created article response
  TestValidator.equals(
    "article title matches input",
    createdArticle.title,
    articleTitle,
  );
  TestValidator.equals(
    "article body matches input",
    createdArticle.body,
    articleBody,
  );

  // Step 4: Validate business logic for system-managed fields
  TestValidator.equals(
    "view count initialized to 0",
    createdArticle.view_count,
    0,
  );
  TestValidator.equals(
    "deleted_at is null for active article",
    createdArticle.deleted_at,
    null,
  );

  // Step 5: Confirm author information is correctly associated
  TestValidator.equals(
    "author id matches authenticated member",
    createdArticle.author.id,
    authenticatedMember.id,
  );
  TestValidator.equals(
    "author username matches",
    createdArticle.author.username,
    authenticatedMember.username,
  );
  TestValidator.equals(
    "author email matches",
    createdArticle.author.email,
    authenticatedMember.email,
  );
}
