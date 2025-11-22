import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEconPoliticalDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionArticle";
import type { IEconPoliticalDiscussionAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionAttachment";
import type { IEconPoliticalDiscussionUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionUser";

export async function test_api_article_attachment_upload_complete_workflow(
  connection: api.IConnection,
) {
  // Step 1: Create a discussion article with economic/political content
  const userId = typia.random<string & tags.Format<"uuid">>();
  const articleTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const articleContent = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 8,
    sentenceMax: 15,
    wordMin: 4,
    wordMax: 8,
  });

  const articleData = {
    title: articleTitle,
    content: articleContent,
    category: "Economic Policy",
    econ_political_discussion_user_id: userId,
    status: "published" as const,
  } satisfies IEconPoliticalDiscussionArticle.ICreate;

  const createdArticle =
    await api.functional.econPoliticalDiscussion.articles.create(connection, {
      body: articleData,
    });

  typia.assert(createdArticle);
  TestValidator.equals(
    "article creation successful",
    createdArticle.title,
    articleTitle,
  );
  TestValidator.equals(
    "article content preserved",
    createdArticle.content,
    articleContent,
  );
  TestValidator.equals(
    "article category assigned",
    createdArticle.category,
    "Economic Policy",
  );

  // Step 2: Upload image attachment (JPG format)
  const imageAttachmentData = {
    file_url: "https://example.com/sample-chart.jpg",
    uploader_name: "EconomistUser",
    original_filename: "economic-growth-chart.jpg",
    file_type: "image/jpeg",
    file_size: 2048576, // 2MB
  } satisfies IEconPoliticalDiscussionAttachment.ICreate;

  const imageAttachment =
    await api.functional.econPoliticalDiscussion.articles.attachments.create(
      connection,
      {
        articleId: createdArticle.id,
        body: imageAttachmentData,
      },
    );

  typia.assert(imageAttachment);
  TestValidator.equals(
    "image attachment article reference",
    imageAttachment.article.id,
    createdArticle.id,
  );
  TestValidator.equals(
    "image attachment file type",
    imageAttachment.file_type,
    "image/jpeg",
  );
  TestValidator.equals(
    "image attachment original filename",
    imageAttachment.original_filename,
    "economic-growth-chart.jpg",
  );

  // Step 3: Upload document attachment (PDF format)
  const pdfAttachmentData = {
    file_url: "https://example.com/fed-report.pdf",
    uploader_name: "PolicyAnalyst",
    original_filename: "Federal-Reserve-Report-Q4-2024.pdf",
    file_type: "application/pdf",
    file_size: 5242880, // 5MB
  } satisfies IEconPoliticalDiscussionAttachment.ICreate;

  const pdfAttachment =
    await api.functional.econPoliticalDiscussion.articles.attachments.create(
      connection,
      {
        articleId: createdArticle.id,
        body: pdfAttachmentData,
      },
    );

  typia.assert(pdfAttachment);
  TestValidator.equals(
    "PDF attachment article reference",
    pdfAttachment.article.id,
    createdArticle.id,
  );
  TestValidator.equals(
    "PDF attachment file type",
    pdfAttachment.file_type,
    "application/pdf",
  );
  TestValidator.equals(
    "PDF attachment uploader name",
    pdfAttachment.uploader_name,
    "PolicyAnalyst",
  );

  // Step 4: Upload text document attachment
  const textAttachmentData = {
    file_url: "https://example.com/market-analysis.txt",
    uploader_name: "MarketResearcher",
    original_filename: "Stock-Market-Analysis-2024.txt",
    file_type: "text/plain",
    file_size: 131072, // 128KB
  } satisfies IEconPoliticalDiscussionAttachment.ICreate;

  const textAttachment =
    await api.functional.econPoliticalDiscussion.articles.attachments.create(
      connection,
      {
        articleId: createdArticle.id,
        body: textAttachmentData,
      },
    );

  typia.assert(textAttachment);
  TestValidator.equals(
    "text attachment article reference",
    textAttachment.article.id,
    createdArticle.id,
  );
  TestValidator.equals(
    "text attachment file type",
    textAttachment.file_type,
    "text/plain",
  );
  TestValidator.equals(
    "text attachment file size",
    textAttachment.file_size,
    131072,
  );

  // Step 5: Upload PNG image attachment
  const pngAttachmentData = {
    file_url: "https://example.com/inflation-graph.png",
    uploader_name: "DataVisualizer",
    original_filename: "Inflation-Rate-Graph.png",
    file_type: "image/png",
    file_size: 1572864, // 1.5MB
  } satisfies IEconPoliticalDiscussionAttachment.ICreate;

  const pngAttachment =
    await api.functional.econPoliticalDiscussion.articles.attachments.create(
      connection,
      {
        articleId: createdArticle.id,
        body: pngAttachmentData,
      },
    );

  typia.assert(pngAttachment);
  TestValidator.equals(
    "PNG attachment article reference",
    pngAttachment.article.id,
    createdArticle.id,
  );
  TestValidator.equals(
    "PNG attachment file type",
    pngAttachment.file_type,
    "image/png",
  );
  TestValidator.equals(
    "PNG attachment upload date present",
    pngAttachment.upload_date !== null &&
      pngAttachment.upload_date !== undefined,
    true,
  );

  // Step 6: Validate security scanning and moderation statuses
  const attachments = [
    imageAttachment,
    pdfAttachment,
    textAttachment,
    pngAttachment,
  ];

  for (const attachment of attachments) {
    TestValidator.equals(
      "security scan status present",
      attachment.security_scan_status !== null &&
        attachment.security_scan_status !== undefined,
      true,
    );
    TestValidator.equals(
      "moderation status present",
      attachment.moderation_status !== null &&
        attachment.moderation_status !== undefined,
      true,
    );
    TestValidator.equals(
      "file URL is valid URI",
      attachment.file_url.startsWith("http"),
      true,
    );
    TestValidator.equals(
      "uploader name present",
      attachment.uploader_name.length > 0,
      true,
    );
    TestValidator.equals(
      "file size is positive",
      attachment.file_size > 0,
      true,
    );
    TestValidator.equals(
      "is public flag present",
      attachment.is_public !== null && attachment.is_public !== undefined,
      true,
    );
  }

  // Step 7: Verify all attachments are properly associated with the article
  TestValidator.equals(
    "all attachments reference same article",
    attachments.every((att) => att.article.id === createdArticle.id),
    true,
  );

  // Step 8: Test file type diversity
  const fileTypes = attachments.map((att) => att.file_type);
  TestValidator.equals(
    "mixed file types uploaded",
    fileTypes.includes("image/jpeg") &&
      fileTypes.includes("application/pdf") &&
      fileTypes.includes("text/plain") &&
      fileTypes.includes("image/png"),
    true,
  );

  // Step 9: Validate file size ranges are appropriate
  const fileSizes = attachments.map((att) => att.file_size);
  const totalSize = fileSizes.reduce((sum, size) => sum + size, 0);
  TestValidator.equals(
    "total attachment size reasonable",
    totalSize > 0 && totalSize < 10485760,
    true,
  ); // Under 10MB total

  // Step 10: Confirm upload timestamps are recent and consistent
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  for (const attachment of attachments) {
    const uploadTime = new Date(attachment.upload_date);
    TestValidator.equals(
      "upload timestamp is recent",
      uploadTime >= oneHourAgo && uploadTime <= now,
      true,
    );
  }

  // Final validation: Complete workflow success
  TestValidator.equals(
    "workflow completed successfully",
    attachments.length === 4 &&
      createdArticle.id !== null &&
      createdArticle.id !== undefined,
    true,
  );
}
