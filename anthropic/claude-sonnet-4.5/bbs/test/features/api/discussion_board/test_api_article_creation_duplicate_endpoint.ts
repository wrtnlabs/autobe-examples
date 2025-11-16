import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test duplicate article creation endpoint functionality.
 *
 * This test validates that the article creation endpoint at
 * /discussionBoard/articles (without member prefix) functions correctly and
 * produces identical results to the member-prefixed version. Both endpoints
 * should accept the same request structure, enforce identical authentication
 * requirements, and return complete article objects with proper author
 * attribution.
 *
 * Workflow:
 *
 * 1. Create member account and authenticate via join endpoint
 * 2. Create first article using /discussionBoard/articles endpoint
 * 3. Verify article response structure and all required fields
 * 4. Create second article to confirm repeatability
 * 5. Validate authentication, authorization, and metadata generation work
 *    identically
 */
export async function test_api_article_creation_duplicate_endpoint(
  connection: api.IConnection,
) {
  // 1. Create member account and authenticate
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "SecurePassword123!";
  const memberUsername = RandomGenerator.name();

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

  // Verify member was created with expected fields
  TestValidator.equals(
    "member email matches",
    authorizedMember.email,
    memberEmail,
  );
  TestValidator.equals(
    "member username matches",
    authorizedMember.username,
    memberUsername,
  );

  // 2. Create first article using /discussionBoard/articles endpoint
  const firstArticleTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const firstArticleBody = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 15,
    sentenceMax: 25,
    wordMin: 4,
    wordMax: 8,
  });

  const firstArticleData = {
    title: firstArticleTitle,
    body: firstArticleBody,
  } satisfies IDiscussionBoardArticle.ICreate;

  const firstArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.articles.create(connection, {
      body: firstArticleData,
    });

  typia.assert(firstArticle);

  // 3. Verify first article response structure and fields
  TestValidator.equals(
    "first article title matches",
    firstArticle.title,
    firstArticleTitle,
  );
  TestValidator.equals(
    "first article body matches",
    firstArticle.body,
    firstArticleBody,
  );
  TestValidator.equals(
    "first article view count initialized",
    firstArticle.view_count,
    0,
  );
  TestValidator.equals(
    "first article not deleted",
    firstArticle.deleted_at,
    null,
  );

  // Verify author attribution
  TestValidator.equals(
    "first article author id matches member",
    firstArticle.author.id,
    authorizedMember.id,
  );
  TestValidator.equals(
    "first article author username matches",
    firstArticle.author.username,
    memberUsername,
  );
  TestValidator.equals(
    "first article author email matches",
    firstArticle.author.email,
    memberEmail,
  );

  // 4. Create second article to confirm repeatability
  const secondArticleTitle = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 5,
    wordMax: 12,
  });
  const secondArticleBody = RandomGenerator.content({
    paragraphs: 5,
    sentenceMin: 20,
    sentenceMax: 30,
    wordMin: 5,
    wordMax: 10,
  });

  const secondArticleData = {
    title: secondArticleTitle,
    body: secondArticleBody,
  } satisfies IDiscussionBoardArticle.ICreate;

  const secondArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.articles.create(connection, {
      body: secondArticleData,
    });

  typia.assert(secondArticle);

  // 5. Verify second article response structure
  TestValidator.equals(
    "second article title matches",
    secondArticle.title,
    secondArticleTitle,
  );
  TestValidator.equals(
    "second article body matches",
    secondArticle.body,
    secondArticleBody,
  );
  TestValidator.equals(
    "second article view count initialized",
    secondArticle.view_count,
    0,
  );
  TestValidator.equals(
    "second article not deleted",
    secondArticle.deleted_at,
    null,
  );
  TestValidator.predicate(
    "second article has different UUID from first",
    firstArticle.id !== secondArticle.id,
  );

  // Verify author attribution for second article
  TestValidator.equals(
    "second article author id matches member",
    secondArticle.author.id,
    authorizedMember.id,
  );
  TestValidator.equals(
    "second article author username matches",
    secondArticle.author.username,
    memberUsername,
  );

  // Verify both articles have same author structure
  TestValidator.equals(
    "both articles have same author id",
    firstArticle.author.id,
    secondArticle.author.id,
  );
  TestValidator.equals(
    "both articles have same author username",
    firstArticle.author.username,
    secondArticle.author.username,
  );
}
