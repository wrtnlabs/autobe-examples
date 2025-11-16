import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test that immutable fields cannot be modified through article update
 * operations.
 *
 * This test validates field immutability constraints and data integrity
 * protection by creating an article, updating its mutable fields (title, body),
 * and confirming that immutable fields (id, created_at, author, view_count)
 * remain unchanged.
 *
 * Steps:
 *
 * 1. Create and authenticate a member account
 * 2. Create an article and record its immutable field values
 * 3. Update the article with new title and body
 * 4. Verify mutable fields were updated successfully
 * 5. Confirm all immutable fields remain unchanged
 */
export async function test_api_article_update_immutable_fields(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a member account
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "testPassword123!",
    username: RandomGenerator.name(2),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: memberData });
  typia.assert(member);

  // Step 2: Create an article and record its immutable field values
  const originalTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const originalBody = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 10,
    sentenceMax: 15,
  });

  const articleData = {
    title: originalTitle,
    body: originalBody,
  } satisfies IDiscussionBoardArticle.ICreate;

  const createdArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: articleData,
    });
  typia.assert(createdArticle);

  // Record original immutable field values
  const originalId = createdArticle.id;
  const originalCreatedAt = createdArticle.created_at;
  const originalAuthor = createdArticle.author;
  const originalViewCount = createdArticle.view_count;

  // Step 3: Update the article with new title and body
  const newTitle = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 6,
    wordMax: 12,
  });
  const newBody = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 12,
    sentenceMax: 20,
  });

  const updateData = {
    title: newTitle,
    body: newBody,
  } satisfies IDiscussionBoardArticle.IUpdate;

  const updatedArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.update(connection, {
      articleId: createdArticle.id,
      body: updateData,
    });
  typia.assert(updatedArticle);

  // Step 4: Verify mutable fields were updated successfully
  TestValidator.equals(
    "title should be updated",
    updatedArticle.title,
    newTitle,
  );
  TestValidator.equals("body should be updated", updatedArticle.body, newBody);

  // Step 5: Confirm all immutable fields remain unchanged
  TestValidator.equals(
    "id must remain unchanged",
    updatedArticle.id,
    originalId,
  );
  TestValidator.equals(
    "created_at must remain unchanged",
    updatedArticle.created_at,
    originalCreatedAt,
  );
  TestValidator.equals(
    "view_count must remain unchanged",
    updatedArticle.view_count,
    originalViewCount,
  );

  // Verify author information remains unchanged
  TestValidator.equals(
    "author id must remain unchanged",
    updatedArticle.author.id,
    originalAuthor.id,
  );
  TestValidator.equals(
    "author username must remain unchanged",
    updatedArticle.author.username,
    originalAuthor.username,
  );
  TestValidator.equals(
    "author email must remain unchanged",
    updatedArticle.author.email,
    originalAuthor.email,
  );
}
