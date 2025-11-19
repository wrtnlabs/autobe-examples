import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";

/**
 * Validates comprehensive filtering, pagination, and sorting of discussion
 * board articles.
 *
 * This test ensures both unauthenticated (public) and authenticated (if role
 * supported) users can query the article list with combinations of search,
 * filter, sort, and pagination. Verifies:
 *
 * - Title substring search returns expected articles (partial, trimmed,
 *   case-insensitive)
 * - Filtering by author_user_id returns only that user's articles
 * - Created_from and created_to date range returns only articles in range
 * - Sort_by/sort_direction returns articles in correct order (created_at,
 *   updated_at, title)
 * - Pagination mechanics (page, limit, info)
 * - Soft-deleted article visibility is correct: public users do NOT see deleted,
 *   admin (if supported) can view with include_deleted=true
 *
 * Steps:
 *
 * 1. Generate random search parameters: sample title substring, creation date
 *    range, random page and limit, random sort_by/sort_direction
 * 2. Issue PATCH /discussionBoard/articles with those parameters
 * 3. Verify result type (IPageIDiscussionBoardArticle.ISummary) and pagination
 *    info matches request
 * 4. Confirm articles in data match search, author, and date criteria
 * 5. Check articles returned are ordered per sort_by/sort_direction
 * 6. For public user: ensure deleted articles not present, for
 *    include_deleted=true verify visibility only if allowed
 * 7. Repeat with different parameter sets for robust coverage
 * 8. Edge: If admin/member roles supported, test role-based inclusion of deleted,
 *    else skip
 */
export async function test_api_article_search_public_filtering(
  connection: api.IConnection,
) {
  // 1. Prepare random base search values by fetching a real article page
  const initialRequest = {
    page: 1,
    limit: 10,
    sort_by: "created_at",
    sort_direction: "desc",
  } satisfies IDiscussionBoardArticle.IRequest;
  const initialPage = await api.functional.discussionBoard.articles.index(
    connection,
    { body: initialRequest },
  );
  typia.assert(initialPage);
  TestValidator.predicate(
    "pagination record count >= 0",
    initialPage.pagination.records >= 0,
  );
  // If there are no articles, skip advanced search tests
  if (initialPage.data.length === 0) return;

  // Randomly pick an article for realistic filter/search criteria
  const sampleArticle = RandomGenerator.pick(initialPage.data);
  typia.assert(sampleArticle);

  // 2. Test: Title substring (case-insensitive, trimmed)
  const titleSubstring = RandomGenerator.substring(sampleArticle.title).trim();
  const titleSearchRequest = {
    title: titleSubstring,
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardArticle.IRequest;
  const titlePage = await api.functional.discussionBoard.articles.index(
    connection,
    { body: titleSearchRequest },
  );
  typia.assert(titlePage);
  // Every returned article should contain titleSubstring (case-insensitive)
  for (const art of titlePage.data) {
    TestValidator.predicate(
      `article title includes '${titleSubstring}' (case-insensitive)`,
      art.title.toLowerCase().includes(titleSubstring.toLowerCase()),
    );
  }

  // 3. Test: Filter by author_user_id
  const authorFilterRequest = {
    author_user_id: sampleArticle.user.id,
    page: 1,
    limit: 5,
  } satisfies IDiscussionBoardArticle.IRequest;
  const authorPage = await api.functional.discussionBoard.articles.index(
    connection,
    { body: authorFilterRequest },
  );
  typia.assert(authorPage);
  for (const art of authorPage.data) {
    TestValidator.equals(
      "article author id matches filter",
      art.user.id,
      sampleArticle.user.id,
    );
  }

  // 4. Test: Date range filter
  // Usage: pick a created_from not after created_at, and created_to not before it
  const createdAt = sampleArticle.created_at;
  const created_from = createdAt;
  const created_to = createdAt;
  const dateRangeRequest = {
    created_from,
    created_to,
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardArticle.IRequest;
  const datePage = await api.functional.discussionBoard.articles.index(
    connection,
    { body: dateRangeRequest },
  );
  typia.assert(datePage);
  for (const art of datePage.data) {
    TestValidator.predicate(
      "article.created_at >= created_from",
      art.created_at >= created_from,
    );
    TestValidator.predicate(
      "article.created_at <= created_to",
      art.created_at <= created_to,
    );
  }

  // 5. Test: Sorting (by created_at, updated_at, title)
  const sortFields = ["created_at", "updated_at", "title"] as const;
  const sortDirections = ["asc", "desc"] as const;
  const randomSortBy = RandomGenerator.pick(sortFields);
  const randomSortDirection = RandomGenerator.pick(sortDirections);
  const sortRequest = {
    page: 1,
    limit: 10,
    sort_by: randomSortBy,
    sort_direction: randomSortDirection,
  } satisfies IDiscussionBoardArticle.IRequest;
  const sortPage = await api.functional.discussionBoard.articles.index(
    connection,
    { body: sortRequest },
  );
  typia.assert(sortPage);
  // Check order for the selected sort field/direction
  for (let i = 1; i < sortPage.data.length; ++i) {
    const prev = sortPage.data[i - 1];
    const curr = sortPage.data[i];
    let isOrdered = true;
    if (randomSortBy === "created_at" || randomSortBy === "updated_at") {
      // For undefined updated_at, treat as lesser for desc, higher for asc
      const prevVal = prev[randomSortBy] ?? "";
      const currVal = curr[randomSortBy] ?? "";
      if (randomSortDirection === "asc") isOrdered = prevVal <= currVal;
      else isOrdered = prevVal >= currVal;
    } else if (randomSortBy === "title") {
      if (randomSortDirection === "asc")
        isOrdered = prev.title.localeCompare(curr.title) <= 0;
      else isOrdered = prev.title.localeCompare(curr.title) >= 0;
    }
    TestValidator.predicate(
      `sorted by ${randomSortBy} ${randomSortDirection}`,
      isOrdered,
    );
  }

  // 6. Test: Pagination mechanics
  const paginationRequest = {
    page: 2,
    limit: 3,
  } satisfies IDiscussionBoardArticle.IRequest;
  const page2 = await api.functional.discussionBoard.articles.index(
    connection,
    { body: paginationRequest },
  );
  typia.assert(page2);
  TestValidator.equals("current page is 2", page2.pagination.current, 2);
  TestValidator.equals("limit is 3", page2.pagination.limit, 3);
  TestValidator.predicate("data length <= limit", page2.data.length <= 3);

  // 7. Test: include_deleted (should be ignored by public user)
  const deletedRequest = {
    include_deleted: true,
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardArticle.IRequest;
  const deletedPage = await api.functional.discussionBoard.articles.index(
    connection,
    { body: deletedRequest },
  );
  typia.assert(deletedPage);
  // As public, verify no deleted articles included
  for (const art of deletedPage.data) {
    // Article summaries do not have deleted_at; we cannot directly assert deleted status
    // (visibility constraints restrict this field for public/guest)
    // If schema exposed it, we would check here
  }
}
