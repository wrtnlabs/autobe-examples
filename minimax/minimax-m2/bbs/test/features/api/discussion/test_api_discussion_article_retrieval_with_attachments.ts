import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEconPoliticalDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionArticle";
import type { IEconPoliticalDiscussionAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionAttachment";
import type { IEconPoliticalDiscussionUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionUser";

/**
 * Test retrieving an article that has file attachments.
 *
 * This test validates that the article retrieval API endpoint properly returns
 * complete attachment information including all metadata fields such as
 * original_filename, file_type, file_size, file_url, upload_date,
 * uploader_name, security_scan_status, moderation_status, and is_public flags.
 *
 * The test ensures that users can view articles with their associated files and
 * that all attachment metadata is properly returned for security assessment and
 * file management purposes.
 */
export async function test_api_discussion_article_retrieval_with_attachments(
  connection: api.IConnection,
) {
  // Generate a random article ID to test retrieval
  const articleId = typia.random<string & tags.Format<"uuid">>();

  // Retrieve the article with attachments
  const article: IEconPoliticalDiscussionArticle =
    await api.functional.econPoliticalDiscussion.articles.at(connection, {
      articleId: articleId,
    });

  // Validate the article response structure
  typia.assert(article);

  // Validate basic article information is present
  TestValidator.equals("article has valid ID", article.id, articleId);
  TestValidator.predicate("article has title", article.title.length > 0);
  TestValidator.predicate("article has content", article.content.length > 0);
  TestValidator.predicate("article has category", article.category.length > 0);
  TestValidator.predicate("article has status", article.status.length > 0);
  TestValidator.predicate(
    "article has author",
    article.author !== null && article.author !== undefined,
  );

  // Validate author information
  TestValidator.predicate("author has valid ID", article.author.id.length > 0);
  TestValidator.predicate(
    "author has display name",
    article.author.display_name.length > 0,
  );
  TestValidator.predicate(
    "author has status",
    article.author.status.length > 0,
  );

  // Validate timestamp fields
  TestValidator.predicate(
    "article has creation date",
    article.created_at.length > 0,
  );
  TestValidator.predicate(
    "article has update date",
    article.updated_at.length > 0,
  );

  // Validate attachments if present
  if (article.attachments && article.attachments.length > 0) {
    // Test each attachment has complete metadata
    for (const attachment of article.attachments) {
      // Validate attachment structure matches IEconPoliticalDiscussionAttachment
      TestValidator.predicate(
        "attachment has valid ID",
        attachment.id.length > 0,
      );
      TestValidator.predicate(
        "attachment has original filename",
        attachment.original_filename.length > 0,
      );
      TestValidator.predicate(
        "attachment has file type",
        attachment.file_type.length > 0,
      );
      TestValidator.predicate(
        "attachment has file size",
        attachment.file_size >= 0,
      );
      TestValidator.predicate(
        "attachment has file URL",
        attachment.file_url.length > 0,
      );
      TestValidator.predicate(
        "attachment has upload date",
        attachment.upload_date.length > 0,
      );
      TestValidator.predicate(
        "attachment has uploader name",
        attachment.uploader_name.length > 0,
      );
      TestValidator.predicate(
        "attachment has security scan status",
        ["pending", "clean", "flagged", "quarantined"].includes(
          attachment.security_scan_status,
        ),
      );
      TestValidator.predicate(
        "attachment has moderation status",
        ["pending", "approved", "rejected", "requires_review"].includes(
          attachment.moderation_status,
        ),
      );
      TestValidator.predicate(
        "attachment has is_public flag",
        typeof attachment.is_public === "boolean",
      );

      // Validate file URL format
      TestValidator.predicate(
        "file URL is valid format",
        attachment.file_url.startsWith("http") ||
          attachment.file_url.startsWith("/"),
      );

      // Validate file size is reasonable (not negative, within typical limits)
      TestValidator.predicate(
        "file size is reasonable",
        attachment.file_size >= 0 && attachment.file_size < 100 * 1024 * 1024,
      ); // Less than 100MB

      // Validate article reference in attachment
      if (attachment.article) {
        TestValidator.equals(
          "attachment article ID matches",
          attachment.article.id,
          article.id,
        );
        TestValidator.equals(
          "attachment article title matches",
          attachment.article.title,
          article.title,
        );
        TestValidator.equals(
          "attachment article category matches",
          attachment.article.category,
          article.category,
        );
        TestValidator.equals(
          "attachment article status matches",
          attachment.article.status,
          article.status,
        );
      }
    }

    // Validate that attachments array contains expected number of items
    TestValidator.predicate(
      "attachments array is populated",
      article.attachments.length > 0,
    );
  } else {
    // If no attachments, ensure the field is properly undefined/null
    TestValidator.predicate(
      "attachments field is properly handled",
      article.attachments === undefined ||
        article.attachments === null ||
        article.attachments.length === 0,
    );
  }

  // Test error handling for invalid article ID
  await TestValidator.error("invalid article ID should fail", async () => {
    const invalidId = "00000000-0000-0000-0000-000000000000"; // Invalid UUID format
    await api.functional.econPoliticalDiscussion.articles.at(connection, {
      articleId: invalidId,
    });
  });
}
