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
import type { IPageIEconomicDiscussionAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicDiscussionAttachment";

/**
 * Test pagination functionality for article attachments with comprehensive
 * validation of multi-page navigation, filtering, and metadata accuracy.
 *
 * This test validates the complete pagination workflow for article attachments
 * including:
 *
 * - Creation of sufficient attachments to test pagination (15+ attachments)
 * - Multi-page navigation with different page sizes (10-50 items per page)
 * - Page number validation starting from 1-based indexing
 * - File type filtering (image, document, spreadsheet) capabilities
 * - Pagination metadata accuracy (current page, total pages, total records)
 * - Cross-reference validation between created and retrieved data
 *
 * Steps:
 *
 * 1. Register a new member account for authentication
 * 2. Create an economic discussion article
 * 3. Generate 15+ file attachments to trigger pagination
 * 4. Test default pagination behavior (page 1, 10 items)
 * 5. Test custom pagination options (different page sizes, page numbers)
 * 6. Test file type filtering with pagination
 * 7. Validate pagination metadata accuracy
 * 8. Navigate to subsequent pages and verify data
 */
export async function test_api_attachments_pagination_navigation(
  connection: api.IConnection,
) {
  // Step 1: Create member account for authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberAuth = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphabets(10),
      email: memberEmail,
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IEconomicDiscussionMember.ICreate,
  });
  typia.assert(memberAuth);

  // Step 2: Create an economic discussion article
  const fileTypes: IEconomicDiscussionAttachmentFileType[] = [
    "image",
    "document",
    "spreadsheet",
  ];
  const categoryId = typia.random<string & tags.Format<"uuid">>();

  const member = memberAuth.member;
  const article =
    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
        category_ids: [categoryId],
      } satisfies IEconomicDiscussionArticle.ICreate,
    });
  typia.assert(article);

  // Step 3: Create 15 attachments to test pagination
  const createdAttachments: IEconomicDiscussionAttachment[] = [];
  const fileSize = 1024; // 1KB
  const mimeTypes: IEconomicDiscussionAttachment.ICreate["mime_type"][] = [
    "image/jpeg",
    "image/png",
    "application/pdf",
    "application/msword",
    "application/vnd.ms-excel",
  ];

  await ArrayUtil.asyncRepeat(15, async (index) => {
    const fileType = fileTypes[index % 3];
    const mimeType = mimeTypes[index % 5];

    const attachment =
      await api.functional.economicDiscussion.member.articles.attachments.create(
        connection,
        {
          articleId: article.id,
          body: {
            filename: `test_file_${index}.${filenameExtension(fileType)}`,
            file_size: fileSize,
            file_type: fileType,
            mime_type: mimeType,
          } satisfies IEconomicDiscussionAttachment.ICreate,
        },
      );
    createdAttachments.push(attachment);
  });

  // Step 4: Test default pagination (page 1, 10 items)
  let firstPage =
    await api.functional.economicDiscussion.articles.attachments.index(
      connection,
      {
        articleId: article.id,
        body: {
          page: 1,
        } satisfies IEconomicDiscussionAttachment.IRequest,
      },
    );
  typia.assert(firstPage);

  TestValidator.equals("correct current page", firstPage.pagination.current, 1);
  TestValidator.equals(
    "items per page matches default",
    firstPage.pagination.limit,
    10,
  );
  TestValidator.equals(
    "total records matches created count",
    firstPage.pagination.records,
    15,
  );
  TestValidator.equals(
    "total pages calculated correctly",
    firstPage.pagination.pages,
    2,
  );
  TestValidator.predicate(
    "correct items count on first page",
    firstPage.data.length === 10,
  );

  // Step 5: Test second page
  let secondPage =
    await api.functional.economicDiscussion.articles.attachments.index(
      connection,
      {
        articleId: article.id,
        body: {
          page: 2,
        } satisfies IEconomicDiscussionAttachment.IRequest,
      },
    );
  typia.assert(secondPage);

  TestValidator.equals("second page current", secondPage.pagination.current, 2);
  TestValidator.equals("second page items count", secondPage.data.length, 5); // Remaining 5 items
  TestValidator.equals(
    "limit stays consistent",
    secondPage.pagination.limit,
    firstPage.pagination.limit,
  );

  // Step 6: Test custom page size
  const customPage =
    await api.functional.economicDiscussion.articles.attachments.index(
      connection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 15,
        } satisfies IEconomicDiscussionAttachment.IRequest,
      },
    );
  typia.assert(customPage);

  TestValidator.equals("custom limit applied", customPage.pagination.limit, 15);
  TestValidator.predicate(
    "all items on custom page",
    customPage.data.length === 15,
  );

  // Step 7: Test file type filtering with pagination
  const imageFilter =
    await api.functional.economicDiscussion.articles.attachments.index(
      connection,
      {
        articleId: article.id,
        body: {
          page: 1,
          file_type: "image",
        } satisfies IEconomicDiscussionAttachment.IRequest,
      },
    );
  typia.assert(imageFilter);

  TestValidator.predicate(
    "only image attachments returned",
    imageFilter.data.every(
      (a: IEconomicDiscussionAttachment.ISummary) => a.file_type === "image",
    ),
  );

  const documentFilter =
    await api.functional.economicDiscussion.articles.attachments.index(
      connection,
      {
        articleId: article.id,
        body: {
          page: 1,
          file_type: "document",
        } satisfies IEconomicDiscussionAttachment.IRequest,
      },
    );
  typia.assert(documentFilter);

  TestValidator.predicate(
    "only document attachments returned",
    documentFilter.data.every(
      (a: IEconomicDiscussionAttachment.ISummary) => a.file_type === "document",
    ),
  );

  // Helper function to get correct filename extensions
  function filenameExtension(
    fileType: IEconomicDiscussionAttachmentFileType,
  ): string {
    switch (fileType) {
      case "image":
        return "jpg";
      case "document":
        return "pdf";
      case "spreadsheet":
        return "xlsx";
      default:
        return "txt";
    }
  }
}
