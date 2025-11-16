import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test the complete workflow of creating a discussion board article.
 *
 * This test validates the end-to-end process of member authentication and
 * article creation. It verifies that an authenticated member can successfully
 * publish an article with valid content constraints and that the system
 * properly initializes all managed fields.
 *
 * Workflow:
 *
 * 1. Register and authenticate a new member
 * 2. Create an article with valid title and body
 * 3. Validate the complete article response
 * 4. Verify system-managed fields and author information
 */
export async function test_api_article_creation_complete_workflow(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a new member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.name();
  const memberPassword = RandomGenerator.alphaNumeric(12);

  const memberRegistration = {
    email: memberEmail,
    password: memberPassword,
    username: memberUsername,
    href: "https://example.com/register" satisfies string & tags.Format<"uri">,
    referrer: "" satisfies string & tags.Format<"uri">,
  } satisfies IDiscussionBoardMember.ICreate;

  const authenticatedMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberRegistration,
    });

  typia.assert(authenticatedMember);

  // Validate member authentication response - business logic only
  TestValidator.equals(
    "member email matches",
    authenticatedMember.email,
    memberEmail,
  );
  TestValidator.equals(
    "member username matches",
    authenticatedMember.username,
    memberUsername,
  );

  // Step 2: Create an article with valid content
  const articleTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const articleBody = RandomGenerator.content({
    paragraphs: 5,
    sentenceMin: 15,
    sentenceMax: 25,
    wordMin: 4,
    wordMax: 8,
  });

  const articleData = {
    title: articleTitle,
    body: articleBody,
  } satisfies IDiscussionBoardArticle.ICreate;

  // Step 3: Create the article using authenticated connection
  const createdArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.articles.create(connection, {
      body: articleData,
    });

  typia.assert(createdArticle);

  // Step 4: Validate the complete article response - business logic only
  TestValidator.equals(
    "article title matches",
    createdArticle.title,
    articleTitle,
  );
  TestValidator.equals(
    "article body matches",
    createdArticle.body,
    articleBody,
  );
  TestValidator.equals(
    "view count initialized to zero",
    createdArticle.view_count,
    0,
  );
  TestValidator.equals("deleted_at is null", createdArticle.deleted_at, null);

  // Step 5: Verify author information
  TestValidator.equals(
    "author id matches member id",
    createdArticle.author.id,
    authenticatedMember.id,
  );
  TestValidator.equals(
    "author username matches",
    createdArticle.author.username,
    memberUsername,
  );
  TestValidator.equals(
    "author email matches",
    createdArticle.author.email,
    memberEmail,
  );
  TestValidator.equals(
    "author status matches",
    createdArticle.author.status,
    authenticatedMember.status,
  );
  TestValidator.equals(
    "author email_verified matches",
    createdArticle.author.email_verified,
    authenticatedMember.email_verified,
  );
}
