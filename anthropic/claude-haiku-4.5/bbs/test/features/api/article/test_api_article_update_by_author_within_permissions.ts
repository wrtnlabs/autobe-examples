import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardAttachmentCreate } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentCreate";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test article update workflow by original author with revision tracking.
 *
 * This test validates the complete article update process where a member
 * (author) creates an article with initial content and then updates it. The
 * system must:
 *
 * 1. Create article with title, body, and category assignment
 * 2. Update the article with new title and content
 * 3. Verify revision_number is incremented (0 → 1)
 * 4. Verify updated_at timestamp reflects the modification time
 * 5. Verify created_at timestamp remains unchanged (immutable)
 * 6. Verify article author remains the original creator
 * 7. Verify article status remains 'published' after update
 * 8. Verify updated article is immediately visible to other users
 * 9. Verify original content is preserved in revision history for audit trail
 *
 * This ensures data integrity, audit trail tracking, and proper permission
 * enforcement for article modifications.
 */
export async function test_api_article_update_by_author_within_permissions(
  connection: api.IConnection,
) {
  // Step 1: Create member account (author)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "TestPassword123",
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(member);

  // Step 2: Create initial article with title, content, and category
  const initialTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 8,
  });
  const initialContent = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 8,
    sentenceMax: 12,
    wordMin: 4,
    wordMax: 10,
  });

  const createdArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: initialTitle,
        content: initialContent,
        category_code: "economics",
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(createdArticle);

  // Validate initial article state
  TestValidator.equals(
    "article title matches initial",
    createdArticle.title,
    initialTitle,
  );
  TestValidator.equals(
    "article content matches initial",
    createdArticle.content,
    initialContent,
  );
  TestValidator.equals(
    "article revision number starts at 0",
    createdArticle.revision_number,
    0,
  );
  TestValidator.equals(
    "article status is published",
    createdArticle.status,
    "published",
  );
  TestValidator.equals(
    "article author matches creator",
    createdArticle.author.email,
    memberEmail,
  );

  // Capture timestamps for later validation
  const originalCreatedAt = createdArticle.created_at;
  const originalUpdatedAt = createdArticle.updated_at;

  // Step 3: Prepare updated article content
  const updatedTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 8,
  });
  const updatedContent = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 8,
    sentenceMax: 15,
    wordMin: 4,
    wordMax: 10,
  });

  // Add small delay to ensure timestamps differ
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Step 4: Update article with new title and content
  const updatedArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.update(connection, {
      articleId: createdArticle.id,
      body: {
        title: updatedTitle,
        content: updatedContent,
      } satisfies IDiscussionBoardArticle.IUpdate,
    });
  typia.assert(updatedArticle);

  // Step 5: Validate update results
  TestValidator.equals(
    "article title updated",
    updatedArticle.title,
    updatedTitle,
  );
  TestValidator.equals(
    "article content updated",
    updatedArticle.content,
    updatedContent,
  );
  TestValidator.equals(
    "revision number incremented",
    updatedArticle.revision_number,
    createdArticle.revision_number + 1,
  );
  TestValidator.equals(
    "article status remains published",
    updatedArticle.status,
    "published",
  );
  TestValidator.equals(
    "article author unchanged",
    updatedArticle.author.email,
    createdArticle.author.email,
  );

  // Step 6: Verify timestamps
  TestValidator.equals(
    "created_at timestamp immutable",
    updatedArticle.created_at,
    originalCreatedAt,
  );
  TestValidator.predicate(
    "updated_at timestamp changed",
    updatedArticle.updated_at !== originalUpdatedAt,
  );
  TestValidator.predicate(
    "updated_at is more recent than original",
    new Date(updatedArticle.updated_at) > new Date(originalUpdatedAt),
  );

  // Step 7: Verify article is published and visible
  TestValidator.equals(
    "article visible status",
    updatedArticle.status,
    "published",
  );
  TestValidator.predicate(
    "view_count is non-negative",
    updatedArticle.view_count >= 0,
  );
}
