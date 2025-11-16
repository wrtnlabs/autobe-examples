import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test the complete article lifecycle from creation to soft deletion.
 *
 * Authenticates as a member, creates an article with economic discussion
 * content, verifies the article is created with deleted_at as null, then
 * performs soft deletion. Validates that after deletion the article maintains
 * its id, title, body, view_count, created_at, updated_at, and author
 * information intact, but has deleted_at timestamp populated. Ensures the soft
 * delete pattern preserves all data for audit trail purposes while marking the
 * content as deleted.
 *
 * Business Flow:
 *
 * 1. Register and authenticate as a member
 * 2. Create article with economic discussion content
 * 3. Verify article created with deleted_at === null
 * 4. Perform soft deletion
 * 5. Validate all data preserved with deleted_at timestamp populated
 */
export async function test_api_article_deletion_workflow(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as a member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "securePassword123!";
  const memberUsername = RandomGenerator.name(2);

  const registrationBody = {
    email: memberEmail,
    password: memberPassword,
    username: memberUsername,
    href: "https://discussion-board.example.com/register",
    referrer: "https://discussion-board.example.com/home",
  } satisfies IDiscussionBoardMember.ICreate;

  const authorizedMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: registrationBody,
    });
  typia.assert(authorizedMember);

  // Step 2: Create article with economic discussion content
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

  const articleCreateBody = {
    title: articleTitle,
    body: articleBody,
  } satisfies IDiscussionBoardArticle.ICreate;

  const createdArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: articleCreateBody,
    });
  typia.assert(createdArticle);

  // Step 3: Verify article created with deleted_at === null
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
    "deleted_at is null before deletion",
    createdArticle.deleted_at,
    null,
  );
  TestValidator.predicate(
    "article has valid UUID",
    createdArticle.id.length === 36,
  );
  TestValidator.predicate(
    "view_count is initialized to 0",
    createdArticle.view_count === 0,
  );
  TestValidator.predicate(
    "author information is present",
    createdArticle.author.id === authorizedMember.id,
  );
  TestValidator.equals(
    "author username matches",
    createdArticle.author.username,
    memberUsername,
  );

  // Step 4: Perform soft deletion
  const deletedArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.erase(connection, {
      articleId: createdArticle.id,
    });
  typia.assert(deletedArticle);

  // Step 5: Validate all data preserved with deleted_at timestamp populated
  TestValidator.equals(
    "article ID unchanged after deletion",
    deletedArticle.id,
    createdArticle.id,
  );
  TestValidator.equals(
    "article title preserved",
    deletedArticle.title,
    createdArticle.title,
  );
  TestValidator.equals(
    "article body preserved",
    deletedArticle.body,
    createdArticle.body,
  );
  TestValidator.equals(
    "view_count preserved",
    deletedArticle.view_count,
    createdArticle.view_count,
  );
  TestValidator.equals(
    "created_at preserved",
    deletedArticle.created_at,
    createdArticle.created_at,
  );
  TestValidator.equals(
    "updated_at preserved",
    deletedArticle.updated_at,
    createdArticle.updated_at,
  );
  TestValidator.equals(
    "author information preserved",
    deletedArticle.author,
    createdArticle.author,
  );

  // Verify deleted_at is now populated with a valid timestamp
  TestValidator.predicate(
    "deleted_at is populated after deletion",
    deletedArticle.deleted_at !== null,
  );

  if (deletedArticle.deleted_at !== null) {
    const deletedAtValue = typia.assert<string & tags.Format<"date-time">>(
      deletedArticle.deleted_at,
    );
    TestValidator.predicate(
      "deleted_at is valid ISO 8601 timestamp",
      new Date(deletedAtValue).getTime() > 0,
    );
    TestValidator.predicate(
      "deleted_at is recent",
      new Date(deletedAtValue).getTime() >=
        new Date(createdArticle.created_at).getTime(),
    );
  }
}
