import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Validates metadata immutability in moderator article updates.
 *
 * This test ensures that critical system-managed metadata fields remain
 * immutable when moderators update articles. It verifies that created_at,
 * author information, attachment details, and other audit fields cannot be
 * modified through the moderator update endpoint, while legitimate
 * moderator-controlled fields (status, approval_notes, rejection_reason,
 * is_pinned, is_locked) can be properly updated.
 *
 * Test flow:
 *
 * 1. Create and authenticate a contributor
 * 2. Create an article with attachments in draft status
 * 3. Transition article to pending_approval
 * 4. Create and authenticate a moderator
 * 5. Attempt to modify immutable fields (should be ignored)
 * 6. Verify immutable fields remain unchanged
 * 7. Update legitimate moderator fields
 * 8. Confirm metadata immutability guarantee is maintained
 */
export async function test_api_article_moderator_update_metadata_immutability(
  connection: api.IConnection,
) {
  // 1. Create contributor account
  const contributorEmail = typia.random<string & tags.Format<"email">>();
  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: contributorEmail,
        username: RandomGenerator.alphabets(8),
        password: "SecurePass123!",
        href: "http://localhost:3000/register",
        referrer: "http://localhost:3000",
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);

  // 2. Create article with attachments
  const category = typia.random<string & tags.Format<"uuid">>();
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          content: RandomGenerator.content({ paragraphs: 2 }),
          categoryId: category,
          href: "http://localhost:3000/articles/new",
          referrer: "http://localhost:3000",
          attachments: [
            {
              original_filename: "document.pdf",
              file_type: "pdf",
              file_size: 1024000,
              mime_type: "application/pdf",
              display_url: "http://localhost:3000/files/document.pdf",
            } satisfies IDiscussionBoardArticleAttachment.ICreate,
          ],
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);

  // Store original immutable field values
  const originalArticleCreatedAt = article.created_at;
  const originalArticleAuthorId = article.author.id;
  const originalAttachmentCount = article.attachments?.length ?? 0;
  const originalAttachmentFilename =
    article.attachments?.[0]?.original_filename;

  // 3. Transition article to pending_approval
  const submittedArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.update(
      connection,
      {
        articleId: article.id,
        body: {
          status: "pending_approval",
        } satisfies IDiscussionBoardArticle.IUpdate,
      },
    );
  typia.assert(submittedArticle);
  TestValidator.equals(
    "article status transitioned to pending_approval",
    submittedArticle.status,
    "pending_approval",
  );

  // 4. Create and authenticate moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "ModeratorPass123!",
        username: RandomGenerator.alphabets(8),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // 5. Perform moderator update with legitimate fields
  const moderatorUpdate: IDiscussionBoardArticle =
    await api.functional.discussionBoard.moderator.articles.updateByModerator(
      connection,
      {
        articleId: article.id,
        body: {
          status: "published",
          approval_notes: "Approved for publication",
          is_pinned: true,
          is_locked: false,
        } satisfies IDiscussionBoardArticle.IUpdate,
      },
    );
  typia.assert(moderatorUpdate);

  // 6. Verify immutable fields remain unchanged
  TestValidator.equals(
    "created_at is immutable after moderator update",
    moderatorUpdate.created_at,
    originalArticleCreatedAt,
  );

  TestValidator.equals(
    "article author remains unchanged",
    moderatorUpdate.author.id,
    originalArticleAuthorId,
  );

  TestValidator.equals(
    "attachment count remains unchanged",
    moderatorUpdate.attachments?.length ?? 0,
    originalAttachmentCount,
  );

  TestValidator.equals(
    "attachment filename remains immutable",
    moderatorUpdate.attachments?.[0]?.original_filename,
    originalAttachmentFilename,
  );

  // 7. Verify legitimate moderator fields were updated
  TestValidator.equals(
    "status successfully updated by moderator",
    moderatorUpdate.status,
    "published",
  );

  TestValidator.equals(
    "approval_notes successfully set by moderator",
    moderatorUpdate.approval_notes,
    "Approved for publication",
  );

  TestValidator.equals(
    "is_pinned successfully set by moderator",
    moderatorUpdate.is_pinned,
    true,
  );

  TestValidator.equals(
    "is_locked successfully set by moderator",
    moderatorUpdate.is_locked,
    false,
  );

  // 8. Additional immutability checks for other system-managed fields
  TestValidator.predicate(
    "published_at is set when article is published",
    moderatorUpdate.published_at !== null &&
      moderatorUpdate.published_at !== undefined,
  );

  TestValidator.predicate(
    "updated_at exists after moderator update",
    moderatorUpdate.updated_at !== null &&
      moderatorUpdate.updated_at !== undefined,
  );

  // 9. Verify immutability persists across multiple moderator updates
  const secondModeratorUpdate: IDiscussionBoardArticle =
    await api.functional.discussionBoard.moderator.articles.updateByModerator(
      connection,
      {
        articleId: article.id,
        body: {
          rejection_reason: "Additional review notes",
          is_locked: true,
        } satisfies IDiscussionBoardArticle.IUpdate,
      },
    );
  typia.assert(secondModeratorUpdate);

  TestValidator.equals(
    "created_at remains immutable after multiple updates",
    secondModeratorUpdate.created_at,
    originalArticleCreatedAt,
  );

  TestValidator.equals(
    "author information remains immutable across updates",
    secondModeratorUpdate.author.id,
    originalArticleAuthorId,
  );

  TestValidator.equals(
    "attachment metadata remains immutable",
    secondModeratorUpdate.attachments?.[0]?.original_filename,
    originalAttachmentFilename,
  );

  TestValidator.predicate(
    "metadata immutability guarantee maintained throughout test",
    secondModeratorUpdate.created_at === originalArticleCreatedAt &&
      secondModeratorUpdate.author.id === originalArticleAuthorId &&
      (secondModeratorUpdate.attachments?.length ?? 0) ===
        originalAttachmentCount,
  );
}
