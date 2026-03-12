import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test that guest users can browse articles without authentication using pagination.
 *
 * This test verifies that:
 * 1. Guest users can access articles without authentication
 * 2. Pagination metadata is correctly calculated
 * 3. Article summaries contain all required fields
 * 4. Default sorting is by creation date descending
 * 5. Pagination navigation works correctly across multiple pages
 */
export async function test_api_article_guest_browsing_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Fetch first page of articles (guest access, no authentication)
  const page1 = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        sortBy: "createdAt",
        sortOrder: "desc",
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(page1);
  // 2. Verify pagination metadata for page 1
  TestValidator.equals("current page is 1", page1.pagination.current, 1);
  TestValidator.equals("limit is 10", page1.pagination.limit, 10);
  TestValidator.predicate(
    "records count is non-negative",
    page1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is calculated correctly",
    page1.pagination.pages ===
      Math.ceil(page1.pagination.records / page1.pagination.limit),
  );
  // 3. Verify data array length matches expected
  const expectedCount = Math.min(10, page1.pagination.records);
  TestValidator.equals(
    "data array length matches expected",
    page1.data.length,
    expectedCount,
  );
  // 4. Verify each article summary contains required fields
  await ArrayUtil.asyncForEach(page1.data, async (article) => {
    typia.assert(article);
    // Verify article has non-empty title (business logic)
    TestValidator.predicate("article has title", article.title.length > 0);
    // Verify section information
    typia.assert(article.section);
    TestValidator.predicate(
      "section has name",
      article.section.name.length > 0,
    );
    // Verify author information
    typia.assert(article.author);
    // Note: email format already validated by typia.assert()
    // Verify article is not soft-deleted (business logic)
    TestValidator.equals(
      "deleted_at is null for active article",
      article.deleted_at,
      null,
    );
  });
  // 5. Verify default sorting by created_at DESC (newest first)
  if (page1.data.length > 1) {
    await ArrayUtil.asyncForEach(
      Array.from({ length: page1.data.length - 1 }, (_, i) => i),
      async (index) => {
        TestValidator.predicate(
          `article ${index + 1} is not older than article ${index + 2}`,
          new Date(page1.data[index].created_at).getTime() >=
            new Date(page1.data[index + 1].created_at).getTime(),
        );
      },
    );
  }
  // 1. Fetch first page of articles (guest access, no authentication)
  if (page1.pagination.pages >= 2) {
    const page2 = await api.functional.discussionBoard.articles.index(
      connection,
      {
        body: {
          page: 2,
          limit: 10,
          sortBy: "createdAt",
          sortOrder: "desc",
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
    typia.assert(page2);
    // Verify pagination metadata for page 2
    TestValidator.equals("current page is 2", page2.pagination.current, 2);
    TestValidator.equals("limit is 10", page2.pagination.limit, 10);
    TestValidator.equals(
      "records count matches page 1",
      page2.pagination.records,
      page1.pagination.records,
    );
    TestValidator.equals(
      "pages count matches page 1",
      page2.pagination.pages,
      page1.pagination.pages,
    );
    // Verify page 2 returns different articles than page 1
    const page1Ids = new Set(page1.data.map((a) => a.id));
    const hasOverlap = page2.data.some((a) => page1Ids.has(a.id));
    TestValidator.predicate(
      "page 2 has no overlapping articles with page 1",
      !hasOverlap,
    );
    // Verify page 2 articles are older than page 1 articles (due to DESC sorting)
    if (page1.data.length > 0 && page2.data.length > 0) {
      const oldestPage1 = new Date(
        page1.data[page1.data.length - 1].created_at,
      ).getTime();
      const newestPage2 = new Date(page2.data[0].created_at).getTime();
      TestValidator.predicate(
        "newest article on page 2 is not newer than oldest on page 1",
        newestPage2 <= oldestPage1,
      );
    }
    // Verify page 2 articles have required fields
    await ArrayUtil.asyncForEach(page2.data, async (article) => {
      typia.assert(article);
      TestValidator.predicate("article has title", article.title.length > 0);
      TestValidator.equals(
        "deleted_at is null for active article",
        article.deleted_at,
        null,
      );
    });
  }
  // 7. Test with different limit value
  const pageWithLimit5 = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        page: 1,
        limit: 5,
        sortBy: "createdAt",
        sortOrder: "desc",
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(pageWithLimit5);
  TestValidator.equals(
    "current page is 1",
    pageWithLimit5.pagination.current,
    1,
  );
  TestValidator.equals("limit is 5", pageWithLimit5.pagination.limit, 5);
  TestValidator.equals(
    "records count matches previous requests",
    pageWithLimit5.pagination.records,
    page1.pagination.records,
  );
  const expectedCountLimit5 = Math.min(5, pageWithLimit5.pagination.records);
  TestValidator.equals(
    "data array length matches expected for limit 5",
    pageWithLimit5.data.length,
    expectedCountLimit5,
  );
}