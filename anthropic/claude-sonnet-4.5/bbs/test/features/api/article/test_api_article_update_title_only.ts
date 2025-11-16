import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test partial update capability where only the article title is updated while
 * body remains unchanged.
 *
 * This test validates the Partial pattern allowing selective field updates. The
 * test ensures that:
 *
 * 1. Create a member account and authenticate
 * 2. Create an article with specific title and body
 * 3. Update only the title field with a new value (5-200 characters)
 * 4. Verify the response shows updated title
 * 5. Verify the body content remains exactly as originally created
 * 6. Confirm updated_at is refreshed
 * 7. Confirm all other fields (id, created_at, author, view_count, deleted_at)
 *    remain unchanged
 * 8. Validate that omitting body from the update request doesn't clear or modify
 *    it
 */
export async function test_api_article_update_title_only(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "SecurePass123!";
  const memberUsername = RandomGenerator.name();

  const authenticatedMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        username: memberUsername,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(authenticatedMember);

  // Step 2: Create an article with specific title and body content
  const originalTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const originalBody = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 10,
    sentenceMax: 15,
    wordMin: 4,
    wordMax: 8,
  });

  const createdArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: originalTitle,
        body: originalBody,
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(createdArticle);

  // Verify the created article has expected values
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
  TestValidator.equals("deleted_at is null", createdArticle.deleted_at, null);

  // Step 3: Update only the title field with a new value
  const newTitle = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 5,
    wordMax: 10,
  });

  // Small delay to ensure updated_at will be different
  await new Promise((resolve) => setTimeout(resolve, 100));

  const updatedArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.update(connection, {
      articleId: createdArticle.id,
      body: {
        title: newTitle,
        // Intentionally omitting body to test partial update
      } satisfies IDiscussionBoardArticle.IUpdate,
    });
  typia.assert(updatedArticle);

  // Step 4: Verify the response shows updated title
  TestValidator.equals("title was updated", updatedArticle.title, newTitle);

  // Step 5: Verify the body content remains exactly as originally created
  TestValidator.equals(
    "body remains unchanged",
    updatedArticle.body,
    originalBody,
  );

  // Step 6: Confirm updated_at is refreshed
  TestValidator.predicate(
    "updated_at was refreshed",
    new Date(updatedArticle.updated_at).getTime() >
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
