import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test partial update capability where only the article body is updated while
 * title remains unchanged.
 *
 * This test validates selective field update without affecting other
 * properties. The test:
 *
 * 1. Creates a member account and authenticates
 * 2. Creates an article with specific title and body
 * 3. Updates only the body field with new content (10-50,000 characters)
 * 4. Verifies the response shows updated body content
 * 5. Verifies the title remains exactly as originally created
 * 6. Confirms updated_at timestamp is refreshed
 * 7. Confirms all other fields (id, created_at, author, view_count, deleted_at)
 *    remain unchanged
 * 8. Validates that omitting title from the update request doesn't clear or modify
 *    it
 */
export async function test_api_article_update_body_only(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a member account
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "TestPassword123!",
    username: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const authenticatedMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(authenticatedMember);

  // Step 2: Create an article with specific title and body
  const originalTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const originalBody = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 10,
    sentenceMax: 15,
    wordMin: 4,
    wordMax: 8,
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

  // Verify the article was created with correct initial values
  TestValidator.equals(
    "created article title matches",
    createdArticle.title,
    originalTitle,
  );
  TestValidator.equals(
    "created article body matches",
    createdArticle.body,
    originalBody,
  );
  TestValidator.equals("initial view count is 0", createdArticle.view_count, 0);
  TestValidator.equals(
    "article is not deleted",
    createdArticle.deleted_at,
    null,
  );

  // Step 3: Update only the body field (title omitted)
  const newBody = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 15,
    sentenceMax: 20,
    wordMin: 5,
    wordMax: 10,
  });

  const updateData = {
    body: newBody,
  } satisfies IDiscussionBoardArticle.IUpdate;

  const updatedArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.update(connection, {
      articleId: createdArticle.id,
      body: updateData,
    });
  typia.assert(updatedArticle);

  // Step 4: Verify the response shows updated body content
  TestValidator.equals(
    "article body was updated",
    updatedArticle.body,
    newBody,
  );

  // Step 5: Verify the title remains exactly as originally created
  TestValidator.equals(
    "article title unchanged",
    updatedArticle.title,
    originalTitle,
  );
  TestValidator.equals(
    "title matches created article",
    updatedArticle.title,
    createdArticle.title,
  );

  // Step 6: Confirm updated_at timestamp is refreshed
  TestValidator.predicate(
    "updated_at timestamp was refreshed",
    new Date(updatedArticle.updated_at).getTime() >=
      new Date(createdArticle.updated_at).getTime(),
  );

  // Step 7: Confirm all other immutable fields remain unchanged
  TestValidator.equals(
    "article ID unchanged",
    updatedArticle.id,
    createdArticle.id,
  );
  TestValidator.equals(
    "created_at unchanged",
    updatedArticle.created_at,
    createdArticle.created_at,
  );
  TestValidator.equals(
    "view_count unchanged",
    updatedArticle.view_count,
    createdArticle.view_count,
  );
  TestValidator.equals(
    "deleted_at unchanged",
    updatedArticle.deleted_at,
    createdArticle.deleted_at,
  );
  TestValidator.equals(
    "author unchanged",
    updatedArticle.author.id,
    createdArticle.author.id,
  );
  TestValidator.equals(
    "author username unchanged",
    updatedArticle.author.username,
    createdArticle.author.username,
  );
}
