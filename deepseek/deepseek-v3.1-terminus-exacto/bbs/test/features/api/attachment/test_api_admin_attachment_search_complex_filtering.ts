import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAttachment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_member_articles_attachments_create } from "../../../generate/generate_random_discussion_board_member_articles_attachments_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_attachment } from "../../../prepare/prepare_random_discussion_board_attachment";

/**
 * Test advanced attachment search with complex filtering criteria.
 * Create articles with attachments having specific filename patterns, file sizes, and upload dates.
 * As an admin, perform searches using various filter combinations.
 */
export async function test_api_admin_attachment_search_complex_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "admin1234",
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  // Create member connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberConnection, {
    body: {
      email: "member@test.com",
      password: "member1234",
    } satisfies IDiscussionBoardMember.ILogin,
  });
  // Create an article for attachments (using a mock section ID)
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Create attachments with specific characteristics for testing
  const attachments: IDiscussionBoardAttachment[] = [];
  // Attachment 1: PDF file with specific filename pattern
  const pdfAttachment =
    await generate_random_discussion_board_member_articles_attachments_create(
      memberConnection,
      {
        params: { articleId: article.id },
        body: {
          filename: "report_2024_financial.pdf",
          filetype: "pdf",
          mime_type: "application/pdf",
          size_bytes: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<5000> &
              tags.Maximum<10000>
          >(),
        } satisfies IDiscussionBoardAttachment.ICreate,
      },
    );
  typia.assert(pdfAttachment);
  attachments.push(pdfAttachment);
  // Attachment 2: JPG file with specific filename pattern
  const jpgAttachment =
    await generate_random_discussion_board_member_articles_attachments_create(
      memberConnection,
      {
        params: { articleId: article.id },
        body: {
          filename: "image_product_photo.jpg",
          filetype: "jpg",
          mime_type: "image/jpeg",
          size_bytes: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<2000> &
              tags.Maximum<5000>
          >(),
        } satisfies IDiscussionBoardAttachment.ICreate,
      },
    );
  typia.assert(jpgAttachment);
  attachments.push(jpgAttachment);
  // Attachment 3: DOCX file with specific filename pattern
  const docxAttachment =
    await generate_random_discussion_board_member_articles_attachments_create(
      memberConnection,
      {
        params: { articleId: article.id },
        body: {
          filename: "invoice_Q1_2024.docx",
          filetype: "docx",
          mime_type:
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          size_bytes: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<10000> &
              tags.Maximum<20000>
          >(),
        } satisfies IDiscussionBoardAttachment.ICreate,
      },
    );
  typia.assert(docxAttachment);
  attachments.push(docxAttachment);
  // Attachment 4: Small file for size filtering
  const smallAttachment =
    await generate_random_discussion_board_member_articles_attachments_create(
      memberConnection,
      {
        params: { articleId: article.id },
        body: {
          filename: "small_file.txt",
          filetype: "txt",
          mime_type: "text/plain",
          size_bytes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<500>
          >(),
        } satisfies IDiscussionBoardAttachment.ICreate,
      },
    );
  typia.assert(smallAttachment);
  attachments.push(smallAttachment);
  // Wait a moment to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Attachment 5: Large file for size filtering
  const largeAttachment =
    await generate_random_discussion_board_member_articles_attachments_create(
      memberConnection,
      {
        params: { articleId: article.id },
        body: {
          filename: "large_file.dat",
          filetype: "dat",
          mime_type: "application/octet-stream",
          size_bytes: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<50000> &
              tags.Maximum<100000>
          >(),
        } satisfies IDiscussionBoardAttachment.ICreate,
      },
    );
  typia.assert(largeAttachment);
  attachments.push(largeAttachment);
  // Test 1: Filename pattern matching with ILIKE search
  const patternSearch =
    await api.functional.discussionBoard.admin.search.attachments.index(
      adminConnection,
      {
        body: {
          search: "report_2024",
        } satisfies IDiscussionBoardAttachment.IRequest,
      },
    );
  typia.assert(patternSearch);
  TestValidator.predicate(
    "pattern search finds matching files",
    patternSearch.data.length >= 1,
  );
  // Test 2: File type filtering
  const pdfSearch =
    await api.functional.discussionBoard.admin.search.attachments.index(
      adminConnection,
      {
        body: {
          filetype: "pdf",
        } satisfies IDiscussionBoardAttachment.IRequest,
      },
    );
  typia.assert(pdfSearch);
  TestValidator.predicate(
    "PDF search returns PDF files only",
    pdfSearch.data.every((att) => att.filetype === "pdf"),
  );
  // Test 3: MIME type filtering
  const imageSearch =
    await api.functional.discussionBoard.admin.search.attachments.index(
      adminConnection,
      {
        body: {
          mime_type: "image/jpeg",
        } satisfies IDiscussionBoardAttachment.IRequest,
      },
    );
  typia.assert(imageSearch);
  TestValidator.predicate(
    "MIME search returns matching files only",
    imageSearch.data.every((att) => att.mime_type === "image/jpeg"),
  );
  // Test 4: File size range filtering
  const sizeSearch =
    await api.functional.discussionBoard.admin.search.attachments.index(
      adminConnection,
      {
        body: {
          size_min: 5000,
          size_max: 20000,
        } satisfies IDiscussionBoardAttachment.IRequest,
      },
    );
  typia.assert(sizeSearch);
  TestValidator.predicate(
    "size range search returns files within bounds",
    sizeSearch.data.every(
      (att) => att.size_bytes >= 5000 && att.size_bytes <= 20000,
    ),
  );
  // Test 5: Date range filtering with specific dates
  const testStartDate = new Date(
    Date.now() - 24 * 60 * 60 * 1000,
  ).toISOString(); // 24 hours ago
  const testEndDate = new Date().toISOString(); // now
  const dateSearch =
    await api.functional.discussionBoard.admin.search.attachments.index(
      adminConnection,
      {
        body: {
          created_after: testStartDate,
          created_before: testEndDate,
        } satisfies IDiscussionBoardAttachment.IRequest,
      },
    );
  typia.assert(dateSearch);
  TestValidator.predicate(
    "date range search returns recent files",
    dateSearch.data.length >= 0,
  );
  // Test 6: Combined criteria (PDF files with specific pattern)
  const combinedSearch =
    await api.functional.discussionBoard.admin.search.attachments.index(
      adminConnection,
      {
        body: {
          search: "report",
          filetype: "pdf",
          size_min: 1000,
        } satisfies IDiscussionBoardAttachment.IRequest,
      },
    );
  typia.assert(combinedSearch);
  TestValidator.predicate(
    "combined search returns correct files",
    combinedSearch.data.every(
      (att) =>
        att.filename.toLowerCase().includes("report") &&
        att.filetype === "pdf" &&
        att.size_bytes >= 1000,
    ),
  );
  // Test 7: Pagination
  const paginatedSearch =
    await api.functional.discussionBoard.admin.search.attachments.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 2,
        } satisfies IDiscussionBoardAttachment.IRequest,
      },
    );
  typia.assert(paginatedSearch);
  TestValidator.predicate(
    "pagination returns correct page size",
    paginatedSearch.data.length <= paginatedSearch.pagination.limit,
  );
  TestValidator.predicate(
    "pagination metadata is correct",
    paginatedSearch.pagination.current === 1 &&
      paginatedSearch.pagination.limit === 2,
  );
}
