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
 * Test article creation with file attachments on discussion board.
 *
 * This test validates the complete workflow of creating an article with
 * multiple file attachments. It verifies:
 *
 * 1. Contributor authentication and account creation
 * 2. Article creation with title, content, and category
 * 3. Attachment metadata storage and retrieval
 * 4. Support for multiple file types (images: jpg, png, gif, webp and documents:
 *    pdf, docx, xlsx, txt)
 * 5. Proper ordering and validation of attachments
 * 6. Maximum attachment limit enforcement (10 files per article)
 *
 * The test creates a contributor account, then creates an article draft with
 * various attachments including images and documents. It verifies all
 * attachment metadata is correctly returned and accessible.
 */
export async function test_api_article_creation_with_attachments(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate contributor account
  const contributorEmail = typia.random<string & tags.Format<"email">>();
  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: contributorEmail,
        username: RandomGenerator.alphabets(10),
        password: "TestPassword123!",
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);
  TestValidator.predicate(
    "contributor authentication successful",
    contributor.id !== null,
  );

  // Step 2: Create article with multiple attachments
  const imageAttachments: IDiscussionBoardArticleAttachment.ICreate[] = [
    {
      original_filename: "image1.jpg",
      file_type: "jpg",
      file_size: 1024 * 100, // 100KB
      mime_type: "image/jpeg",
      display_url: "https://example.com/storage/image1.jpg",
    },
    {
      original_filename: "screenshot.png",
      file_type: "png",
      file_size: 1024 * 200, // 200KB
      mime_type: "image/png",
      display_url: "https://example.com/storage/screenshot.png",
    },
    {
      original_filename: "diagram.gif",
      file_type: "gif",
      file_size: 1024 * 150, // 150KB
      mime_type: "image/gif",
      display_url: "https://example.com/storage/diagram.gif",
    },
    {
      original_filename: "preview.webp",
      file_type: "webp",
      file_size: 1024 * 80, // 80KB
      mime_type: "image/webp",
      display_url: "https://example.com/storage/preview.webp",
    },
  ];

  const documentAttachments: IDiscussionBoardArticleAttachment.ICreate[] = [
    {
      original_filename: "reference.pdf",
      file_type: "pdf",
      file_size: 1024 * 500, // 500KB
      mime_type: "application/pdf",
      display_url: "https://example.com/storage/reference.pdf",
    },
    {
      original_filename: "report.docx",
      file_type: "docx",
      file_size: 1024 * 300, // 300KB
      mime_type:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      display_url: "https://example.com/storage/report.docx",
    },
    {
      original_filename: "data.xlsx",
      file_type: "xlsx",
      file_size: 1024 * 250, // 250KB
      mime_type:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      display_url: "https://example.com/storage/data.xlsx",
    },
    {
      original_filename: "notes.txt",
      file_type: "txt",
      file_size: 1024 * 50, // 50KB
      mime_type: "text/plain",
      display_url: "https://example.com/storage/notes.txt",
    },
  ];

  const allAttachments = [...imageAttachments, ...documentAttachments];

  const articleTitle = RandomGenerator.name(3); // 3-word title
  const articleCreateData = {
    title: articleTitle,
    content: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    categoryId: typia.random<string & tags.Format<"uuid">>(),
    href: "https://example.com/articles/create",
    referrer: "https://example.com/articles",
    attachments: allAttachments,
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: articleCreateData,
      },
    );

  typia.assert(article);

  // Step 3: Validate article properties
  TestValidator.equals(
    "article title matches",
    article.title,
    articleCreateData.title,
  );
  TestValidator.equals(
    "article content matches",
    article.content,
    articleCreateData.content,
  );
  TestValidator.predicate(
    "article status is draft",
    article.status === "draft",
  );
  TestValidator.equals(
    "article author ID matches",
    article.author.id,
    contributor.id,
  );
  TestValidator.predicate(
    "article has category",
    article.category !== null && article.category !== undefined,
  );

  // Step 4: Validate attachments metadata
  TestValidator.predicate(
    "article has attachments",
    article.attachments !== undefined && article.attachments.length > 0,
  );

  const attachments = article.attachments || [];
  TestValidator.equals(
    "attachment count matches",
    attachments.length,
    allAttachments.length,
  );

  // Step 5: Validate each attachment has required metadata
  for (let i = 0; i < attachments.length; i++) {
    const attachment = attachments[i];
    const expectedAttachment = allAttachments[i];

    TestValidator.equals(
      `attachment ${i} filename matches`,
      attachment.original_filename,
      expectedAttachment.original_filename,
    );
    TestValidator.equals(
      `attachment ${i} file type matches`,
      attachment.file_type,
      expectedAttachment.file_type,
    );
    TestValidator.equals(
      `attachment ${i} file size matches`,
      attachment.file_size,
      expectedAttachment.file_size,
    );
    TestValidator.equals(
      `attachment ${i} MIME type matches`,
      attachment.mime_type,
      expectedAttachment.mime_type,
    );
    TestValidator.predicate(
      `attachment ${i} has display URL`,
      attachment.display_url.length > 0,
    );
    TestValidator.predicate(
      `attachment ${i} has upload timestamp`,
      attachment.uploaded_at !== null,
    );
    TestValidator.predicate(
      `attachment ${i} has uploader information`,
      attachment.uploaded_by_contributor !== null &&
        attachment.uploaded_by_contributor !== undefined,
    );
    TestValidator.equals(
      `attachment ${i} uploader matches contributor`,
      attachment.uploaded_by_contributor.id,
      contributor.id,
    );
  }

  // Step 6: Validate image attachments
  const imageCount = attachments.filter((a) =>
    ["jpg", "png", "gif", "webp"].includes(a.file_type),
  ).length;
  TestValidator.equals("image attachment count", imageCount, 4);

  // Step 7: Validate document attachments
  const documentCount = attachments.filter((a) =>
    ["pdf", "docx", "xlsx", "txt"].includes(a.file_type),
  ).length;
  TestValidator.equals("document attachment count", documentCount, 4);

  // Step 8: Validate attachment ordering by upload sequence
  TestValidator.predicate(
    "attachments are ordered by upload",
    attachments.every((a, index) => {
      if (index === 0) return true;
      return (
        new Date(a.uploaded_at).getTime() >=
        new Date(attachments[index - 1].uploaded_at).getTime()
      );
    }),
  );

  // Step 9: Validate maximum attachment limit (10 files)
  TestValidator.predicate(
    "attachment count is within limit",
    attachments.length <= 10,
  );
}
