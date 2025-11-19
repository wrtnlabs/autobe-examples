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
 * Test article retrieval with complete attachment metadata.
 *
 * This test validates that when an article with multiple attachments is
 * retrieved, all attachment metadata is complete and properly formatted. The
 * test creates a contributor account, creates an article with multiple file
 * attachments (images and documents), and then retrieves the article to
 * verify:
 *
 * - Attachments array includes all required fields
 * - Original_filename contains the file name
 * - File_type contains the file extension
 * - File_size is numeric and greater than zero
 * - Mime_type is properly formatted (e.g., image/jpeg, application/pdf)
 * - Uploaded_at is valid ISO 8601 date-time string
 * - Display_url is valid URI format
 * - Uploaded_by_contributor contains id and username
 * - Attachments maintain upload sequence order
 * - Complete article structure is valid
 */
export async function test_api_article_retrieval_with_attachments(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a contributor
  const contributorEmail = typia.random<string & tags.Format<"email">>();
  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: contributorEmail,
        username: RandomGenerator.alphabets(8),
        password: "TeSt@1234",
        href: "http://localhost:3000/register",
        referrer: "http://localhost:3000/home",
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);

  // Step 2: Prepare article with multiple attachments
  const attachments = [
    {
      original_filename: "document1.pdf",
      file_type: "pdf",
      file_size: 1024000,
      mime_type: "application/pdf",
      display_url: "http://localhost:3000/files/document1.pdf",
    } satisfies IDiscussionBoardArticleAttachment.ICreate,
    {
      original_filename: "image1.jpg",
      file_type: "jpg",
      file_size: 512000,
      mime_type: "image/jpeg",
      display_url: "http://localhost:3000/files/image1.jpg",
    } satisfies IDiscussionBoardArticleAttachment.ICreate,
    {
      original_filename: "spreadsheet.xlsx",
      file_type: "xlsx",
      file_size: 2048000,
      mime_type:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      display_url: "http://localhost:3000/files/spreadsheet.xlsx",
    } satisfies IDiscussionBoardArticleAttachment.ICreate,
  ];

  // Step 3: Create article with attachments
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const articleCreated: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          content: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 5,
            sentenceMax: 10,
          }),
          categoryId: categoryId,
          attachments: attachments,
          href: "http://localhost:3000/articles/create",
          referrer: "http://localhost:3000/articles",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(articleCreated);

  // Step 4: Retrieve the article
  const articleRetrieved: IDiscussionBoardArticle =
    await api.functional.discussionBoard.articles.at(connection, {
      articleId: articleCreated.id,
    });
  typia.assert(articleRetrieved);

  // Step 5: Validate article basic properties
  TestValidator.equals(
    "article id matches",
    articleRetrieved.id,
    articleCreated.id,
  );
  TestValidator.equals(
    "article title matches",
    articleRetrieved.title,
    articleCreated.title,
  );
  TestValidator.equals(
    "article content matches",
    articleRetrieved.content,
    articleCreated.content,
  );

  // Step 6: Validate attachments array exists and has correct count
  TestValidator.predicate(
    "attachments array exists",
    articleRetrieved.attachments !== undefined &&
      articleRetrieved.attachments !== null,
  );
  if (articleRetrieved.attachments) {
    TestValidator.equals(
      "attachment count matches",
      articleRetrieved.attachments.length,
      attachments.length,
    );

    // Step 7: Validate each attachment's metadata
    for (let i = 0; i < articleRetrieved.attachments.length; i++) {
      const attachment = articleRetrieved.attachments[i];

      // Validate attachment has required id
      TestValidator.predicate(
        `attachment ${i} has id`,
        attachment.id !== undefined &&
          attachment.id !== null &&
          attachment.id.length > 0,
      );

      // Validate original_filename
      TestValidator.equals(
        `attachment ${i} filename matches`,
        attachment.original_filename,
        attachments[i].original_filename,
      );
      TestValidator.predicate(
        `attachment ${i} filename is string`,
        typeof attachment.original_filename === "string" &&
          attachment.original_filename.length > 0,
      );

      // Validate file_type
      TestValidator.equals(
        `attachment ${i} file_type matches`,
        attachment.file_type,
        attachments[i].file_type,
      );
      TestValidator.predicate(
        `attachment ${i} file_type is string`,
        typeof attachment.file_type === "string" &&
          attachment.file_type.length > 0,
      );

      // Validate file_size
      TestValidator.equals(
        `attachment ${i} file_size matches`,
        attachment.file_size,
        attachments[i].file_size,
      );
      TestValidator.predicate(
        `attachment ${i} file_size is positive`,
        attachment.file_size > 0,
      );

      // Validate mime_type
      TestValidator.equals(
        `attachment ${i} mime_type matches`,
        attachment.mime_type,
        attachments[i].mime_type,
      );
      TestValidator.predicate(
        `attachment ${i} mime_type is valid`,
        typeof attachment.mime_type === "string" &&
          attachment.mime_type.includes("/"),
      );

      // Validate uploaded_at is ISO 8601 date-time
      TestValidator.predicate(
        `attachment ${i} uploaded_at is valid date-time`,
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(attachment.uploaded_at),
      );

      // Validate display_url is URI format
      TestValidator.predicate(
        `attachment ${i} display_url is valid uri`,
        /^https?:\/\//.test(attachment.display_url),
      );
      TestValidator.equals(
        `attachment ${i} display_url matches`,
        attachment.display_url,
        attachments[i].display_url,
      );

      // Validate uploaded_by_contributor
      TestValidator.predicate(
        `attachment ${i} has uploaded_by_contributor`,
        attachment.uploaded_by_contributor !== undefined &&
          attachment.uploaded_by_contributor !== null,
      );
      TestValidator.predicate(
        `attachment ${i} contributor has id`,
        attachment.uploaded_by_contributor.id !== undefined &&
          attachment.uploaded_by_contributor.id.length > 0,
      );
      TestValidator.predicate(
        `attachment ${i} contributor has username`,
        typeof attachment.uploaded_by_contributor.username === "string" &&
          attachment.uploaded_by_contributor.username.length > 0,
      );

      // Validate article reference
      TestValidator.equals(
        `attachment ${i} belongs to correct article`,
        attachment.discussion_board_article_id,
        articleCreated.id,
      );
    }
  }

  // Step 8: Validate author information
  TestValidator.predicate(
    "article has author",
    articleRetrieved.author !== undefined && articleRetrieved.author !== null,
  );
  TestValidator.equals(
    "author id matches",
    articleRetrieved.author.id,
    contributor.id,
  );
  TestValidator.equals(
    "author username matches",
    articleRetrieved.author.username,
    contributor.username,
  );
}
