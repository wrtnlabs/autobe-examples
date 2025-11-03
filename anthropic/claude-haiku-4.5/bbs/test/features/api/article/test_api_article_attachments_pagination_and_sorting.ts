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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAttachment";

export async function test_api_article_attachments_pagination_and_sorting(
  connection: api.IConnection,
) {
  // Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "TestPassword123",
    } satisfies IDiscussionBoardMember.IRegisterRequest,
  });
  typia.assert(member);
  typia.assert(member.id);
  typia.assert(member.token);

  // Create article
  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: "Test Article for Pagination",
        content:
          "This is a test article with many attachments for pagination testing.",
        category_code: "economics",
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  typia.assert(article.id);

  // Upload 30 attachments with different names and timestamps
  const attachmentIds: string[] = [];
  for (let i = 1; i <= 30; i++) {
    const attachment =
      await api.functional.discussionBoard.member.articles.attachments.create(
        connection,
        {
          articleId: article.id,
          body: {
            filename: `attachment_${String(i).padStart(2, "0")}.txt`,
            file_type: "text/plain",
            file_extension: "txt",
            file_size: 1000 + i * 100,
            attachable_type: "article",
          } satisfies IDiscussionBoardAttachment.ICreate,
        },
      );
    typia.assert(attachment);
    typia.assert(attachment.id);
    attachmentIds.push(attachment.id);
  }

  // Test 1: Retrieve first page with default limit
  const page1 = await api.functional.discussionBoard.articles.attachments.index(
    connection,
    {
      articleId: article.id,
      body: {
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardAttachment.IRequest,
    },
  );
  typia.assert(page1);
  typia.assert(page1.pagination);
  TestValidator.equals(
    "first page should have 10 items",
    page1.data.length,
    10,
  );
  TestValidator.equals(
    "total records should be 30",
    page1.pagination.records,
    30,
  );
  TestValidator.equals("current page should be 1", page1.pagination.current, 1);
  TestValidator.equals("limit should be 10", page1.pagination.limit, 10);
  TestValidator.equals("total pages should be 3", page1.pagination.pages, 3);

  // Test 2: Retrieve second page
  const page2 = await api.functional.discussionBoard.articles.attachments.index(
    connection,
    {
      articleId: article.id,
      body: {
        page: 2,
        limit: 10,
      } satisfies IDiscussionBoardAttachment.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.equals(
    "second page should have 10 items",
    page2.data.length,
    10,
  );
  TestValidator.equals("current page should be 2", page2.pagination.current, 2);

  // Test 3: Retrieve third page with remaining items
  const page3 = await api.functional.discussionBoard.articles.attachments.index(
    connection,
    {
      articleId: article.id,
      body: {
        page: 3,
        limit: 10,
      } satisfies IDiscussionBoardAttachment.IRequest,
    },
  );
  typia.assert(page3);
  TestValidator.equals(
    "third page should have remaining 10 items",
    page3.data.length,
    10,
  );

  // Test 4: Test different page size (20 items per page)
  const pageLarge =
    await api.functional.discussionBoard.articles.attachments.index(
      connection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardAttachment.IRequest,
      },
    );
  typia.assert(pageLarge);
  TestValidator.equals(
    "page with limit 20 should have 20 items",
    pageLarge.data.length,
    20,
  );
  TestValidator.equals(
    "total pages with limit 20 should be 2",
    pageLarge.pagination.pages,
    2,
  );

  // Test 5: Test sorting by created_at ascending
  const sortAsc =
    await api.functional.discussionBoard.articles.attachments.index(
      connection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 30,
          sort_by: "created_at",
          sort_order: "asc",
        } satisfies IDiscussionBoardAttachment.IRequest,
      },
    );
  typia.assert(sortAsc);
  TestValidator.predicate(
    "items should be sorted ascending by creation time",
    () => {
      for (let i = 0; i < sortAsc.data.length - 1; i++) {
        const curr = new Date(sortAsc.data[i].created_at).getTime();
        const next = new Date(sortAsc.data[i + 1].created_at).getTime();
        if (curr > next) return false;
      }
      return true;
    },
  );

  // Test 6: Test sorting by created_at descending
  const sortDesc =
    await api.functional.discussionBoard.articles.attachments.index(
      connection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 30,
          sort_by: "created_at",
          sort_order: "desc",
        } satisfies IDiscussionBoardAttachment.IRequest,
      },
    );
  typia.assert(sortDesc);
  TestValidator.predicate(
    "items should be sorted descending by creation time",
    () => {
      for (let i = 0; i < sortDesc.data.length - 1; i++) {
        const curr = new Date(sortDesc.data[i].created_at).getTime();
        const next = new Date(sortDesc.data[i + 1].created_at).getTime();
        if (curr < next) return false;
      }
      return true;
    },
  );

  // Test 7: Test sorting by filename
  const sortByFilename =
    await api.functional.discussionBoard.articles.attachments.index(
      connection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 30,
          sort_by: "filename",
          sort_order: "asc",
        } satisfies IDiscussionBoardAttachment.IRequest,
      },
    );
  typia.assert(sortByFilename);
  TestValidator.predicate(
    "items should be sorted ascending by filename",
    () => {
      for (let i = 0; i < sortByFilename.data.length - 1; i++) {
        if (
          sortByFilename.data[i].filename > sortByFilename.data[i + 1].filename
        ) {
          return false;
        }
      }
      return true;
    },
  );

  // Test 8: Test sorting by file_size
  const sortBySize =
    await api.functional.discussionBoard.articles.attachments.index(
      connection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 30,
          sort_by: "file_size",
          sort_order: "asc",
        } satisfies IDiscussionBoardAttachment.IRequest,
      },
    );
  typia.assert(sortBySize);
  TestValidator.predicate(
    "items should be sorted ascending by file size",
    () => {
      for (let i = 0; i < sortBySize.data.length - 1; i++) {
        if (sortBySize.data[i].file_size > sortBySize.data[i + 1].file_size) {
          return false;
        }
      }
      return true;
    },
  );

  // Test 9: Test pagination with small page size (5 items)
  const pageSmall =
    await api.functional.discussionBoard.articles.attachments.index(
      connection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardAttachment.IRequest,
      },
    );
  typia.assert(pageSmall);
  TestValidator.equals(
    "small page should have 5 items",
    pageSmall.data.length,
    5,
  );
  TestValidator.equals(
    "total pages with limit 5 should be 6",
    pageSmall.pagination.pages,
    6,
  );

  // Test 10: Test last page with small page size
  const lastPage =
    await api.functional.discussionBoard.articles.attachments.index(
      connection,
      {
        articleId: article.id,
        body: {
          page: 6,
          limit: 5,
        } satisfies IDiscussionBoardAttachment.IRequest,
      },
    );
  typia.assert(lastPage);
  TestValidator.equals(
    "last page should have remaining 5 items",
    lastPage.data.length,
    5,
  );

  // Test 11: Verify all items across pages are unique
  const allAttachments =
    await api.functional.discussionBoard.articles.attachments.index(
      connection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardAttachment.IRequest,
      },
    );
  typia.assert(allAttachments);
  const allIds = new Set(allAttachments.data.map((a) => a.id));
  TestValidator.equals(
    "all attachment IDs should be unique",
    allIds.size,
    allAttachments.data.length,
  );
}
