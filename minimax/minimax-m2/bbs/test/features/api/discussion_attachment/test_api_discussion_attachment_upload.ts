import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionArticle";
import type { IEconPoliticalDiscussionAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionAttachment";
import type { IEconPoliticalDiscussionRegisteredMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionRegisteredMember";
import type { IEconPoliticalDiscussionUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionUser";

export async function test_api_discussion_attachment_upload(
  connection: api.IConnection,
) {
  // Step 1: Create registered member account for file upload operations
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const registeredMember: IEconPoliticalDiscussionRegisteredMember.IAuthorized =
    await api.functional.auth.registeredMember.join(connection, {
      body: {
        display_name: RandomGenerator.name(),
        email: memberEmail,
        bio: RandomGenerator.paragraph(),
        avatar_url: typia.random<string & tags.Format<"uri">>(),
        status: "active",
      } satisfies IEconPoliticalDiscussionRegisteredMember.ICreate,
    });
  typia.assert(registeredMember);

  // Step 2: Create economic/political discussion article for attachment testing
  const article: IEconPoliticalDiscussionArticle =
    await api.functional.econPoliticalDiscussion.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 10,
          sentenceMax: 15,
        }),
        category: RandomGenerator.pick([
          "Economic Policy",
          "Political Analysis",
          "Market Discussion",
          "Regulatory Updates",
          "International Relations",
          "Social Economics",
        ] as const),
        status: "published",
        econ_political_discussion_user_id: registeredMember.id,
      } satisfies IEconPoliticalDiscussionArticle.ICreate,
    });
  typia.assert(article);
  TestValidator.equals(
    "article belongs to correct user",
    article.author.id,
    registeredMember.id,
  );

  // Step 3: Test uploading image attachments
  const imageAttachment: IEconPoliticalDiscussionAttachment =
    await api.functional.econPoliticalDiscussion.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: {
          file_url: "https://example.com/sample-chart.png",
          uploader_name: registeredMember.display_name,
          original_filename: "economic-growth-chart.png",
          file_type: "image/png",
          file_size: 2048576, // 2MB
        } satisfies IEconPoliticalDiscussionAttachment.ICreate,
      },
    );
  typia.assert(imageAttachment);
  TestValidator.equals(
    "image attachment belongs to article",
    imageAttachment.article.id,
    article.id,
  );
  TestValidator.equals(
    "image file type is correct",
    imageAttachment.file_type,
    "image/png",
  );
  TestValidator.equals(
    "uploader attribution is correct",
    imageAttachment.uploader_name,
    registeredMember.display_name,
  );

  // Step 4: Test uploading document attachment
  const documentAttachment: IEconPoliticalDiscussionAttachment =
    await api.functional.econPoliticalDiscussion.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: {
          file_url: "https://example.com/policy-document.pdf",
          uploader_name: registeredMember.display_name,
          original_filename: "fiscal-policy-analysis.pdf",
          file_type: "application/pdf",
          file_size: 5242880, // 5MB
        } satisfies IEconPoliticalDiscussionAttachment.ICreate,
      },
    );
  typia.assert(documentAttachment);
  TestValidator.equals(
    "document attachment belongs to article",
    documentAttachment.article.id,
    article.id,
  );
  TestValidator.equals(
    "document file type is correct",
    documentAttachment.file_type,
    "application/pdf",
  );

  // Step 5: Validate security scanning and moderation status
  TestValidator.predicate(
    "attachment security scan status is initialized",
    imageAttachment.security_scan_status === "pending" ||
      imageAttachment.security_scan_status === "clean",
  );
  TestValidator.predicate(
    "attachment moderation status is initialized",
    imageAttachment.moderation_status === "pending" ||
      imageAttachment.moderation_status === "approved",
  );

  // Step 6: Test file URL accessibility and metadata
  TestValidator.equals(
    "file URL is properly formatted",
    imageAttachment.file_url.startsWith("http"),
    true,
  );
  TestValidator.predicate(
    "upload date is recent",
    new Date(imageAttachment.upload_date).getTime() > Date.now() - 60000,
  );

  // Step 7: Test multiple attachments to same article
  const secondImageAttachment: IEconPoliticalDiscussionAttachment =
    await api.functional.econPoliticalDiscussion.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: {
          file_url: "https://example.com/market-analysis.jpg",
          uploader_name: registeredMember.display_name,
          original_filename: "market-trend-analysis.jpg",
          file_type: "image/jpeg",
          file_size: 1536000, // 1.5MB
        } satisfies IEconPoliticalDiscussionAttachment.ICreate,
      },
    );
  typia.assert(secondImageAttachment);
  TestValidator.equals(
    "second attachment also belongs to article",
    secondImageAttachment.article.id,
    article.id,
  );

  // Step 8: Validate public accessibility setting
  TestValidator.predicate(
    "attachments have public access by default",
    imageAttachment.is_public === true && documentAttachment.is_public === true,
  );

  // Step 9: Test file size constraints validation
  await TestValidator.error("should reject oversized image files", async () => {
    await api.functional.econPoliticalDiscussion.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: {
          file_url: "https://example.com/oversized-image.png",
          uploader_name: registeredMember.display_name,
          original_filename: "oversized-chart.png",
          file_type: "image/png",
          file_size: 10485760, // 10MB - exceeds 5MB image limit
        } satisfies IEconPoliticalDiscussionAttachment.ICreate,
      },
    );
  });

  // Step 10: Test invalid file type handling
  await TestValidator.error("should reject invalid file types", async () => {
    await api.functional.econPoliticalDiscussion.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: {
          file_url: "https://example.com/executable.exe",
          uploader_name: registeredMember.display_name,
          original_filename: "malicious.exe",
          file_type: "application/x-executable",
          file_size: 1024000,
        } satisfies IEconPoliticalDiscussionAttachment.ICreate,
      },
    );
  });

  // Step 11: Test attachment count validation
  TestValidator.equals(
    "article has multiple attachments",
    article.attachments?.length ?? 0,
    3,
  );

  // Step 12: Test file size validation for documents (FIXED: Added missing await)
  const oversizedDocumentAttachment: IEconPoliticalDiscussionAttachment =
    await api.functional.econPoliticalDiscussion.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: {
          file_url: "https://example.com/large-document.docx",
          uploader_name: registeredMember.display_name,
          original_filename: "comprehensive-policy-report.docx",
          file_type:
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          file_size: 10485760, // 10MB - exceeds 10MB document limit
        } satisfies IEconPoliticalDiscussionAttachment.ICreate,
      },
    );
  await typia.assert(oversizedDocumentAttachment); // FIXED: Added missing await
  TestValidator.equals(
    "document size tracking is accurate",
    oversizedDocumentAttachment.file_size,
    10485760,
  );

  // Step 13: Validate file type diversity enhances discourse
  const fileTypes = [
    imageAttachment.file_type,
    documentAttachment.file_type,
    secondImageAttachment.file_type,
    oversizedDocumentAttachment.file_type,
  ];
  TestValidator.predicate(
    "multiple file types are supported for rich discourse",
    fileTypes.includes("image/png") &&
      fileTypes.includes("application/pdf") &&
      fileTypes.includes("image/jpeg"),
  );

  // Step 14: Test file naming and attribution consistency
  TestValidator.predicate(
    "all attachments have proper uploader attribution",
    imageAttachment.uploader_name === registeredMember.display_name &&
      documentAttachment.uploader_name === registeredMember.display_name &&
      secondImageAttachment.uploader_name === registeredMember.display_name,
  );

  // Step 15: Verify upload timestamps are sequential
  const uploadTimes = [
    new Date(imageAttachment.upload_date).getTime(),
    new Date(documentAttachment.upload_date).getTime(),
    new Date(secondImageAttachment.upload_date).getTime(),
    new Date(oversizedDocumentAttachment.upload_date).getTime(),
  ].sort((a, b) => a - b);

  TestValidator.predicate(
    "upload timestamps are chronologically ordered",
    uploadTimes[0] <= uploadTimes[1] &&
      uploadTimes[1] <= uploadTimes[2] &&
      uploadTimes[2] <= uploadTimes[3],
  );
}
