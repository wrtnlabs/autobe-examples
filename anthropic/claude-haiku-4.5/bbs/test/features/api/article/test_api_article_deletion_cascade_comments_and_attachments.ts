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
 * Test cascade deletion behavior when a contributor deletes an article.
 *
 * This test validates that deleting an article properly cascades deletion to:
 *
 * - All associated comments (soft delete)
 * - All attachment records (removed from storage)
 * - View count (cleared to zero)
 * - Comment count (reset to zero)
 *
 * The test creates an article with attachments and comments from multiple
 * contributors, then deletes the article and verifies all related data is
 * properly removed following the cascade deletion strategy.
 */
export async function test_api_article_deletion_cascade_comments_and_attachments(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate the article owner
  const ownerEmail = typia.random<string & tags.Format<"email">>();
  const ownerUsername = RandomGenerator.name(1);
  const owner = await api.functional.auth.contributor.join(connection, {
    body: {
      email: ownerEmail,
      username: ownerUsername,
      password: "SecurePass123!@",
      href: "http://localhost/register",
      referrer: "http://localhost",
    } satisfies IDiscussionBoardContributor.ICreate,
  });
  typia.assert(owner);
  TestValidator.predicate(
    "owner authenticated with active status",
    owner.account_status === "active",
  );

  // Step 2: Create an article in draft status
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    content: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 10,
      sentenceMax: 20,
    }),
    categoryId: categoryId,
    href: "http://localhost/articles/create",
    referrer: "http://localhost/articles",
  } satisfies IDiscussionBoardArticle.ICreate;

  const article =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: articleData,
      },
    );
  typia.assert(article);
  TestValidator.equals(
    "article created in draft status",
    article.status,
    "draft",
  );
  TestValidator.equals(
    "article has zero comments initially",
    article.comment_count,
    0,
  );
  TestValidator.equals(
    "article has zero views initially",
    article.view_count,
    0,
  );

  // Step 3: Upload attachments to the article
  const attachment1FileName = `test-attachment-${RandomGenerator.alphaNumeric(8)}.jpg`;
  const attachment1 =
    await api.functional.discussionBoard.contributor.articles.attachments.attach(
      connection,
      {
        articleId: article.id,
        body: {
          original_filename: attachment1FileName,
          file_type: "jpg",
          file_size: 1024 * 50,
          mime_type: "image/jpeg",
          display_url: "http://localhost/storage/attachments/test-image-1.jpg",
        } satisfies IDiscussionBoardArticleAttachment.ICreate,
      },
    );
  typia.assert(attachment1);

  const attachment2FileName = `document-${RandomGenerator.alphaNumeric(8)}.pdf`;
  const attachment2 =
    await api.functional.discussionBoard.contributor.articles.attachments.attach(
      connection,
      {
        articleId: article.id,
        body: {
          original_filename: attachment2FileName,
          file_type: "pdf",
          file_size: 1024 * 100,
          mime_type: "application/pdf",
          display_url:
            "http://localhost/storage/attachments/test-document-1.pdf",
        } satisfies IDiscussionBoardArticleAttachment.ICreate,
      },
    );
  typia.assert(attachment2);

  // Step 4: Register second contributor to add comments
  const commenter1Email = typia.random<string & tags.Format<"email">>();
  const commenter1Username = RandomGenerator.name(1);
  const commenter1 = await api.functional.auth.contributor.join(connection, {
    body: {
      email: commenter1Email,
      username: commenter1Username,
      password: "SecurePass123!@",
      href: "http://localhost/register",
      referrer: "http://localhost",
    } satisfies IDiscussionBoardContributor.ICreate,
  });
  typia.assert(commenter1);

  // Step 5: Add comments to the article (as commenter1)
  const comment1Data = {
    content: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 8,
    }),
  } satisfies IDiscussionBoardComment.ICreate;

  const comment1 =
    await api.functional.discussionBoard.contributor.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: comment1Data,
      },
    );
  typia.assert(comment1);

  const comment2Data = {
    content: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 3,
      wordMax: 8,
    }),
  } satisfies IDiscussionBoardComment.ICreate;

  const comment2 =
    await api.functional.discussionBoard.contributor.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: comment2Data,
      },
    );
  typia.assert(comment2);

  // Step 6: Register third contributor for additional comments
  const commenter2Email = typia.random<string & tags.Format<"email">>();
  const commenter2Username = RandomGenerator.name(1);
  const commenter2 = await api.functional.auth.contributor.join(connection, {
    body: {
      email: commenter2Email,
      username: commenter2Username,
      password: "SecurePass123!@",
      href: "http://localhost/register",
      referrer: "http://localhost",
    } satisfies IDiscussionBoardContributor.ICreate,
  });
  typia.assert(commenter2);

  // Step 7: Add comments with attachments (as commenter2)
  const comment3Data = {
    content: RandomGenerator.paragraph({
      sentences: 6,
      wordMin: 3,
      wordMax: 8,
    }),
    attachments: [
      {
        original_file_name: `comment-image-${RandomGenerator.alphaNumeric(6)}.png`,
        file_type: "png",
        file_size: 1024 * 20,
        mime_type: "image/png",
        display_url: "http://localhost/storage/comment-attachments/image-1.png",
      } satisfies IDiscussionBoardCommentAttachment.ICreate,
    ],
  } satisfies IDiscussionBoardComment.ICreate;

  const comment3 =
    await api.functional.discussionBoard.contributor.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: comment3Data,
      },
    );
  typia.assert(comment3);
  TestValidator.predicate(
    "comment has attachments",
    comment3.attachments.length > 0,
  );

  // Step 8: Re-authenticate as article owner for deletion
  const ownerReauth = await api.functional.auth.contributor.join(connection, {
    body: {
      email: ownerEmail,
      username: ownerUsername,
      password: "SecurePass123!@",
      href: "http://localhost/login",
      referrer: "http://localhost",
    } satisfies IDiscussionBoardContributor.ICreate,
  });
  typia.assert(ownerReauth);

  // Step 9: Delete the article as owner
  const deletedArticle =
    await api.functional.discussionBoard.contributor.articles.erase(
      connection,
      {
        articleId: article.id,
      },
    );
  typia.assert(deletedArticle);
  TestValidator.equals(
    "article status is deleted after erase",
    deletedArticle.status,
    "deleted",
  );
  TestValidator.predicate(
    "article deleted_at timestamp is set",
    deletedArticle.deleted_at !== null &&
      deletedArticle.deleted_at !== undefined,
  );

  // Step 10: Verify cascade deletion - comment count cleared
  TestValidator.equals(
    "article comment_count reset to zero after cascade deletion",
    deletedArticle.comment_count,
    0,
  );

  // Step 11: Verify view count cleared
  TestValidator.equals(
    "article view_count reset to zero after cascade deletion",
    deletedArticle.view_count,
    0,
  );

  // Step 12: Verify attachments cleared
  TestValidator.predicate(
    "attachments removed in cascade deletion",
    deletedArticle.attachments === undefined ||
      deletedArticle.attachments.length === 0,
  );

  // Step 13: Verify complete cascade deletion lifecycle
  TestValidator.predicate(
    "cascade deletion properly handled all associated data",
    deletedArticle.status === "deleted" &&
      deletedArticle.comment_count === 0 &&
      deletedArticle.view_count === 0 &&
      (deletedArticle.attachments === undefined ||
        deletedArticle.attachments.length === 0) &&
      deletedArticle.deleted_at !== null &&
      deletedArticle.deleted_at !== undefined,
  );
}
