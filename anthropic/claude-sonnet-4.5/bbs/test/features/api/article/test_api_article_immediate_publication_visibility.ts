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
 * This test validates the core requirement that articles are instantly
 * published without requiring separate publication approval or moderation queue
 * processing. When a member creates an article, it should be immediately
 * accessible to all users in an active, published state.
 *
 * Test workflow:
 *
 * 1. Register and authenticate a member account
 * 2. Create an article with valid title and body content
 * 3. Verify the article is returned with deleted_at as null (published status)
 * 4. Validate all required fields are properly populated
 * 5. Confirm the article is in an immediately visible, active state
 */
export async function test_api_article_immediate_publication_visibility(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const memberUsername = RandomGenerator.name(1);

  const registrationData = {
    email: memberEmail,
    password: memberPassword,
    username: memberUsername,
    ip: "127.0.0.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const authenticatedMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: registrationData,
    });
  typia.assert(authenticatedMember);

  // Step 2: Verify member authentication succeeded
  TestValidator.equals(
    "authenticated member email matches registration",
    authenticatedMember.email,
    memberEmail,
  );
  TestValidator.equals(
    "authenticated member username matches registration",
    authenticatedMember.username,
    memberUsername,
  );

  // Step 3: Create an article with valid content
  const articleTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const articleBody = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 15,
    sentenceMax: 25,
    wordMin: 4,
    wordMax: 8,
  });

  const articleData = {
    title: articleTitle,
    body: articleBody,
  } satisfies IDiscussionBoardArticle.ICreate;

  const createdArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: articleData,
    });
  typia.assert(createdArticle);

  // Step 4: Verify article is immediately published (deleted_at is null)
  TestValidator.equals(
    "article is immediately published with deleted_at as null",
    createdArticle.deleted_at,
    null,
  );

  // Step 5: Validate all required fields are properly populated
  TestValidator.predicate(
    "article has valid UUID identifier",
    createdArticle.id !== null && createdArticle.id !== undefined,
  );

  TestValidator.equals(
    "article title matches creation input",
    createdArticle.title,
    articleTitle,
  );

  TestValidator.equals(
    "article body matches creation input",
    createdArticle.body,
    articleBody,
  );

  TestValidator.equals(
    "article view count initialized to zero",
    createdArticle.view_count,
    0,
  );

  // Step 6: Verify timestamps are properly set
  TestValidator.predicate(
    "article has valid creation timestamp",
    createdArticle.created_at !== null &&
      createdArticle.created_at !== undefined,
  );

  TestValidator.predicate(
    "article has valid update timestamp",
    createdArticle.updated_at !== null &&
      createdArticle.updated_at !== undefined,
  );

  // Step 7: Verify author information is included
  TestValidator.predicate(
    "article includes author summary information",
    createdArticle.author !== null && createdArticle.author !== undefined,
  );

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
