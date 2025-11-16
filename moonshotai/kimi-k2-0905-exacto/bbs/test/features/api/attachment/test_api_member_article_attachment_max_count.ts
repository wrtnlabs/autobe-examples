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
 * Test limiting attachments to maximum 5 per article.
 *
 * This test validates the system's enforcement of the 5-attachment limit per
 * economic discussion article. It creates a complete workflow including member
 * registration, article creation, uploading exactly 5 attachments, and then
 * attempting to add a 6th attachment to verify the limit is properly enforced.
 * The test ensures that the system provides appropriate error response when the
 * maximum capacity is exceeded.
 *
 * 1. Register a new member account
 * 2. Create a new economic discussion article
 * 3. Upload 5 file attachments (reaching the maximum)
 * 4. Attempt to upload a 6th attachment to test limit enforcement
 * 5. Verify proper error handling when limit is exceeded
 */
export async function test_api_member_article_attachment_max_count(
  connection: api.IConnection,
) {
  // Register a new member
  const username = RandomGenerator.alphabets(12);
  const email = `test-${RandomGenerator.alphabets(8)}@example.com`;
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username,
      email,
      password: "strongPassword123",
    } satisfies IEconomicDiscussionMember.ICreate,
  });
  typia.assert(member);

  // Create a new economic discussion article
  const title = RandomGenerator.paragraph({ sentences: 3 });
  const content = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 15,
    sentenceMax: 25,
  });
  const fileTypes: IEconomicDiscussionAttachmentFileType[] = [
    "image",
    "document",
    "spreadsheet",
  ];
  const mimeTypes: IMimeType[] = [
    "image/jpeg",
    "image/png",
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ];

  const article =
    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: {
        title,
        content,
        category_ids: [typia.random<string & tags.Format<"uuid">>()],
        attachments: [],
      } satisfies IEconomicDiscussionArticle.ICreate,
    });
  typia.assert(article);

  // Upload exactly 5 attachments to reach the maximum limit
  const attachments: IEconomicDiscussionAttachment[] = [];

  for (let i = 0; i < 5; i++) {
    const fileName: IAttachmentFilename = `${RandomGenerator.alphabets(8)}_${i}.pdf`;
    const fileType = i < 3 ? fileTypes[1] : fileTypes[0]; // Mix of document and image types
    const mimeType = i < 3 ? mimeTypes[2] : mimeTypes[i % 2]; // PDF or imageMIME types

    const attachment =
      await api.functional.economicDiscussion.member.articles.attachments.create(
        connection,
        {
          articleId: article.id,
          body: {
            filename: fileName,
            file_size: 1024 * 1024 * (i + 1), // 1MB to 5MB incremental sizes
            file_type: fileType,
            mime_type: mimeType,
          } satisfies IEconomicDiscussionAttachment.ICreate,
        },
      );
    typia.assert(attachment);
    attachments.push(attachment);

    // Verify each attachment was created successfully
    TestValidator.equals(
      "attachment count after creation",
      attachments.length,
      i + 1,
    );
    TestValidator.equals("attachment filename", attachment.filename, fileName);
    TestValidator.equals(
      "attachment article ID",
      attachment.article.id,
      article.id,
    );
  }

  // Verify we have exactly 5 attachments
  TestValidator.equals(
    "total attachments before limit test",
    attachments.length,
    5,
  );

  // Attempt to upload a 6th attachment (should fail)
  await TestValidator.error(
    "6th attachment should fail - attachment limit reached",
    async () => {
      await api.functional.economicDiscussion.member.articles.attachments.create(
        connection,
        {
          articleId: article.id,
          body: {
            filename: "over_limit_test.pdf",
            file_size: 1024 * 1024,
            file_type: "document",
            mime_type: "application/pdf",
          } satisfies IEconomicDiscussionAttachment.ICreate,
        },
      );
    },
  );

  // Verify article still has only 5 attachments
  TestValidator.equals(
    "article should still have only 5 attachments",
    attachments.length,
    5,
  );
}
