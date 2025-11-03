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

/**
 * Test that attachment retrieval includes security validation status indicating
 * whether files have passed malware scanning.
 *
 * This test validates the complete workflow for retrieving attachments with
 * security status information. It ensures that when accessing an attachment,
 * the API returns comprehensive metadata including the security_status field
 * which indicates whether the file has passed antivirus/malware scanning. This
 * is critical for client-side access control decisions and proper file
 * handling.
 *
 * Steps:
 *
 * 1. Register as a new discussion board member
 * 2. Create an article for the attachment
 * 3. Upload an attachment to the article
 * 4. Retrieve the attachment and verify security_status field
 * 5. Validate security_status contains one of: 'safe', 'pending_scan', 'infected',
 *    'quarantined'
 */
export async function test_api_attachment_retrieval_with_security_validation(
  connection: api.IConnection,
) {
  // Step 1: Register as a new member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "TestPassword123";

  const memberAuth: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(memberAuth);

  // Step 2: Create an article
  const articleTitle = RandomGenerator.paragraph({ sentences: 3 });
  const articleContent = RandomGenerator.content({ paragraphs: 2 });

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: articleTitle,
        content: articleContent,
        category_code: "economics",
        attachments: undefined,
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);

  // Step 3: Upload an attachment to the article
  const attachmentData = {
    filename: "test-document.pdf",
    file_type: "application/pdf",
    file_extension: "pdf",
    file_size: 1024 * 100, // 100 KB
    attachable_type: "article" as const,
  } satisfies IDiscussionBoardAttachment.ICreate;

  const createdAttachment: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.member.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: attachmentData,
      },
    );
  typia.assert(createdAttachment);

  // Step 4: Retrieve the attachment to verify security_status
  const retrievedAttachment: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.articles.attachments.at(connection, {
      articleId: article.id,
      attachmentId: createdAttachment.id,
    });
  typia.assert(retrievedAttachment);

  // Step 5: Validate security_status field exists and contains valid value
  TestValidator.predicate(
    "attachment should have security_status field",
    retrievedAttachment.security_status !== undefined &&
      retrievedAttachment.security_status !== null,
  );

  const validSecurityStatuses = [
    "safe",
    "pending_scan",
    "infected",
    "quarantined",
  ];
  TestValidator.predicate(
    "security_status should be one of valid status values",
    validSecurityStatuses.includes(retrievedAttachment.security_status),
  );

  // Step 6: Validate other critical metadata
  TestValidator.equals(
    "retrieved attachment ID should match created attachment",
    retrievedAttachment.id,
    createdAttachment.id,
  );

  TestValidator.equals(
    "attachment filename should match uploaded filename",
    retrievedAttachment.filename,
    attachmentData.filename,
  );

  TestValidator.equals(
    "attachment file_type should match uploaded MIME type",
    retrievedAttachment.file_type,
    attachmentData.file_type,
  );

  TestValidator.equals(
    "attachment file_extension should match uploaded extension",
    retrievedAttachment.file_extension,
    attachmentData.file_extension,
  );

  TestValidator.equals(
    "attachment file_size should match uploaded size",
    retrievedAttachment.file_size,
    attachmentData.file_size,
  );

  TestValidator.equals(
    "attachment should belong to correct article",
    retrievedAttachment.discussion_board_article_id,
    article.id,
  );

  TestValidator.equals(
    "attachment should belong to correct member",
    retrievedAttachment.discussion_board_member_id,
    memberAuth.id,
  );

  TestValidator.predicate(
    "attachment should have created_at timestamp",
    retrievedAttachment.created_at !== undefined &&
      retrievedAttachment.created_at !== null,
  );

  TestValidator.predicate(
    "attachment should have updated_at timestamp",
    retrievedAttachment.updated_at !== undefined &&
      retrievedAttachment.updated_at !== null,
  );
}
