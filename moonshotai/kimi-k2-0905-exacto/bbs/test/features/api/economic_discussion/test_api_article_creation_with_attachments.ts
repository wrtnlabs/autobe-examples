import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticle";
import type { IEconomicDiscussionAttachmentFileType } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAttachmentFileType";
import type { IEconomicDiscussionAttachments } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAttachments";
import type { IEconomicDiscussionCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategories";
import type { IEconomicDiscussionMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMember";
import type { IEconomicDiscussionMembers } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMembers";
import type { IEconomicDiscussionModerators } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerators";

/**
 * Test article creation with file attachments supporting economic analysis
 * discussions.
 *
 * This test validates the complete workflow for members to create economic
 * discussion articles with supporting file attachments. It covers:
 *
 * 1. Member registration and authentication setup
 * 2. Article creation with comprehensive content and metadata
 * 3. Multiple attachment types (images, documents, spreadsheets) supporting
 *    economic arguments
 * 4. Category assignment for content organization
 * 5. Validation of article structure and attachment relationships
 *
 * The test ensures members can upload various file types during article
 * creation to support their economic and political arguments with concrete data
 * and evidence.
 */
export async function test_api_article_creation_with_attachments(
  connection: api.IConnection,
) {
  // Step 1: Register as a new member to establish authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberData = {
    username: RandomGenerator.name(),
    email: memberEmail,
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IEconomicDiscussionMember.ICreate;

  const authorizedMember = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(authorizedMember);

  // Step 2: Generate diverse attachment types for economic analysis
  const imageAttachment = {
    file_size: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1000> & tags.Maximum<500000>
    >(),
    file_type: "image" as IEconomicDiscussionAttachmentFileType,
    filename: `economic_chart_${RandomGenerator.alphaNumeric(8)}.png`,
    mime_type: "image/png",
  } satisfies IEconomicDiscussionAttachments.ICreate;

  const documentAttachment = {
    file_size: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<5000> & tags.Maximum<2000000>
    >(),
    file_type: "document" as IEconomicDiscussionAttachmentFileType,
    filename: `policy_analysis_${RandomGenerator.alphaNumeric(8)}.pdf`,
    mime_type: "application/pdf",
  } satisfies IEconomicDiscussionAttachments.ICreate;

  const spreadsheetAttachment = {
    file_size: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<10000> & tags.Maximum<3000000>
    >(),
    file_type: "spreadsheet" as IEconomicDiscussionAttachmentFileType,
    filename: `economic_data_${RandomGenerator.alphaNumeric(8)}.xlsx`,
    mime_type:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  } satisfies IEconomicDiscussionAttachments.ICreate;

  // Step 3: Create article with comprehensive content and attachments
  const articleData = {
    title: RandomGenerator.name(4),
    content: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 15,
      sentenceMax: 25,
      wordMin: 4,
      wordMax: 8,
    }),
    category_ids: ArrayUtil.repeat(2, () =>
      typia.random<string & tags.Format<"uuid">>(),
    ),
    attachments: [imageAttachment, documentAttachment, spreadsheetAttachment],
  } satisfies IEconomicDiscussionArticle.ICreate;

  const createdArticle =
    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: articleData,
    });
  typia.assert(createdArticle);

  // Step 4: Validate article structure and relationships
  TestValidator.equals(
    "article title matches",
    createdArticle.title,
    articleData.title,
  );
  TestValidator.equals(
    "article content matches",
    createdArticle.content,
    articleData.content,
  );
  TestValidator.predicate(
    "article has positive view count",
    createdArticle.view_count >= 0,
  );
  TestValidator.equals("article version is 1.0", createdArticle.version, 1);
  TestValidator.equals(
    "article status is pending",
    createdArticle.status,
    "pending",
  );
  TestValidator.predicate(
    "article has created timestamp",
    createdArticle.created_at !== null,
  );
  TestValidator.predicate(
    "article has updated timestamp",
    createdArticle.updated_at !== null,
  );
  TestValidator.predicate(
    "categories are assigned",
    createdArticle.categories.length > 0,
  );

  // Step 5: Verify author attribution
  TestValidator.equals(
    "member author ID matches",
    createdArticle.member_author,
    authorizedMember.member.id,
  );
  TestValidator.equals(
    "member author profile matches",
    createdArticle.member_author_profile?.id,
    authorizedMember.member.id,
  );
  TestValidator.equals(
    "member author username matches",
    createdArticle.member_author_profile?.username,
    authorizedMember.member.username,
  );

  // Step 6: Validate attachment integration
  TestValidator.predicate(
    "attachments array exists",
    Array.isArray(articleData.attachments),
  );
  TestValidator.equals(
    "attachment count matches",
    articleData.attachments?.length,
    3,
  );

  // Validate each attachment type
  articleData.attachments?.forEach((attachment, index) => {
    TestValidator.predicate(
      `attachment ${index} has valid file size`,
      attachment.file_size > 0,
    );
    TestValidator.predicate(
      `attachment ${index} has valid filename`,
      attachment.filename.length > 0,
    );
    TestValidator.predicate(
      `attachment ${index} has valid MIME type`,
      attachment.mime_type.length > 0,
    );
    TestValidator.predicate(
      `attachment ${index} has recognized file type`,
      ["image", "document", "spreadsheet"].includes(attachment.file_type),
    );
  });

  // Step 7: Test attachment size limits (edge case validation)
  const maxSizeAttachment = {
    file_size: 10485760, // 10MB maximum
    file_type: "document" as IEconomicDiscussionAttachmentFileType,
    filename: "large_economic_report.pdf",
    mime_type: "application/pdf",
  } satisfies IEconomicDiscussionAttachments.ICreate;

  const articleWithLargeAttachment = {
    title: "Economic Analysis with Large Dataset",
    content: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 10,
      sentenceMax: 20,
    }),
    category_ids: [typia.random<string & tags.Format<"uuid">>()],
    attachments: [maxSizeAttachment],
  } satisfies IEconomicDiscussionArticle.ICreate;

  const articleWithLargeFile =
    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: articleWithLargeAttachment,
    });
  typia.assert(articleWithLargeFile);

  TestValidator.equals(
    "large attachment article created successfully",
    articleWithLargeFile.title,
    articleWithLargeAttachment.title,
  );
  TestValidator.predicate(
    "large attachment handled correctly",
    articleWithLargeFile.categories.length > 0,
  );
}
