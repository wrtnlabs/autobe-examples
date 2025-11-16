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

export async function test_api_member_article_attachment_security_scan(
  connection: api.IConnection,
) {
  // Step 1: Create a member account for testing
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphabets(10),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IEconomicDiscussionMember.ICreate,
  });
  typia.assert(member);
  TestValidator.predicate(
    "member created successfully",
    member.member !== null,
  );

  // Step 2: Create an economic discussion article
  const article =
    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 5 }),
        content: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 10,
          sentenceMax: 15,
        }),
        category_ids: ArrayUtil.repeat(2, () =>
          typia.random<string & tags.Format<"uuid">>(),
        ),
      } satisfies IEconomicDiscussionArticle.ICreate,
    });
  typia.assert(article);
  TestValidator.predicate("article created successfully", article.id !== null);

  // Step 3: Upload a document file attachment (PDF)
  const documentAttachment: IEconomicDiscussionAttachment =
    await api.functional.economicDiscussion.member.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: {
          filename: typia.random<IAttachmentFilename>(),
          file_size: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<1000> &
              tags.Maximum<5000000>
          >(),
          file_type: typia.random<IEconomicDiscussionAttachmentFileType>(),
          mime_type: RandomGenerator.pick([
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          ] as const),
        } satisfies IEconomicDiscussionAttachments.ICreate,
      },
    );
  typia.assert(documentAttachment);
  TestValidator.predicate(
    "document attachment created with pending scan status",
    documentAttachment.is_scanned === false,
  );
  TestValidator.equals(
    "document attachment has correct file type",
    documentAttachment.file_type,
    "document",
  );

  // Step 4: Upload an image file attachment (JPEG)
  const imageAttachment: IEconomicDiscussionAttachment =
    await api.functional.economicDiscussion.member.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: {
          filename: typia.random<IAttachmentFilename>(),
          file_size: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<1000> &
              tags.Maximum<3000000>
          >(),
          file_type: typia.random<IEconomicDiscussionAttachmentFileType>(),
          mime_type: RandomGenerator.pick([
            "image/jpeg",
            "image/png",
            "image/gif",
          ] as const),
        } satisfies IEconomicDiscussionAttachments.ICreate,
      },
    );
  typia.assert(imageAttachment);
  TestValidator.predicate(
    "image attachment created with pending scan status",
    imageAttachment.is_scanned === false,
  );
  TestValidator.equals(
    "image attachment has correct file type",
    imageAttachment.file_type,
    "image",
  );

  // Step 5: Upload a spreadsheet file attachment (Excel)
  const spreadsheetAttachment: IEconomicDiscussionAttachment =
    await api.functional.economicDiscussion.member.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: {
          filename: typia.random<IAttachmentFilename>(),
          file_size: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<5000> &
              tags.Maximum<2000000>
          >(),
          file_type: typia.random<IEconomicDiscussionAttachmentFileType>(),
          mime_type: RandomGenerator.pick([
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          ] as const),
        } satisfies IEconomicDiscussionAttachments.ICreate,
      },
    );
  typia.assert(spreadsheetAttachment);
  TestValidator.predicate(
    "spreadsheet attachment created with pending scan status",
    spreadsheetAttachment.is_scanned === false,
  );
  TestValidator.equals(
    "spreadsheet attachment has correct file type",
    spreadsheetAttachment.file_type,
    "spreadsheet",
  );

  // Step 6: Validate all attachments maintain proper relationship with article
  TestValidator.equals(
    "document attachment references correct article",
    documentAttachment.article.id,
    article.id,
  );
  TestValidator.equals(
    "image attachment references correct article",
    imageAttachment.article.id,
    article.id,
  );
  TestValidator.equals(
    "spreadsheet attachment references correct article",
    spreadsheetAttachment.article.id,
    article.id,
  );

  // Step 7: Validate article has updated attachment counts
  TestValidator.equals(
    "article attachment count increased",
    documentAttachment.article.attachments_count,
    3,
  );

  // Step 8: Validate file size constraints are respected
  TestValidator.predicate(
    "document file size within limits",
    documentAttachment.file_size >= 1 &&
      documentAttachment.file_size <= 10485760,
  );
  TestValidator.predicate(
    "image file size within limits",
    imageAttachment.file_size >= 1 && imageAttachment.file_size <= 10485760,
  );
  TestValidator.predicate(
    "spreadsheet file size within limits",
    spreadsheetAttachment.file_size >= 1 &&
      spreadsheetAttachment.file_size <= 10485760,
  );

  // Step 9: Validate member attribution is preserved
  TestValidator.equals(
    "document attachment has member author",
    documentAttachment.article.member_author?.id,
    member.member.id,
  );
  TestValidator.equals(
    "image attachment has member author",
    imageAttachment.article.member_author?.id,
    member.member.id,
  );
  TestValidator.equals(
    "spreadsheet attachment has member author",
    spreadsheetAttachment.article.member_author?.id,
    member.member.id,
  );

  // Step 10: Validate upload timestamps
  TestValidator.predicate(
    "document has upload timestamp",
    documentAttachment.uploaded_at !== null,
  );
  TestValidator.predicate(
    "image has upload timestamp",
    imageAttachment.uploaded_at !== null,
  );
  TestValidator.predicate(
    "spreadsheet has upload timestamp",
    spreadsheetAttachment.uploaded_at !== null,
  );

  // Step 11: Validate different filename patterns
  TestValidator.predicate(
    "document filename is valid",
    documentAttachment.filename.length > 0,
  );
  TestValidator.predicate(
    "image filename is valid",
    imageAttachment.filename.length > 0,
  );
  TestValidator.predicate(
    "spreadsheet filename is valid",
    spreadsheetAttachment.filename.length > 0,
  );
}
