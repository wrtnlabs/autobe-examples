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
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";

export async function test_api_member_articles_list_by_author(
  connection: api.IConnection,
) {
  // 1. Register a new member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "TestPassword123";

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(member);

  // 2. Create first article in Economics category
  const economicsArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 2,
          wordMax: 5,
        }),
        content: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
        category_code: "economics",
        attachments: undefined,
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(economicsArticle);
  TestValidator.equals(
    "economics article created",
    economicsArticle.category.code,
    "economics",
  );

  // 3. Create second article in Politics category
  const politicsArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 2,
          wordMax: 5,
        }),
        content: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
        category_code: "politics",
        attachments: undefined,
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(politicsArticle);
  TestValidator.equals(
    "politics article created",
    politicsArticle.category.code,
    "politics",
  );

  // 4. Create third article for pagination testing
  const thirdArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 2,
          wordMax: 5,
        }),
        content: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
        category_code: "economics",
        attachments: undefined,
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(thirdArticle);

  // 5. Test listing all member's articles without filters
  const allArticlesPage: IPageIDiscussionBoardArticle =
    await api.functional.discussionBoard.member.me.articles.index(connection, {
      body: {
        search: undefined,
        category: undefined,
        author_id: undefined,
        sort_by: "created_at",
        sort_order: "desc",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(allArticlesPage);
  TestValidator.predicate(
    "all articles listed",
    allArticlesPage.data.length >= 3,
  );

  // 6. Test filtering by Economics category
  const economicsPage: IPageIDiscussionBoardArticle =
    await api.functional.discussionBoard.member.me.articles.index(connection, {
      body: {
        search: undefined,
        category: "economics",
        author_id: undefined,
        sort_by: "created_at",
        sort_order: "desc",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(economicsPage);
  TestValidator.predicate(
    "economics filter working",
    economicsPage.data.every(
      (article) => article.category.code === "economics",
    ),
  );

  // 7. Test filtering by Politics category
  const politicsPage: IPageIDiscussionBoardArticle =
    await api.functional.discussionBoard.member.me.articles.index(connection, {
      body: {
        search: undefined,
        category: "politics",
        author_id: undefined,
        sort_by: "created_at",
        sort_order: "desc",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(politicsPage);
  TestValidator.predicate(
    "politics filter working",
    politicsPage.data.every((article) => article.category.code === "politics"),
  );

  // 8. Test pagination with page size 2
  const paginatedPage1: IPageIDiscussionBoardArticle =
    await api.functional.discussionBoard.member.me.articles.index(connection, {
      body: {
        search: undefined,
        category: undefined,
        author_id: undefined,
        sort_by: "created_at",
        sort_order: "desc",
        page: 1,
        limit: 2,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(paginatedPage1);
  TestValidator.equals("page 1 limit 2", paginatedPage1.pagination.limit, 2);

  // 9. Test pagination page 2
  const paginatedPage2: IPageIDiscussionBoardArticle =
    await api.functional.discussionBoard.member.me.articles.index(connection, {
      body: {
        search: undefined,
        category: undefined,
        author_id: undefined,
        sort_by: "created_at",
        sort_order: "desc",
        page: 2,
        limit: 2,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(paginatedPage2);
  TestValidator.equals("page 2 limit 2", paginatedPage2.pagination.limit, 2);

  // 10. Test sorting by newest first
  const newestFirstPage: IPageIDiscussionBoardArticle =
    await api.functional.discussionBoard.member.me.articles.index(connection, {
      body: {
        search: undefined,
        category: undefined,
        author_id: undefined,
        sort_by: "created_at",
        sort_order: "desc",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(newestFirstPage);
  if (newestFirstPage.data.length > 1) {
    TestValidator.predicate(
      "newest first sorting",
      newestFirstPage.data[0].created_at >=
        newestFirstPage.data[newestFirstPage.data.length - 1].created_at,
    );
  }

  // 11. Test sorting by oldest first
  const oldestFirstPage: IPageIDiscussionBoardArticle =
    await api.functional.discussionBoard.member.me.articles.index(connection, {
      body: {
        search: undefined,
        category: undefined,
        author_id: undefined,
        sort_by: "created_at",
        sort_order: "asc",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(oldestFirstPage);
  if (oldestFirstPage.data.length > 1) {
    TestValidator.predicate(
      "oldest first sorting",
      oldestFirstPage.data[0].created_at <=
        oldestFirstPage.data[oldestFirstPage.data.length - 1].created_at,
    );
  }

  // 12. Test keyword search by article title
  const titleKeyword = economicsArticle.title.substring(0, 10);
  const searchByTitlePage: IPageIDiscussionBoardArticle =
    await api.functional.discussionBoard.member.me.articles.index(connection, {
      body: {
        search: titleKeyword,
        category: undefined,
        author_id: undefined,
        sort_by: "relevance",
        sort_order: "desc",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(searchByTitlePage);

  // 13. Test pagination info structure
  TestValidator.predicate(
    "pagination has current",
    paginatedPage1.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination has limit",
    paginatedPage1.pagination.limit === 2,
  );
  TestValidator.predicate(
    "pagination has records",
    paginatedPage1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages",
    paginatedPage1.pagination.pages >= 0,
  );

  // 14. Test that all returned articles have required fields
  TestValidator.predicate(
    "all articles have id",
    allArticlesPage.data.every(
      (article) => article.id !== undefined && article.id !== "",
    ),
  );
  TestValidator.predicate(
    "all articles have title",
    allArticlesPage.data.every(
      (article) => article.title !== undefined && article.title !== "",
    ),
  );
  TestValidator.predicate(
    "all articles have content",
    allArticlesPage.data.every(
      (article) => article.content !== undefined && article.content !== "",
    ),
  );
  TestValidator.predicate(
    "all articles have status published",
    allArticlesPage.data.every((article) => article.status === "published"),
  );
  TestValidator.predicate(
    "all articles have author",
    allArticlesPage.data.every((article) => article.author !== undefined),
  );

  // 15. Test engagement metrics are present
  TestValidator.predicate(
    "all articles have view count",
    allArticlesPage.data.every((article) => article.view_count >= 0),
  );
  TestValidator.predicate(
    "all articles have revision number",
    allArticlesPage.data.every((article) => article.revision_number >= 0),
  );
}
