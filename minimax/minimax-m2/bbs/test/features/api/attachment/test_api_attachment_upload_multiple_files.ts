import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionArticle";
import type { IEconPoliticalDiscussionAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionAttachment";
import type { IEconPoliticalDiscussionRegisteredMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionRegisteredMember";
import type { IEconPoliticalDiscussionUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionUser";

export async function test_api_attachment_upload_multiple_files(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated user account for testing
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const userDisplayName: string = RandomGenerator.name();

  const user: IEconPoliticalDiscussionRegisteredMember.IAuthorized =
    await api.functional.auth.registeredMember.join(connection, {
      body: {
        display_name: userDisplayName,
        email: userEmail,
        bio: "Economic policy analyst interested in discussion board participation",
        avatar_url: typia.random<string & tags.Format<"uri">>(),
        status: "active",
      } satisfies IEconPoliticalDiscussionRegisteredMember.ICreate,
    });
  typia.assert(user);

  // Step 2: Create discussion article to receive multiple attachments
  const articleTitle: string = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 8,
  });

  const articleContent: string = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 8,
    sentenceMax: 15,
    wordMin: 4,
    wordMax: 8,
  });

  const article: IEconPoliticalDiscussionArticle =
    await api.functional.econPoliticalDiscussion.articles.create(connection, {
      body: {
        title: articleTitle,
        content: articleContent,
        category: "Economic Policy",
        status: "published",
        econ_political_discussion_user_id: user.id,
      } satisfies IEconPoliticalDiscussionArticle.ICreate,
    });
  typia.assert(article);

  // Step 3: Generate multiple realistic attachments for testing
  const attachment1: IEconPoliticalDiscussionAttachment.ICreate = {
    file_url: "https://example.com/attachments/economic-chart-2024.png",
    uploader_name: userDisplayName,
    original_filename: "economic-growth-chart-2024.png",
    file_type: "image/png",
    file_size: 245760, // 240KB
  };

  const attachment2: IEconPoliticalDiscussionAttachment.ICreate = {
    file_url: "https://example.com/attachments/monetary-policy-report.pdf",
    uploader_name: userDisplayName,
    original_filename: "fed-monetary-policy-report-q1-2024.pdf",
    file_type: "application/pdf",
    file_size: 1024000, // 1MB
  };

  const attachment3: IEconPoliticalDiscussionAttachment.ICreate = {
    file_url: "https://example.com/attachments/trade-analysis.xlsx",
    uploader_name: userDisplayName,
    original_filename: "international-trade-analysis-2024.xlsx",
    file_type:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    file_size: 512000, // 500KB
  };

  const attachment4: IEconPoliticalDiscussionAttachment.ICreate = {
    file_url: "https://example.com/attachments/crypto-market-report.docx",
    uploader_name: userDisplayName,
    original_filename: "cryptocurrency-market-analysis-2024.docx",
    file_type:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    file_size: 768000, // 750KB
  };

  // Step 4: Upload first attachment and validate
  const firstAttachment: IEconPoliticalDiscussionAttachment =
    await api.functional.econPoliticalDiscussion.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: attachment1,
      },
    );
  typia.assert(firstAttachment);

  TestValidator.equals(
    "first attachment article reference",
    firstAttachment.article.id,
    article.id,
  );
  TestValidator.equals(
    "first attachment filename",
    firstAttachment.original_filename,
    attachment1.original_filename,
  );
  TestValidator.equals(
    "first attachment file type",
    firstAttachment.file_type,
    attachment1.file_type,
  );

  // Step 5: Upload second attachment and validate
  const secondAttachment: IEconPoliticalDiscussionAttachment =
    await api.functional.econPoliticalDiscussion.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: attachment2,
      },
    );
  typia.assert(secondAttachment);

  TestValidator.equals(
    "second attachment article reference",
    secondAttachment.article.id,
    article.id,
  );
  TestValidator.equals(
    "second attachment filename",
    secondAttachment.original_filename,
    attachment2.original_filename,
  );
  TestValidator.equals(
    "second attachment uploader",
    secondAttachment.uploader_name,
    userDisplayName,
  );

  // Step 6: Upload third attachment and validate
  const thirdAttachment: IEconPoliticalDiscussionAttachment =
    await api.functional.econPoliticalDiscussion.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: attachment3,
      },
    );
  typia.assert(thirdAttachment);

  TestValidator.equals(
    "third attachment file size",
    thirdAttachment.file_size,
    attachment3.file_size,
  );
  TestValidator.equals(
    "third attachment uploader name",
    thirdAttachment.uploader_name,
    userDisplayName,
  );

  // Step 7: Upload fourth attachment and validate
  const fourthAttachment: IEconPoliticalDiscussionAttachment =
    await api.functional.econPoliticalDiscussion.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: attachment4,
      },
    );
  typia.assert(fourthAttachment);

  TestValidator.equals(
    "fourth attachment file type",
    fourthAttachment.file_type,
    attachment4.file_type,
  );
  TestValidator.equals(
    "fourth attachment uploader matches user",
    fourthAttachment.uploader_name,
    userDisplayName,
  );

  // Step 8: Validate upload timestamps are recent and valid
  const uploadTime1 = new Date(firstAttachment.upload_date);
  const uploadTime2 = new Date(secondAttachment.upload_date);
  const uploadTime3 = new Date(thirdAttachment.upload_date);
  const uploadTime4 = new Date(fourthAttachment.upload_date);

  TestValidator.predicate(
    "all upload timestamps are valid dates",
    uploadTime1 instanceof Date &&
      uploadTime2 instanceof Date &&
      uploadTime3 instanceof Date &&
      uploadTime4 instanceof Date,
  );

  TestValidator.predicate(
    "all upload timestamps are recent (within last 5 minutes)",
    Date.now() - uploadTime1.getTime() < 300000 &&
      Date.now() - uploadTime2.getTime() < 300000 &&
      Date.now() - uploadTime3.getTime() < 300000 &&
      Date.now() - uploadTime4.getTime() < 300000,
  );

  // Step 9: Validate attachment security scan and moderation status
  TestValidator.predicate(
    "first attachment has valid security scan status",
    firstAttachment.security_scan_status === "pending" ||
      firstAttachment.security_scan_status === "clean" ||
      firstAttachment.security_scan_status === "flagged" ||
      firstAttachment.security_scan_status === "quarantined",
  );

  TestValidator.predicate(
    "second attachment has valid moderation status",
    secondAttachment.moderation_status === "pending" ||
      secondAttachment.moderation_status === "approved" ||
      secondAttachment.moderation_status === "rejected" ||
      secondAttachment.moderation_status === "requires_review",
  );

  // Step 10: Validate all attachments have proper public access settings
  TestValidator.predicate(
    "all attachments have boolean is_public setting",
    typeof firstAttachment.is_public === "boolean" &&
      typeof secondAttachment.is_public === "boolean" &&
      typeof thirdAttachment.is_public === "boolean" &&
      typeof fourthAttachment.is_public === "boolean",
  );

  // Step 11: Validate attachment URLs are properly formatted
  TestValidator.predicate(
    "all attachment URLs are valid URIs",
    firstAttachment.file_url.startsWith("http") &&
      secondAttachment.file_url.startsWith("http") &&
      thirdAttachment.file_url.startsWith("http") &&
      fourthAttachment.file_url.startsWith("http"),
  );

  // Step 12: Test file type diversity for economic/political content
  const fileTypes = [
    firstAttachment.file_type,
    secondAttachment.file_type,
    thirdAttachment.file_type,
    fourthAttachment.file_type,
  ];

  TestValidator.predicate(
    "attachments include diverse file types (images, documents, spreadsheets)",
    fileTypes.includes("image/png") &&
      fileTypes.includes("application/pdf") &&
      (fileTypes.includes(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ) ||
        fileTypes.includes("application/vnd.ms-excel")) &&
      (fileTypes.includes(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ) ||
        fileTypes.includes("application/msword")),
  );

  // Step 13: Validate file sizes are within reasonable limits for economic data
  TestValidator.predicate(
    "all file sizes are within reasonable limits (not extremely large)",
    firstAttachment.file_size > 0 &&
      firstAttachment.file_size < 10 * 1024 * 1024 && // Less than 10MB
      secondAttachment.file_size > 0 &&
      secondAttachment.file_size < 10 * 1024 * 1024 &&
      thirdAttachment.file_size > 0 &&
      thirdAttachment.file_size < 10 * 1024 * 1024 &&
      fourthAttachment.file_size > 0 &&
      fourthAttachment.file_size < 10 * 1024 * 1024,
  );

  // Step 14: Test concurrent upload scenario by verifying unique IDs
  const attachmentIds = [
    firstAttachment.id,
    secondAttachment.id,
    thirdAttachment.id,
    fourthAttachment.id,
  ];

  TestValidator.predicate(
    "all attachments have unique identifiers",
    new Set(attachmentIds).size === attachmentIds.length,
  );

  // Step 15: Validate that all attachments reference the same article
  const articleIds = [
    firstAttachment.article.id,
    secondAttachment.article.id,
    thirdAttachment.article.id,
    fourthAttachment.article.id,
  ];

  TestValidator.predicate(
    "all attachments are associated with the same target article",
    articleIds.every((id) => id === article.id),
  );

  // Step 16: Test business logic validation - ensure multiple uploads to same article work correctly
  TestValidator.predicate(
    "multiple attachments can be successfully uploaded to single article",
    firstAttachment.id !== secondAttachment.id &&
      secondAttachment.id !== thirdAttachment.id &&
      thirdAttachment.id !== fourthAttachment.id &&
      firstAttachment.id !== thirdAttachment.id &&
      firstAttachment.id !== fourthAttachment.id &&
      secondAttachment.id !== fourthAttachment.id,
  );

  // Step 17: Validate upload process completion for economic/political discussion context
  TestValidator.equals(
    "user display name matches across all uploads",
    userDisplayName,
    firstAttachment.uploader_name,
  );

  TestValidator.equals(
    "uploader consistency across attachments",
    userDisplayName,
    secondAttachment.uploader_name,
  );

  TestValidator.equals(
    "upload attribution accuracy",
    userDisplayName,
    thirdAttachment.uploader_name,
  );

  TestValidator.equals(
    "final attachment attribution",
    userDisplayName,
    fourthAttachment.uploader_name,
  );
}
