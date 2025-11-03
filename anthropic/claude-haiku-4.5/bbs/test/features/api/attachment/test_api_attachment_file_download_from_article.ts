import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IBinaryFileResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IBinaryFileResponse";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function test_api_attachment_file_download_from_article(
  connection: api.IConnection,
) {
  // Step 1: Register a new member to create article and attachments
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "TestPassword123";

  const registeredMember = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IDiscussionBoardMember.IRegisterRequest,
  });
  typia.assert(registeredMember);

  // Step 2: Create an article without attachments initially
  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    content: RandomGenerator.content({ paragraphs: 2 }),
    category_code: "economics",
  } satisfies IDiscussionBoardArticle.ICreate;

  const createdArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: articleData,
    });
  typia.assert(createdArticle);
  TestValidator.equals(
    "article created with correct category",
    createdArticle.category.code,
    "economics",
  );

  // Step 3: Upload attachments to the created article
  const attachmentMetadata = [
    {
      filename: "economic-report.pdf",
      file_type: "application/pdf",
      file_extension: "pdf",
      file_size: 2097152, // 2 MB
    },
    {
      filename: "market-chart.jpg",
      file_type: "image/jpeg",
      file_extension: "jpg",
      file_size: 1048576, // 1 MB
    },
    {
      filename: "data-archive.zip",
      file_type: "application/zip",
      file_extension: "zip",
      file_size: 5242880, // 5 MB
    },
  ];

  const uploadedAttachments: IDiscussionBoardAttachment[] = [];

  for (const attachmentMeta of attachmentMetadata) {
    const uploadedAttachment =
      await api.functional.discussionBoard.member.articles.attachments.create(
        connection,
        {
          articleId: createdArticle.id,
          body: {
            filename: attachmentMeta.filename,
            file_type: attachmentMeta.file_type,
            file_extension: attachmentMeta.file_extension,
            file_size: attachmentMeta.file_size,
            attachable_type: "article",
          } satisfies IDiscussionBoardAttachment.ICreate,
        },
      );
    typia.assert(uploadedAttachment);
    uploadedAttachments.push(uploadedAttachment);
  }

  TestValidator.equals(
    "all attachments uploaded",
    uploadedAttachments.length,
    3,
  );

  // Step 4: Test downloading each attachment
  for (const attachment of uploadedAttachments) {
    // Verify attachment metadata
    TestValidator.predicate(
      `attachment ${attachment.filename} has security status`,
      attachment.security_status === "safe" ||
        attachment.security_status === "pending_scan",
    );

    TestValidator.predicate(
      `attachment ${attachment.filename} has valid file size`,
      attachment.file_size > 0,
    );

    // Download the attachment
    const downloadedFile =
      await api.functional.discussionBoard.attachments.download(connection, {
        attachmentId: attachment.id,
      });
    typia.assert(downloadedFile);

    // Verify download response metadata
    TestValidator.equals(
      `downloaded file filename matches attachment`,
      downloadedFile.filename,
      attachment.filename,
    );

    TestValidator.equals(
      `downloaded file type matches attachment`,
      downloadedFile.file_type,
      attachment.file_type,
    );

    TestValidator.equals(
      `downloaded file size matches attachment`,
      downloadedFile.file_size,
      attachment.file_size,
    );

    // Verify content is provided
    TestValidator.predicate(
      `downloaded file ${attachment.filename} has content`,
      downloadedFile.content !== undefined && downloadedFile.content.length > 0,
    );
  }

  // Step 5: Test downloading PDF attachment specifically
  const pdfAttachment = uploadedAttachments.find(
    (a) => a.file_extension === "pdf",
  );
  TestValidator.predicate("PDF attachment exists", pdfAttachment !== undefined);

  if (pdfAttachment) {
    const pdfDownload =
      await api.functional.discussionBoard.attachments.download(connection, {
        attachmentId: pdfAttachment.id,
      });
    typia.assert(pdfDownload);

    TestValidator.equals(
      "PDF filename is correct",
      pdfDownload.filename,
      "economic-report.pdf",
    );
    TestValidator.equals(
      "PDF file type is correct",
      pdfDownload.file_type,
      "application/pdf",
    );
    TestValidator.predicate("PDF has content", pdfDownload.content.length > 0);
  }

  // Step 6: Test downloading image attachment
  const imageAttachment = uploadedAttachments.find(
    (a) => a.file_extension === "jpg",
  );
  TestValidator.predicate(
    "Image attachment exists",
    imageAttachment !== undefined,
  );

  if (imageAttachment) {
    const imageDownload =
      await api.functional.discussionBoard.attachments.download(connection, {
        attachmentId: imageAttachment.id,
      });
    typia.assert(imageDownload);

    TestValidator.equals(
      "Image filename is correct",
      imageDownload.filename,
      "market-chart.jpg",
    );
    TestValidator.equals(
      "Image file type is correct",
      imageDownload.file_type,
      "image/jpeg",
    );
    TestValidator.predicate(
      "Image has content",
      imageDownload.content.length > 0,
    );
  }

  // Step 7: Test downloading archive attachment
  const archiveAttachment = uploadedAttachments.find(
    (a) => a.file_extension === "zip",
  );
  TestValidator.predicate(
    "Archive attachment exists",
    archiveAttachment !== undefined,
  );

  if (archiveAttachment) {
    const archiveDownload =
      await api.functional.discussionBoard.attachments.download(connection, {
        attachmentId: archiveAttachment.id,
      });
    typia.assert(archiveDownload);

    TestValidator.equals(
      "Archive filename is correct",
      archiveDownload.filename,
      "data-archive.zip",
    );
    TestValidator.equals(
      "Archive file type is correct",
      archiveDownload.file_type,
      "application/zip",
    );
    TestValidator.predicate(
      "Archive has content",
      archiveDownload.content.length > 0,
    );
  }
}
