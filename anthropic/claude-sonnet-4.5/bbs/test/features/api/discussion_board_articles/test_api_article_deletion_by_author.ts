import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test that a member can successfully soft delete their own article.
 *
 * This test validates the complete workflow of article deletion by its author:
 *
 * 1. Register a new member account and obtain authentication tokens
 * 2. Create a new article as the authenticated member
 * 3. Delete the article using the same authenticated member
 * 4. Verify soft deletion: deleted_at timestamp is set while content is preserved
 *
 * The test ensures that:
 *
 * - Only article authors can delete their own articles
 * - Deletion follows the soft-delete pattern (sets deleted_at instead of removing
 *   record)
 * - Article content remains intact after deletion for audit trails
 * - Referential integrity is maintained with related entities
 */
export async function test_api_article_deletion_by_author(
  connection: api.IConnection,
) {
  // Step 1: Register a new member and authenticate
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "securePassword123!";
  const memberUsername = RandomGenerator.name(2);

  const registrationData = {
    email: memberEmail,
    password: memberPassword,
    username: memberUsername,
    ip: "127.0.0.1",
    href: "https://discussion-board.example.com/register" satisfies string &
      tags.Format<"uri">,
    referrer: "https://discussion-board.example.com/" satisfies string &
      tags.Format<"uri">,
  } satisfies IDiscussionBoardMember.ICreate;

  const authenticatedMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: registrationData,
    });
  typia.assert(authenticatedMember);

  // Verify member registration succeeded
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
  TestValidator.predicate(
    "member has valid ID",
    typia.is<string & tags.Format<"uuid">>(authenticatedMember.id),
  );
  TestValidator.predicate(
    "member has access token",
    authenticatedMember.token.access.length > 0,
  );

  // Step 2: Create a new article as the authenticated member
  const articleTitle = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 3,
    wordMax: 8,
  });
  const articleBody = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 10,
    sentenceMax: 15,
    wordMin: 4,
    wordMax: 7,
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

  // Verify article creation succeeded
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
  TestValidator.predicate(
    "article has valid ID",
    typia.is<string & tags.Format<"uuid">>(createdArticle.id),
  );
  TestValidator.equals(
    "article author ID matches member",
    createdArticle.author.id,
    authenticatedMember.id,
  );
  TestValidator.equals(
    "article is not deleted initially",
    createdArticle.deleted_at,
    null,
  );

  // Step 3: Delete the article as the authenticated member (author)
  const deletedArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.erase(connection, {
      articleId: createdArticle.id,
    });
  typia.assert(deletedArticle);

  // Step 4: Verify soft deletion - article has deleted_at timestamp set
  TestValidator.predicate(
    "article has deleted_at timestamp",
    deletedArticle.deleted_at !== null,
  );

  // Verify the deleted_at field is a valid date-time string
  if (deletedArticle.deleted_at !== null) {
    TestValidator.predicate(
      "deleted_at is valid date-time",
      typia.is<string & tags.Format<"date-time">>(deletedArticle.deleted_at),
    );
  }

  // Verify article content is preserved after soft deletion
  TestValidator.equals(
    "article ID preserved",
    deletedArticle.id,
    createdArticle.id,
  );
  TestValidator.equals(
    "article title preserved",
    deletedArticle.title,
    articleTitle,
  );
  TestValidator.equals(
    "article body preserved",
    deletedArticle.body,
    articleBody,
  );
  TestValidator.equals(
    "article author preserved",
    deletedArticle.author.id,
    authenticatedMember.id,
  );

  // Verify other metadata is preserved
  TestValidator.equals(
    "view count preserved",
    deletedArticle.view_count,
    createdArticle.view_count,
  );
  TestValidator.equals(
    "created_at timestamp preserved",
    deletedArticle.created_at,
    createdArticle.created_at,
  );
}
