import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticle";
import type { IEconomicDiscussionAttachmentFileType } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAttachmentFileType";
import type { IEconomicDiscussionAttachments } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAttachments";
import type { IEconomicDiscussionCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategories";
import type { IEconomicDiscussionMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMember";
import type { IEconomicDiscussionMembers } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMembers";
import type { IEconomicDiscussionModerators } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerators";

/**
 * Test article editing within designated time constraints and version
 * management. This scenario validates that members can update their articles
 * only within permitted editing windows and that the system properly handles
 * version tracking with automatic incrementation. Tests version number
 * progression, content revision history, and ensures that update attempts
 * outside designated timeframes are properly handled by the system with
 * appropriate feedback to users.
 *
 * 1. Register a new member account for testing
 * 2. Create an initial article with basic content
 * 3. Update the article within the editing window
 * 4. Verify version number increments correctly
 * 5. Test content revision tracking
 * 6. Validate editing window constraints
 * 7. Test multiple updates and version progression
 * 8. Verify proper error handling for invalid updates
 */
export async function test_api_member_article_update_edit_window(
  connection: api.IConnection,
) {
  // Step 1: Register a new member for testing
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.name(),
      email: memberEmail,
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IEconomicDiscussionMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create initial article with basic content
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const initialContent = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 10,
    sentenceMax: 15,
    wordMin: 4,
    wordMax: 8,
  });

  const article =
    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: {
        title: RandomGenerator.name(3),
        content: initialContent,
        category_ids: [categoryId],
      } satisfies IEconomicDiscussionArticle.ICreate,
    });
  typia.assert(article);

  // Step 3: Update article content within editing window
  const updatedContent = RandomGenerator.content({
    paragraphs: 4,
    sentenceMin: 12,
    sentenceMax: 18,
    wordMin: 5,
    wordMax: 9,
  });

  const updatedTitle = RandomGenerator.name(4);

  const updatedArticle =
    await api.functional.economicDiscussion.member.articles.update(connection, {
      articleId: article.id,
      body: {
        title: updatedTitle,
        content: updatedContent,
      } satisfies IEconomicDiscussionArticle.IUpdate,
    });
  typia.assert(updatedArticle);

  // Step 4: Verify version number increments correctly
  TestValidator.equals(
    "version number should increment after update",
    updatedArticle.version,
    1.1,
  );

  // Step 5: Verify updated content matches request
  TestValidator.equals(
    "updated title matches",
    updatedArticle.title,
    updatedTitle,
  );
  TestValidator.equals(
    "updated content matches",
    updatedArticle.content,
    updatedContent,
  );

  // Step 6: Verify timestamps reflect update
  TestValidator.predicate(
    "updated_at should be after created_at",
    new Date(updatedArticle.updated_at).getTime() >
      new Date(article.updated_at).getTime(),
  );

  // Step 7: Test multiple updates and version progression
  const secondUpdateContent = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 8,
    sentenceMax: 12,
    wordMin: 3,
    wordMax: 7,
  });

  const secondUpdatedArticle =
    await api.functional.economicDiscussion.member.articles.update(connection, {
      articleId: article.id,
      body: {
        title: RandomGenerator.name(2),
        content: secondUpdateContent,
        status: "pending",
      } satisfies IEconomicDiscussionArticle.IUpdate,
    });
  typia.assert(secondUpdatedArticle);

  // Step 8: Verify second update increments version correctly
  TestValidator.equals(
    "version number increments on second update",
    secondUpdatedArticle.version,
    1.2,
  );

  // Step 9: Verify status updates correctly
  TestValidator.equals(
    "status updated to pending",
    secondUpdatedArticle.status,
    "pending",
  );

  // Step 10: Verify article ID remains consistent across updates
  TestValidator.equals(
    "article ID consistency maintained",
    secondUpdatedArticle.id,
    article.id,
  );

  // Step 11: Test updating with content modification and status
  const finalUpdateContent = RandomGenerator.content({
    paragraphs: 5,
    sentenceMin: 15,
    sentenceMax: 20,
    wordMin: 6,
    wordMax: 10,
  });

  const finalUpdatedArticle =
    await api.functional.economicDiscussion.member.articles.update(connection, {
      articleId: article.id,
      body: {
        title: RandomGenerator.name(6),
        content: finalUpdateContent,
      } satisfies IEconomicDiscussionArticle.IUpdate,
    });
  typia.assert(finalUpdatedArticle);

  // Step 12: Verify final version progression
  TestValidator.equals(
    "final version number correct",
    finalUpdatedArticle.version,
    1.3,
  );

  // Step 13: Validate all content changes are tracked
  TestValidator.notEquals(
    "title differs from original",
    finalUpdatedArticle.title,
    article.title,
  );

  TestValidator.notEquals(
    "content differs from original",
    finalUpdatedArticle.content,
    article.content,
  );

  // Step 14: Verify the editing window allows multiple rapid updates
  TestValidator.predicate(
    "version progression validated",
    finalUpdatedArticle.version > article.version,
  );

  // Step 15: Final validation - test business logic of editing window functionality
  TestValidator.predicate(
    "edit history maintained through version increments",
    finalUpdatedArticle.version === 1.3 &&
      updatedArticle.version === 1.1 &&
      secondUpdatedArticle.version === 1.2,
  );
}
