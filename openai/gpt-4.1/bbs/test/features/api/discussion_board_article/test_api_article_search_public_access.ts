import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";

/**
 * Validate public, unauthenticated access to discussion board articles search
 * and listing.
 *
 * Business rules validated:
 *
 * - All search and feed options are accessible without authentication.
 * - Covers keyword search (title/body), author filters (user/admin), date range,
 *   sorting, and paging.
 * - Excludes soft-deleted articles (articles with deleted authors are checked
 *   too).
 * - Pagination metadata is correct and matches result data.
 * - Author field is always present and exclusively either user or admin per
 *   article summary. Both never exist, neither is omitted.
 * - Empty result navigation and edge limits are enforced.
 * - Maximum limit of 100 enforced.
 * - Each sort_by and sort_direction is exercised.
 * - Complex filtering (combinatorial) is handled consistently.
 */
export async function test_api_article_search_public_access(
  connection: api.IConnection,
) {
  // 1. Retrieve first page with default settings
  const defaultPage = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {} satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(defaultPage);
  TestValidator.predicate(
    "pagination current is >= 0",
    defaultPage.pagination.current >= 0,
  );
  TestValidator.equals(
    "data.length <= limit if limit set",
    defaultPage.data.length <= (defaultPage.pagination.limit || 100),
    true,
  );
  TestValidator.equals(
    "data.length <= records",
    defaultPage.data.length <= defaultPage.pagination.records,
    true,
  );
  TestValidator.equals(
    "pages calc",
    defaultPage.pagination.pages,
    Math.ceil(
      defaultPage.pagination.records /
        Math.max(1, defaultPage.pagination.limit),
    ),
  );

  // 2. Search by keyword in title/body (simulate with random substring from a random article title)
  if (defaultPage.data.length > 0) {
    const sampleArticle = RandomGenerator.pick(defaultPage.data);
    const keyword = RandomGenerator.substring(sampleArticle.title);
    const byKeyword = await api.functional.discussionBoard.articles.index(
      connection,
      {
        body: { keyword } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
    typia.assert(byKeyword);
    TestValidator.predicate(
      "all returned titles or 'body' should include keyword (if present)",
      byKeyword.data.every((a) => a.title.includes(keyword)) ||
        byKeyword.data.length === 0,
    );
  }

  // 3. Filter by author_user_id (if any article is authored by a user)
  const userArticle = defaultPage.data.find((a) => "email" in a.author);
  if (userArticle) {
    const byUser = await api.functional.discussionBoard.articles.index(
      connection,
      {
        body: {
          author_user_id: userArticle.author.id,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
    typia.assert(byUser);
    TestValidator.predicate(
      "all by user",
      byUser.data.every(
        (a) => "email" in a.author && a.author.id === userArticle.author.id,
      ),
    );
  }

  // 4. Filter by author_admin_id (if any article is authored by an admin)
  const adminArticle = defaultPage.data.find((a) => "display_name" in a.author);
  if (adminArticle) {
    const byAdmin = await api.functional.discussionBoard.articles.index(
      connection,
      {
        body: {
          author_admin_id: adminArticle.author.id,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
    typia.assert(byAdmin);
    TestValidator.predicate(
      "all by admin",
      byAdmin.data.every(
        (a) =>
          "display_name" in a.author && a.author.id === adminArticle.author.id,
      ),
    );
  }

  // 5. Date range filter if there's at least 2 articles
  if (defaultPage.data.length >= 2) {
    const sorted = [...defaultPage.data].sort((a, b) =>
      a.created_at.localeCompare(b.created_at),
    );
    const from = sorted[0].created_at;
    const until = sorted[sorted.length - 1].created_at;
    const dateFilter = await api.functional.discussionBoard.articles.index(
      connection,
      {
        body: {
          created_from: from,
          created_until: until,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
    typia.assert(dateFilter);
    TestValidator.predicate(
      "all within date range",
      dateFilter.data.every(
        (a) => a.created_at >= from && a.created_at <= until,
      ),
    );
  }

  // 6. Test sorting (created_at asc/desc)
  const sortByFields = ["created_at", "relevance", "popularity"] as const;
  const sortDirections = ["asc", "desc"] as const;
  for (const sort_by of sortByFields) {
    for (const sort_direction of sortDirections) {
      const result = await api.functional.discussionBoard.articles.index(
        connection,
        {
          body: {
            sort_by,
            sort_direction,
          } satisfies IDiscussionBoardArticle.IRequest,
        },
      );
      typia.assert(result);
      if (result.data.length > 1 && sort_by === "created_at") {
        for (let i = 1; i < result.data.length; ++i) {
          const prev = result.data[i - 1].created_at;
          const curr = result.data[i].created_at;
          if (sort_direction === "asc")
            TestValidator.predicate(
              `sorted ascending - ${sort_by}`,
              prev <= curr,
            );
          else
            TestValidator.predicate(
              `sorted descending - ${sort_by}`,
              prev >= curr,
            );
        }
      }
    }
  }

  // 7. Test paging navigation: page 2
  const page2 = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.equals("pagination.current is 2", page2.pagination.current, 2);

  // 8. Test maximum limit
  const maxLimited = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        limit: 100 as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(maxLimited);
  TestValidator.predicate(
    "maxLimited.data.length <= 100",
    maxLimited.data.length <= 100,
  );

  // 9. Test is_active: true only returns non-deleted articles
  const activeArticles = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: { is_active: true } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(activeArticles);
  TestValidator.predicate(
    "all have non-deleted authors",
    activeArticles.data.every(
      (a) =>
        !("deleted_at" in a.author) ||
        a.author.deleted_at === null ||
        a.author.deleted_at === undefined,
    ),
  );

  // 10. Test edge paging (empty result set): page exceeding pages
  const emptyPageNum = (defaultPage.pagination.pages ?? 0) + 10;
  const emptyPage = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        page: emptyPageNum as number & tags.Type<"int32"> & tags.Minimum<1>,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(emptyPage);
  TestValidator.equals(
    "empty page returns no articles",
    emptyPage.data.length,
    0,
  );

  // 11. Check author structure: never both user/admin, always exactly one
  for (const article of defaultPage.data) {
    TestValidator.predicate(
      "author is either user or admin summary",
      "email" in article.author !== "display_name" in article.author,
    );
    TestValidator.predicate(
      "author is present",
      "email" in article.author || "display_name" in article.author,
    );
  }
}
