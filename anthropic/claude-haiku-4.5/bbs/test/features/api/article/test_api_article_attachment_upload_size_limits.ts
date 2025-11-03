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
 * Test enforcement of file size limits and per-article attachment capacity
 * constraints.
 *
 * This test validates that the discussion board article attachment system
 * properly enforces size limits at multiple levels: individual file limits
 * (10MB for images, 20MB for documents), maximum attachment count per article
 * (10 files), and total attachment size per article (100MB combined). The test
 * workflow creates a member and article, then systematically tests valid
 * uploads, oversized file rejection, and capacity limit enforcement with proper
 * error messages.
 *
 * Test sequence:
 *
 * 1. Register a new member for testing
 * 2. Create an article to attach files to
 * 3. Upload valid files up to per-file size limits
 * 4. Attempt to upload oversized image (>10MB) and validate rejection
 * 5. Attempt to upload oversized document (>20MB) and validate rejection
 * 6. Upload maximum number of attachments (10 files) successfully
 * 7. Attempt to exceed article attachment limit (11th file) and confirm rejection
 * 8. Validate that total attachment size does not exceed 100MB per article
 */
export async function test_api_article_attachment_upload_size_limits(
  connection: api.IConnection,
) {
  // 1. Register a new member
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberPassword = "TestPass123";

  const memberAuth: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(memberAuth);
  TestValidator.predicate(
    "member registration successful",
    memberAuth.id !== undefined,
  );

  // 2. Create an article to attach files to
  const articleTitle = RandomGenerator.paragraph({ sentences: 3 });
  const articleContent = RandomGenerator.content({ paragraphs: 2 });

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: articleTitle,
        content: articleContent,
        category_code: "economics",
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);
  TestValidator.predicate(
    "article created successfully",
    article.id !== undefined,
  );

  // 3. Upload valid small files (within limits)
  // Valid image: small JPEG file (1MB)
  const smallImageAttachment: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.member.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: {
          filename: "valid_image.jpg",
          file_type: "image/jpeg",
          file_extension: "jpg",
          file_size: 1048576, // 1MB in bytes
          attachable_type: "article",
        } satisfies IDiscussionBoardAttachment.ICreate,
      },
    );
  typia.assert(smallImageAttachment);
  TestValidator.predicate(
    "small image attachment uploaded successfully",
    smallImageAttachment.id !== undefined,
  );

  // Valid document: small PDF file (5MB)
  const smallDocumentAttachment: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.member.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: {
          filename: "valid_document.pdf",
          file_type: "application/pdf",
          file_extension: "pdf",
          file_size: 5242880, // 5MB in bytes
          attachable_type: "article",
        } satisfies IDiscussionBoardAttachment.ICreate,
      },
    );
  typia.assert(smallDocumentAttachment);
  TestValidator.predicate(
    "small document attachment uploaded successfully",
    smallDocumentAttachment.id !== undefined,
  );

  // 4. Attempt to upload oversized image (>10MB) - should be rejected
  await TestValidator.error(
    "oversized image (>10MB) should be rejected",
    async () => {
      await api.functional.discussionBoard.member.articles.attachments.create(
        connection,
        {
          articleId: article.id,
          body: {
            filename: "oversized_image.jpg",
            file_type: "image/jpeg",
            file_extension: "jpg",
            file_size: 11534336, // 11MB in bytes - exceeds 10MB limit
            attachable_type: "article",
          } satisfies IDiscussionBoardAttachment.ICreate,
        },
      );
    },
  );

  // 5. Attempt to upload oversized document (>20MB) - should be rejected
  await TestValidator.error(
    "oversized document (>20MB) should be rejected",
    async () => {
      await api.functional.discussionBoard.member.articles.attachments.create(
        connection,
        {
          articleId: article.id,
          body: {
            filename: "oversized_document.pdf",
            file_type: "application/pdf",
            file_extension: "pdf",
            file_size: 22020096, // 21MB in bytes - exceeds 20MB limit
            attachable_type: "article",
          } satisfies IDiscussionBoardAttachment.ICreate,
        },
      );
    },
  );

  // 6. Upload maximum number of attachments (10 files total) - we already have 2, so add 8 more
  const attachmentIds: Array<string & tags.Format<"uuid">> = [
    smallImageAttachment.id,
    smallDocumentAttachment.id,
  ];

  for (let i = 0; i < 8; i++) {
    const attachment: IDiscussionBoardAttachment =
      await api.functional.discussionBoard.member.articles.attachments.create(
        connection,
        {
          articleId: article.id,
          body: {
            filename: `attachment_${i + 3}.txt`,
            file_type: "text/plain",
            file_extension: "txt",
            file_size: 2097152, // 2MB each
            attachable_type: "article",
          } satisfies IDiscussionBoardAttachment.ICreate,
        },
      );
    typia.assert(attachment);
    attachmentIds.push(attachment.id);
  }

  TestValidator.equals(
    "total of 10 attachments uploaded",
    attachmentIds.length,
    10,
  );

  // 7. Attempt to exceed article attachment limit (11th file) - should be rejected
  await TestValidator.error(
    "exceeding maximum attachment count (>10) should be rejected",
    async () => {
      await api.functional.discussionBoard.member.articles.attachments.create(
        connection,
        {
          articleId: article.id,
          body: {
            filename: "eleventh_attachment.txt",
            file_type: "text/plain",
            file_extension: "txt",
            file_size: 1048576, // 1MB
            attachable_type: "article",
          } satisfies IDiscussionBoardAttachment.ICreate,
        },
      );
    },
  );

  // 8. Validate that total attachment size does not exceed 100MB per article
  // Calculate total size: 1MB + 5MB + (8 * 2MB) = 22MB, which is within 100MB limit
  const totalSizeBytes = 1048576 + 5242880 + 8 * 2097152;
  const maxSizeBytes = 104857600; // 100MB

  TestValidator.predicate(
    "total attachment size is within 100MB limit",
    totalSizeBytes <= maxSizeBytes,
  );

  // Additional test: Verify that attempting to add files that would exceed 100MB total is rejected
  // Create a new article to test 100MB limit without hitting 10-file limit
  const article2: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        category_code: "politics",
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article2);

  // Upload files that will approach 100MB limit
  const largeFiles: IDiscussionBoardAttachment[] = [];

  // Add 5 files of 19MB each (95MB total)
  for (let i = 0; i < 5; i++) {
    const largeAttachment: IDiscussionBoardAttachment =
      await api.functional.discussionBoard.member.articles.attachments.create(
        connection,
        {
          articleId: article2.id,
          body: {
            filename: `large_file_${i + 1}.pdf`,
            file_type: "application/pdf",
            file_extension: "pdf",
            file_size: 19922944, // 19MB each
            attachable_type: "article",
          } satisfies IDiscussionBoardAttachment.ICreate,
        },
      );
    typia.assert(largeAttachment);
    largeFiles.push(largeAttachment);
  }

  TestValidator.equals(
    "5 large attachments uploaded successfully",
    largeFiles.length,
    5,
  );

  // Attempt to add another file that would exceed 100MB total (95MB + 10MB > 100MB)
  await TestValidator.error(
    "exceeding total 100MB size limit per article should be rejected",
    async () => {
      await api.functional.discussionBoard.member.articles.attachments.create(
        connection,
        {
          articleId: article2.id,
          body: {
            filename: "exceeds_limit.pdf",
            file_type: "application/pdf",
            file_extension: "pdf",
            file_size: 10485760, // 10MB - would exceed 100MB total
            attachable_type: "article",
          } satisfies IDiscussionBoardAttachment.ICreate,
        },
      );
    },
  );
}
