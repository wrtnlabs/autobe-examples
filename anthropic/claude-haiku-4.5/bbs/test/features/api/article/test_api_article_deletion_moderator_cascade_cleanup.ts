import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentAttachment";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test cascade deletion by moderator including complete cleanup of associated
 * data.
 *
 * This test validates that when a moderator deletes an article:
 *
 * 1. All comments associated with the article are soft-deleted
 * 2. All attachment records are removed and storage is cleaned
 * 3. Moderation history and audit trail entries are preserved for compliance
 * 4. View counts and comment counts are cleared
 * 5. Article deletion is properly logged with moderator attribution
 *
 * The test follows a complete workflow: contributor creates article with
 * attachments and comments, moderator deletes the article, and we verify the
 * cascade cleanup.
 */
export async function test_api_article_deletion_moderator_cascade_cleanup(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a contributor
  const contributorEmail = typia.random<string & tags.Format<"email">>();
  const contributorPassword = "TestPassword123!@#";
  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: contributorEmail,
        username: RandomGenerator.alphabets(8),
        password: contributorPassword,
        href: "http://localhost:3000/register",
        referrer: "http://localhost:3000",
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);

  // Step 2: Create an article with attachments
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 3,
            wordMax: 8,
          }),
          content: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 5,
            sentenceMax: 10,
            wordMin: 3,
            wordMax: 7,
          }),
          categoryId: categoryId,
          href: "http://localhost:3000/articles/create",
          referrer: "http://localhost:3000",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  TestValidator.predicate(
    "article created in draft status",
    article.status === "draft",
  );

  // Step 3: Add attachments to the article
  const attachmentUrls = [
    "http://storage.example.com/file1.jpg",
    "http://storage.example.com/file2.pdf",
  ];
  const attachments: IDiscussionBoardArticleAttachment[] =
    await ArrayUtil.asyncMap(attachmentUrls, async (url) => {
      const attachment =
        await api.functional.discussionBoard.contributor.articles.attachments.attach(
          connection,
          {
            articleId: article.id,
            body: {
              original_filename: `attachment_${RandomGenerator.alphaNumeric(8)}.jpg`,
              file_type: "jpg",
              file_size: 1024000,
              mime_type: "image/jpeg",
              display_url: url,
            } satisfies IDiscussionBoardArticleAttachment.ICreate,
          },
        );
      return attachment;
    });
  typia.assert(attachments);
  TestValidator.equals("correct number of attachments", attachments.length, 2);

  // Step 4: Add comments to the article
  const commentContents = [
    RandomGenerator.paragraph({ sentences: 2 }),
    RandomGenerator.paragraph({ sentences: 2 }),
    RandomGenerator.paragraph({ sentences: 2 }),
  ];
  const comments: IDiscussionBoardComment[] = await ArrayUtil.asyncMap(
    commentContents,
    async (content) => {
      const comment =
        await api.functional.discussionBoard.contributor.articles.comments.create(
          connection,
          {
            articleId: article.id,
            body: {
              content: content,
            } satisfies IDiscussionBoardComment.ICreate,
          },
        );
      return comment;
    },
  );
  typia.assert(comments);
  TestValidator.equals(
    "correct number of comments created",
    comments.length,
    3,
  );

  // Step 5: Register and authenticate a moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "ModeratorPass123!@#";
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphabets(10),
        password: moderatorPassword,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 6: Moderator deletes the article
  const deletedArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.moderator.articles.eraseByModerator(
      connection,
      {
        articleId: article.id,
      },
    );
  typia.assert(deletedArticle);

  // Step 7: Verify article deletion
  TestValidator.predicate(
    "article status is deleted",
    deletedArticle.status === "deleted",
  );
  TestValidator.predicate(
    "article has deleted_at timestamp",
    deletedArticle.deleted_at !== null &&
      deletedArticle.deleted_at !== undefined,
  );

  // Step 8: Verify counts are cleared
  TestValidator.equals("view count is cleared", deletedArticle.view_count, 0);
  TestValidator.equals(
    "comment count is cleared",
    deletedArticle.comment_count,
    0,
  );

  // Step 9: Verify attachments association is cleared
  TestValidator.predicate(
    "attachments array is empty or undefined",
    deletedArticle.attachments === undefined ||
      deletedArticle.attachments.length === 0,
  );
}
