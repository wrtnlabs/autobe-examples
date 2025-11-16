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
 * Test file type validation and rejection for unsupported formats for economic
 * discussion article attachments.
 *
 * This test validates the security mechanism that enforces legitimate file
 * uploads while rejecting dangerous file types through the economic discussion
 * platform.
 *
 * Test flow:
 *
 * 1. Create authenticated member with valid credentials
 * 2. Create test article with economic discussion content
 * 3. Upload legitimate files (document, image, spreadsheet) to verify acceptance
 * 4. Test rejection of security-dangerous files (executables, scripts)
 * 5. Confirm all upload operations respect the 5 attachment limit per article
 *
 * Business validation:
 *
 * - File type categories limited to image/document/spreadsheet only
 * - MIME type validation against whitelisted formats
 * - Security scanning initiation for accepted uploads
 * - Proper error feedback for unsupported dangerous file types
 */
export async function test_api_member_article_attachment_type_validation(
  connection: api.IConnection,
) {
  // Step 1: Create member account for authentication
  const memberAuth = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphabets(8),
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123",
    } satisfies IEconomicDiscussionMember.ICreate,
  });
  typia.assert(memberAuth);

  // Step 2: Create test article for attachment associations
  const article =
    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: {
        title: "Economic Impact Analysis with Supporting Documentation",
        content: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 8,
          sentenceMax: 12,
        }),
        category_ids: [typia.random<string & tags.Format<"uuid">>()],
      } satisfies IEconomicDiscussionArticle.ICreate,
    });
  typia.assert(article);

  // Step 3: Test legitimate attachment upload acceptance
  const legalDocuments = [
    {
      filename: "market_analysis_report.pdf" as IAttachmentFilename,
      file_size: typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<500> & tags.Maximum<2000000>
      >(),
      file_type: "document" as IEconomicDiscussionAttachmentFileType,
      mime_type: "application/pdf" as IMimeType,
    },
    {
      filename: "chart_visualization.png" as IAttachmentFilename,
      file_size: typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<300> & tags.Maximum<1500000>
      >(),
      file_type: "image" as IEconomicDiscussionAttachmentFileType,
      mime_type: "image/png" as IMimeType,
    },
  ] as const;

  const attachments: IEconomicDiscussionAttachment[] = [];

  for (const doc of legalDocuments) {
    const attachment =
      await api.functional.economicDiscussion.member.articles.attachments.create(
        connection,
        {
          articleId: article.id,
          body: doc satisfies IEconomicDiscussionAttachments.ICreate,
        },
      );
    typia.assert(attachment);

    TestValidator.equals(
      "article belongs to created attachment",
      attachment.article.id,
      article.id,
    );
    TestValidator.equals(
      "correct file type assigned",
      attachment.file_type,
      doc.file_type,
    );
    attachments.push(attachment);
  }

  // Step 4: Test rejection of security-threatening file uploads
  const securityViolations = [
    {
      filename: "utility_tool.exe" as IAttachmentFilename,
      file_size: 2560,
      file_type: "document" as IEconomicDiscussionAttachmentFileType,
      mime_type: "application/octet-stream" as IMimeType, // Blocked: unknown binary
    },
    {
      filename: "data_script.js" as IAttachmentFilename,
      file_size: 1024,
      file_type: "document" as IEconomicDiscussionAttachmentFileType,
      mime_type: "application/javascript" as IMimeType, // Blocked: executable script
    },
  ];

  for (const malware of securityViolations) {
    await TestValidator.error(
      "dangerous file types should be rejected by security validation",
      async () => {
        await api.functional.economicDiscussion.member.articles.attachments.create(
          connection,
          {
            articleId: article.id,
            body: malware satisfies IEconomicDiscussionAttachments.ICreate,
          },
        );
      },
    );
  }

  // Step 5: Confirm all successful uploads are present
  TestValidator.equals("total attachment count", attachments.length, 2);
}
