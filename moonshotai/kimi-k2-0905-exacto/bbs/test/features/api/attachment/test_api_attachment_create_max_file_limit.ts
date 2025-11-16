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
 * Test attachment creation at maximum file size limits.
 *
 * This test validates the system's ability to handle boundary conditions by
 * creating a file attachment at the maximum allowed size. It ensures the
 * platform can process large files without errors, which is crucial for
 * economic discussions that may include comprehensive research reports,
 * detailed datasets, or extensive analysis documents.
 */
export async function test_api_attachment_create_max_file_limit(
  connection: api.IConnection,
) {
  // 1. Register new member account for authentication
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphabets(10),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(12) + "123456",
    } satisfies IEconomicDiscussionMember.ICreate,
  });
  typia.assert(member);

  // 2. Create economic discussion article for attachment
  const article =
    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: {
        title: "Economic Analysis of Market Trends",
        content: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 10,
          sentenceMax: 15,
        }),
        category_ids: [
          typia.random<string & tags.Format<"uuid">>(),
          typia.random<string & tags.Format<"uuid">>(),
        ],
      } satisfies IEconomicDiscussionArticle.ICreate,
    });
  typia.assert(article);

  // 3. Create attachment with maximum file size (10MB = 10485760 bytes)
  const maxFileSize = 10485760; // 10MB = 10485760 bytes
  const attachment =
    await api.functional.economicDiscussion.member.articles.attachmentFiles.create(
      connection,
      {
        articleId: article.id,
        body: {
          filename: "research_report_max_size.pdf",
          file_size: maxFileSize satisfies number as number,
          file_type: "document" as IFileType,
          mime_type: "application/pdf",
        } satisfies IEconomicDiscussionAttachment.ICreate,
      },
    );
  typia.assert(attachment);

  // 4. Validate attachment was created successfully
  TestValidator.equals(
    "attachment matches article",
    attachment.article.id,
    article.id,
  );
  TestValidator.equals(
    "filename preserved",
    attachment.filename,
    "research_report_max_size.pdf",
  );
  TestValidator.equals(
    "file size matches input",
    attachment.file_size,
    maxFileSize,
  );
  TestValidator.equals("file type correct", attachment.file_type, "document");
  TestValidator.equals(
    "mime type correct",
    attachment.mime_type,
    "application/pdf",
  );
}
