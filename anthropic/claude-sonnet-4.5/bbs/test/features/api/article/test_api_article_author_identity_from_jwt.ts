import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test that article author identity is securely extracted from JWT token and
 * cannot be manipulated.
 *
 * This test validates the critical security principle that
 * discussion_board_member_id is automatically extracted from the authenticated
 * user's JWT token and properly associated with the created article. The test
 * verifies that the returned article's author field contains the correct member
 * information matching the authenticated user who made the request.
 *
 * Test workflow:
 *
 * 1. Register a new member account to obtain authentication tokens
 * 2. Create an article using the authenticated connection
 * 3. Verify that the returned article's author matches the authenticated member
 * 4. Confirm that author identity is derived from JWT, not request body
 */
export async function test_api_article_author_identity_from_jwt(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const memberUsername = RandomGenerator.name(2);

  const registrationData = {
    email: memberEmail,
    password: memberPassword,
    username: memberUsername,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const authorizedMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: registrationData,
    });
  typia.assert(authorizedMember);

  // Step 2: Create an article using the authenticated connection
  const articleTitle = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 3,
    wordMax: 7,
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

  const createdArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.articles.create(connection, {
      body: articleData,
    });
  typia.assert(createdArticle);

  // Step 3: Verify that the article's author matches the authenticated member
  TestValidator.equals(
    "article author ID matches authenticated member ID",
    createdArticle.author.id,
    authorizedMember.id,
  );

  TestValidator.equals(
    "article author username matches authenticated member username",
    createdArticle.author.username,
    authorizedMember.username,
  );

  TestValidator.equals(
    "article author email matches authenticated member email",
    createdArticle.author.email,
    authorizedMember.email,
  );

  // Step 4: Verify article content matches input
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
}
