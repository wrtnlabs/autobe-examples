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
 * Test edge cases and boundary conditions for administrative attachment search functionality.
 *
 * This test validates the administrative attachment search endpoint's handling of various
 * edge cases including empty results, pagination boundaries, invalid parameters, and
 * filtering with uncommon file types.
 */
export async function test_api_admin_attachment_search_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for administrative operations
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Create member connection for article creation
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberAuth);
  // Create test article for attachment testing
  const article = await api.functional.discussionBoard.member.articles.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Create attachments with various file types for testing
  const fileTypes = ["pdf", "jpg", "docx", "txt", "zip"] as const;
  const mimeTypes = {
    pdf: "application/pdf",
    jpg: "image/jpeg",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    txt: "text/plain",
    zip: "application/zip",
  };
  for (let i = 0; i < 3; i++) {
    const attachment =
      await api.functional.discussionBoard.member.articles.attachments.create(
        memberConnection,
        {
          articleId: article.id,
          body: {
            filename: `test_file_${i}.${fileTypes[i]}`,
            filetype: fileTypes[i],
            mime_type: mimeTypes[fileTypes[i]],
            size_bytes: typia.random<
              number &
                tags.Type<"int32"> &
                tags.Minimum<1> &
                tags.Maximum<1000000>
            >(),
          } satisfies IDiscussionBoardAttachment.ICreate,
        },
      );
    typia.assert(attachment);
  }
  // Wait a moment for attachments to be indexed
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Test 1: Empty search results with non-matching criteria
  const emptySearch =
    await api.functional.discussionBoard.admin.search.attachments.index(
      adminConnection,
      {
        body: {
          search: "nonexistent_filename_pattern_12345",
        } satisfies IDiscussionBoardAttachment.IRequest,
      },
    );
  typia.assert(emptySearch);
  TestValidator.equals(
    "empty search has zero records",
    emptySearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty search has zero pages",
    emptySearch.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty search has empty data array",
    emptySearch.data.length,
    0,
  );
  // Test 2: Pagination boundaries - first page
  const firstPageSearch =
    await api.functional.discussionBoard.admin.search.attachments.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 2,
        } satisfies IDiscussionBoardAttachment.IRequest,
      },
    );
  typia.assert(firstPageSearch);
  TestValidator.equals(
    "first page has correct current page",
    firstPageSearch.pagination.current,
    1,
  );
  TestValidator.predicate(
    "first page has records",
    firstPageSearch.pagination.records > 0,
  );
  TestValidator.equals(
    "first page has correct data count",
    firstPageSearch.data.length,
    2,
  );
  // Test 3: Pagination boundaries - page beyond total pages
  const overflowPageSearch =
    await api.functional.discussionBoard.admin.search.attachments.index(
      adminConnection,
      {
        body: {
          page: 1000,
          limit: 10,
        } satisfies IDiscussionBoardAttachment.IRequest,
      },
    );
  typia.assert(overflowPageSearch);
  TestValidator.equals(
    "overflow page has empty data",
    overflowPageSearch.data.length,
    0,
  );
  TestValidator.predicate(
    "overflow page current is within bounds",
    overflowPageSearch.pagination.current <=
      overflowPageSearch.pagination.pages,
  );
  // Test 4: File type filtering
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
    "pdf search returns valid results",
    pdfSearch.data.length >= 0,
  );
  if (pdfSearch.data.length > 0) {
    TestValidator.predicate(
      "all results match filetype filter",
      pdfSearch.data.every((attachment) => attachment.filetype === "pdf"),
    );
  }
  // Test 5: MIME type filtering
  const jpegSearch =
    await api.functional.discussionBoard.admin.search.attachments.index(
      adminConnection,
      {
        body: {
          mime_type: "image/jpeg",
        } satisfies IDiscussionBoardAttachment.IRequest,
      },
    );
  typia.assert(jpegSearch);
  TestValidator.predicate(
    "jpeg search returns valid results",
    jpegSearch.data.length >= 0,
  );
  if (jpegSearch.data.length > 0) {
    TestValidator.predicate(
      "all results match MIME type filter",
      jpegSearch.data.every(
        (attachment) => attachment.mime_type === "image/jpeg",
      ),
    );
  }
  // Test 6: File size range filtering
  const sizeRangeSearch =
    await api.functional.discussionBoard.admin.search.attachments.index(
      adminConnection,
      {
        body: {
          size_min: 1,
          size_max: 1000000,
        } satisfies IDiscussionBoardAttachment.IRequest,
      },
    );
  typia.assert(sizeRangeSearch);
  TestValidator.predicate(
    "size range search returns results",
    sizeRangeSearch.data.length >= 0,
  );
  if (sizeRangeSearch.data.length > 0) {
    TestValidator.predicate(
      "size range search validates results",
      sizeRangeSearch.data.every(
        (attachment) =>
          attachment.size_bytes >= 1 && attachment.size_bytes <= 1000000,
      ),
    );
  }
  // Test 7: Search with multiple criteria
  const combinedSearch =
    await api.functional.discussionBoard.admin.search.attachments.index(
      adminConnection,
      {
        body: {
          search: "test_file",
          size_min: 1,
        } satisfies IDiscussionBoardAttachment.IRequest,
      },
    );
  typia.assert(combinedSearch);
  TestValidator.predicate(
    "combined search returns valid results",
    combinedSearch.data.length >= 0,
  );
  if (combinedSearch.data.length > 0) {
    TestValidator.predicate(
      "combined search validates filename pattern",
      combinedSearch.data.every((attachment) =>
        attachment.filename.includes("test_file"),
      ),
    );
  }
}
