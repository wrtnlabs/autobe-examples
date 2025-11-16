import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test that article authors can successfully update their own articles' title
 * and body content.
 *
 * This test validates the core article update functionality with proper
 * authorization, ensuring that authenticated members can modify their own
 * articles while preserving data integrity.
 *
 * Test workflow:
 *
 * 1. Create and authenticate a member account (article author)
 * 2. Create an article with initial title and body content
 * 3. Update the article with new title and body content
 * 4. Verify the response returns updated article data
 * 5. Confirm title changed to the new value (5-200 character constraint)
 * 6. Confirm body changed to the new value (10-50,000 character constraint)
 * 7. Verify updated_at timestamp is refreshed to current time
 * 8. Verify created_at timestamp remains unchanged (immutable)
 * 9. Verify id, author, view_count remain unchanged
 * 10. Ensure deleted_at remains null
 * 11. Validate that the update operation preserves data integrity
 */
export async function test_api_article_update_by_author(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a member account
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "testPassword123",
    username: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const authenticatedMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(authenticatedMember);

  // Step 2: Create an article with initial title and body
  const initialTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 7,
  });
  const initialBody = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 10,
    sentenceMax: 20,
    wordMin: 4,
    wordMax: 8,
  });

  const initialArticleData = {
    title: initialTitle,
    body: initialBody,
  } satisfies IDiscussionBoardArticle.ICreate;

  const createdArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: initialArticleData,
    });
  typia.assert(createdArticle);

  // Capture original values for comparison
  const originalCreatedAt = createdArticle.created_at;
  const originalId = createdArticle.id;
  const originalAuthor = createdArticle.author;
  const originalViewCount = createdArticle.view_count;

  // Small delay to ensure updated_at will be different
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Step 3: Update the article with new title and body
  const newTitle = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 4,
    wordMax: 8,
  });
  const newBody = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 15,
    sentenceMax: 25,
    wordMin: 5,
    wordMax: 10,
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

  // Step 4-11: Verify all update expectations

  // Step 5: Confirm title changed to the new value
  TestValidator.equals(
    "title should be updated to new value",
    updatedArticle.title,
    newTitle,
  );

  // Step 6: Confirm body changed to the new value
  TestValidator.equals(
    "body should be updated to new value",
    updatedArticle.body,
    newBody,
  );

  // Step 7: Verify updated_at timestamp is refreshed
  TestValidator.predicate(
    "updated_at should be refreshed after update",
    new Date(updatedArticle.updated_at).getTime() >
      new Date(originalCreatedAt).getTime(),
  );

  // Step 8: Verify created_at timestamp remains unchanged (immutable)
  TestValidator.equals(
    "created_at should remain unchanged",
    updatedArticle.created_at,
    originalCreatedAt,
  );

  // Step 9: Verify id remains unchanged
  TestValidator.equals(
    "article id should remain unchanged",
    updatedArticle.id,
    originalId,
  );

  // Step 9: Verify author remains unchanged
  TestValidator.equals(
    "author should remain unchanged",
    updatedArticle.author.id,
    originalAuthor.id,
  );
  TestValidator.equals(
    "author username should remain unchanged",
    updatedArticle.author.username,
    originalAuthor.username,
  );

  // Step 9: Verify view_count remains unchanged
  TestValidator.equals(
    "view_count should remain unchanged",
    updatedArticle.view_count,
    originalViewCount,
  );

  // Step 10: Ensure deleted_at remains null
  TestValidator.equals(
    "deleted_at should remain null",
    updatedArticle.deleted_at,
    null,
  );

  // Step 11: Validate overall data integrity
  TestValidator.predicate(
    "title should respect length constraints",
    updatedArticle.title.length >= 5 && updatedArticle.title.length <= 200,
  );

  TestValidator.predicate(
    "body should respect length constraints",
    updatedArticle.body.length >= 10 && updatedArticle.body.length <= 50000,
  );
}
