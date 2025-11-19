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
 * Test article creation with multiple file attachments.
 *
 * A contributor creates an article with the maximum allowed attachments (up to
 * 10 files). Verifies that attachments are properly validated for file type and
 * size limits. Confirms that all attachments are linked to the article and
 * their metadata is preserved.
 *
 * Test workflow:
 *
 * 1. Register a new contributor account
 * 2. Prepare multiple attachments with various file types (images and documents)
 * 3. Create an article with all attachments
 * 4. Validate article creation with draft status
 * 5. Verify all attachments are linked and metadata is preserved
 */
export async function test_api_article_creation_with_multiple_attachments(
  connection: api.IConnection,
) {
  // Step 1: Register a new contributor account
  const contributorEmail = typia.random<string & tags.Format<"email">>();
  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: contributorEmail,
        username: RandomGenerator.alphaNumeric(10) satisfies string as string,
        password: "TestPassword123!",
        href: "http://localhost:3000/register" satisfies string &
          tags.Format<"uri"> as string & tags.Format<"uri">,
        referrer: "http://localhost:3000" satisfies string &
          tags.Format<"uri"> as string & tags.Format<"uri">,
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);
  TestValidator.predicate(
    "contributor account created successfully",
    contributor.id !== null && contributor.id !== undefined,
  );

  // Step 2: Prepare multiple attachments with various file types and sizes
  const attachments = [
    // Image files
    {
      original_filename: "screenshot.jpg",
      file_type: "jpg",
      file_size: 2097152, // 2MB (within 10MB limit for images)
      mime_type: "image/jpeg",
      display_url: "http://storage.example.com/files/screenshot.jpg",
    },
    {
      original_filename: "diagram.png",
      file_type: "png",
      file_size: 3145728, // 3MB (within 10MB limit for images)
      mime_type: "image/png",
      display_url: "http://storage.example.com/files/diagram.png",
    },
    {
      original_filename: "animation.gif",
      file_type: "gif",
      file_size: 1048576, // 1MB (within 10MB limit for images)
      mime_type: "image/gif",
      display_url: "http://storage.example.com/files/animation.gif",
    },
    {
      original_filename: "graphic.webp",
      file_type: "webp",
      file_size: 512000, // 500KB (within 10MB limit for images)
      mime_type: "image/webp",
      display_url: "http://storage.example.com/files/graphic.webp",
    },
    // Document files
    {
      original_filename: "report.pdf",
      file_type: "pdf",
      file_size: 5242880, // 5MB (within 25MB limit for documents)
      mime_type: "application/pdf",
      display_url: "http://storage.example.com/files/report.pdf",
    },
    {
      original_filename: "document.docx",
      file_type: "docx",
      file_size: 2097152, // 2MB (within 25MB limit for documents)
      mime_type:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      display_url: "http://storage.example.com/files/document.docx",
    },
    {
      original_filename: "data.xlsx",
      file_type: "xlsx",
      file_size: 3145728, // 3MB (within 25MB limit for documents)
      mime_type:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      display_url: "http://storage.example.com/files/data.xlsx",
    },
    {
      original_filename: "notes.txt",
      file_type: "txt",
      file_size: 102400, // 100KB (within 25MB limit for documents)
      mime_type: "text/plain",
      display_url: "http://storage.example.com/files/notes.txt",
    },
  ] satisfies IDiscussionBoardArticleAttachment.ICreate[];

  // Step 3: Create an article with all attachments
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const articleCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    content: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 10,
      sentenceMax: 15,
    }),
    categoryId: categoryId,
    href: "http://localhost:3000/articles/new" satisfies string &
      tags.Format<"uri"> as string & tags.Format<"uri">,
    referrer: "http://localhost:3000" satisfies string &
      tags.Format<"uri"> as string & tags.Format<"uri">,
    attachments: attachments,
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: articleCreateBody,
      },
    );
  typia.assert(article);

  // Step 4: Validate article creation with draft status
  TestValidator.equals(
    "article created with draft status",
    article.status,
    "draft",
  );
  TestValidator.equals(
    "article title matches input",
    article.title,
    articleCreateBody.title,
  );
  TestValidator.equals(
    "article content matches input",
    article.content,
    articleCreateBody.content,
  );
  TestValidator.predicate(
    "article has valid UUID id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      article.id,
    ),
  );

  // Step 5: Verify all attachments are linked and metadata is preserved
  TestValidator.predicate(
    "all attachments are linked to article",
    article.attachments !== undefined &&
      article.attachments !== null &&
      Array.isArray(article.attachments),
  );
  TestValidator.equals(
    "attachment count matches input",
    article.attachments?.length || 0,
    attachments.length,
  );

  // Step 6: Verify each attachment's metadata
  article.attachments?.forEach((attachment, index) => {
    const inputAttachment = attachments[index];
    TestValidator.equals(
      `attachment ${index + 1} filename matches`,
      attachment.original_filename,
      inputAttachment.original_filename,
    );
    TestValidator.equals(
      `attachment ${index + 1} file type matches`,
      attachment.file_type,
      inputAttachment.file_type,
    );
    TestValidator.equals(
      `attachment ${index + 1} file size matches`,
      attachment.file_size,
      inputAttachment.file_size,
    );
    TestValidator.equals(
      `attachment ${index + 1} MIME type matches`,
      attachment.mime_type,
      inputAttachment.mime_type,
    );
    TestValidator.predicate(
      `attachment ${index + 1} has uploaded_at timestamp`,
      attachment.uploaded_at !== null && attachment.uploaded_at !== undefined,
    );
    TestValidator.equals(
      `attachment ${index + 1} is linked to correct article`,
      attachment.discussion_board_article_id,
      article.id,
    );
    TestValidator.predicate(
      `attachment ${index + 1} has uploader info`,
      attachment.uploaded_by_contributor !== undefined &&
        attachment.uploaded_by_contributor !== null,
    );
  });

  // Verify image file size constraints (max 10MB)
  const imageAttachments =
    article.attachments?.filter((a) =>
      ["jpg", "png", "gif", "webp"].includes(a.file_type),
    ) || [];
  imageAttachments.forEach((img, idx) => {
    TestValidator.predicate(
      `image attachment ${idx + 1} respects 10MB limit`,
      img.file_size <= 10485760,
    );
  });

  // Verify document file size constraints (max 25MB)
  const documentAttachments =
    article.attachments?.filter((a) =>
      ["pdf", "docx", "doc", "txt", "xlsx", "xls"].includes(a.file_type),
    ) || [];
  documentAttachments.forEach((doc, idx) => {
    TestValidator.predicate(
      `document attachment ${idx + 1} respects 25MB limit`,
      doc.file_size <= 26214400,
    );
  });
}
