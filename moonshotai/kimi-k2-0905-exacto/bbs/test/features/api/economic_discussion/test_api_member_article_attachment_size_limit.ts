import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttachmentFilename } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttachmentFilename";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticle";
import type { IEconomicDiscussionAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAttachment";
import type { IEconomicDiscussionAttachmentFileType } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAttachmentFileType";
import type { IEconomicDiscussionAttachments } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAttachments";
import type { IEconomicDiscussionCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategories";
import type { IEconomicDiscussionMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMember";
import type { IEconomicDiscussionMembers } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMembers";
import type { IEconomicDiscussionModerators } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerators";
import type { IFileSize } from "@ORGANIZATION/PROJECT-api/lib/structures/IFileSize";
import type { IFileType } from "@ORGANIZATION/PROJECT-api/lib/structures/IFileType";
import type { IMimeType } from "@ORGANIZATION/PROJECT-api/lib/structures/IMimeType";

/**
 * Test file size validation by uploading oversized files to verify appropriate
 * rejection and size limit enforcement. Tests both image (5MB+) and document
 * (20MB+) size restrictions with appropriate error responses.
 */
export async function test_api_member_article_attachment_size_limit(
  connection: api.IConnection,
) {
  // 1. Register a new member account
  const memberAuth = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: RandomGenerator.name(2).replace(" ", "") + "@test.com",
      password: "password123",
    } satisfies IEconomicDiscussionMember.ICreate,
  });
  typia.assert(memberAuth);

  // 2. Create an article for testing attachment uploads
  const article =
    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: {
        title: "Testing File Size Limits",
        content:
          "This article tests the file upload size restrictions for different attachment types.",
        category_ids: [typia.random<string & tags.Format<"uuid">>()],
      } satisfies IEconomicDiscussionArticle.ICreate,
    });
  typia.assert(article);

  // 3. Test oversized image file (6MB - exceeding 5MB limit)
  await TestValidator.error("should reject oversized image file", async () => {
    await api.functional.economicDiscussion.member.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: {
          filename: "oversized-image.jpg" satisfies IAttachmentFilename,
          file_size: 6291456 satisfies IFileSize, // 6MB (exceeds 5MB limit)
          file_type: "image" satisfies IFileType,
          mime_type: "image/jpeg" satisfies IMimeType,
        } satisfies IEconomicDiscussionAttachment.ICreate,
      },
    );
  });

  // 4. Test oversized document file (25MB - exceeding 20MB limit)
  await TestValidator.error(
    "should reject oversized document file",
    async () => {
      await api.functional.economicDiscussion.member.articles.attachments.create(
        connection,
        {
          articleId: article.id,
          body: {
            filename: "oversized-document.pdf" satisfies IAttachmentFilename,
            file_size: 26214400 satisfies IFileSize, // 25MB (exceeds 20MB limit)
            file_type: "document" satisfies IFileType,
            mime_type: "application/pdf" satisfies IMimeType,
          } satisfies IEconomicDiscussionAttachment.ICreate,
        },
      );
    },
  );

  // 5. Test oversized spreadsheet file (25MB - exceeding 20MB limit)
  await TestValidator.error(
    "should reject oversized spreadsheet file",
    async () => {
      await api.functional.economicDiscussion.member.articles.attachments.create(
        connection,
        {
          articleId: article.id,
          body: {
            filename:
              "oversized-spreadsheet.xlsx" satisfies IAttachmentFilename,
            file_size: 26214400 satisfies IFileSize, // 25MB (exceeds 20MB limit)
            file_type: "spreadsheet" satisfies IFileType,
            mime_type:
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" satisfies IMimeType,
          } satisfies IEconomicDiscussionAttachment.ICreate,
        },
      );
    },
  );

  // 6. Test valid sized files should succeed
  const validImage =
    await api.functional.economicDiscussion.member.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: {
          filename: "valid-image.jpg" satisfies IAttachmentFilename,
          file_size: 4718592 satisfies IFileSize, // 4.5MB (within 5MB limit)
          file_type: "image" satisfies IFileType,
          mime_type: "image/jpeg" satisfies IMimeType,
        } satisfies IEconomicDiscussionAttachment.ICreate,
      },
    );
  typia.assert(validImage);

  const validDocument =
    await api.functional.economicDiscussion.member.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: {
          filename: "valid-document.pdf" satisfies IAttachmentFilename,
          file_size: 10485760 satisfies IFileSize, // 10MB (within 20MB limit)
          file_type: "document" satisfies IFileType,
          mime_type: "application/pdf" satisfies IMimeType,
        } satisfies IEconomicDiscussionAttachment.ICreate,
      },
    );
  typia.assert(validDocument);

  // 7. Verify valid attachments are created successfully
  TestValidator.equals(
    "image attachment file size should be 4.5MB",
    validImage.file_size,
    4718592,
  );
  TestValidator.equals(
    "document attachment file size should be 10MB",
    validDocument.file_size,
    10485760,
  );
}
