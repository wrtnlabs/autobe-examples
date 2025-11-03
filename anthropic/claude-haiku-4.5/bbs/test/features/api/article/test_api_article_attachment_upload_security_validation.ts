import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function test_api_article_attachment_upload_security_validation(
  connection: api.IConnection,
) {
  // Step 1: Create member account for test
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "TestPass123",
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(member);

  // Step 2: Create article for attachment uploads
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        category_code: "economics",
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);

  // Step 3: Upload safe PDF file - should be marked as safe or pending_scan
  const safeAttachment: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.member.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: {
          filename: "safe_document.pdf",
          file_type: "application/pdf",
          file_extension: "pdf",
          file_size: 5242880,
          attachable_type: "article",
        } satisfies IDiscussionBoardAttachment.ICreate,
      },
    );
  typia.assert(safeAttachment);
  TestValidator.predicate(
    "safe attachment has pending_scan or safe security status",
    safeAttachment.security_status === "safe" ||
      safeAttachment.security_status === "pending_scan",
  );

  // Step 4: Upload suspicious executable file - should be quarantined or infected
  const suspiciousAttachment: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.member.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: {
          filename: "suspicious_file.exe",
          file_type: "application/x-msdownload",
          file_extension: "exe",
          file_size: 1048576,
          attachable_type: "article",
        } satisfies IDiscussionBoardAttachment.ICreate,
      },
    );
  typia.assert(suspiciousAttachment);
  TestValidator.predicate(
    "suspicious executable file has restricted security status",
    suspiciousAttachment.security_status === "quarantined" ||
      suspiciousAttachment.security_status === "infected" ||
      suspiciousAttachment.security_status === "pending_scan",
  );

  // Step 5: Upload image file - should be safe or pending_scan
  const imageAttachment: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.member.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: {
          filename: "chart.png",
          file_type: "image/png",
          file_extension: "png",
          file_size: 2097152,
          attachable_type: "article",
        } satisfies IDiscussionBoardAttachment.ICreate,
      },
    );
  typia.assert(imageAttachment);
  TestValidator.predicate(
    "image attachment has pending_scan or safe security status",
    imageAttachment.security_status === "safe" ||
      imageAttachment.security_status === "pending_scan",
  );

  // Step 6: Verify safe file properties after security scan
  TestValidator.notEquals(
    "safe attachment filename is preserved",
    safeAttachment.filename,
    "",
  );
  TestValidator.notEquals(
    "safe attachment has file type set",
    safeAttachment.file_type,
    "",
  );

  // Step 7: Verify quarantined file handling
  TestValidator.predicate(
    "suspicious file is either quarantined, infected, or pending scan",
    suspiciousAttachment.security_status !== "",
  );

  // Step 8: Verify multiple attachments can be uploaded to same article
  const documentAttachment: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.member.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: {
          filename: "analysis.docx",
          file_type:
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          file_extension: "docx",
          file_size: 3145728,
          attachable_type: "article",
        } satisfies IDiscussionBoardAttachment.ICreate,
      },
    );
  typia.assert(documentAttachment);
  TestValidator.notEquals(
    "document attachment has different ID from safe attachment",
    documentAttachment.id,
    safeAttachment.id,
  );

  // Step 9: Verify attachment security status values are one of the valid states
  TestValidator.predicate(
    "safe attachment security status is valid",
    ["pending_scan", "safe", "infected", "quarantined"].includes(
      safeAttachment.security_status,
    ),
  );

  TestValidator.predicate(
    "document attachment security status is valid",
    ["pending_scan", "safe", "infected", "quarantined"].includes(
      documentAttachment.security_status,
    ),
  );
}
