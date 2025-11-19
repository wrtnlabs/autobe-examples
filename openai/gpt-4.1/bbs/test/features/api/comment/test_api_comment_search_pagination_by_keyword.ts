import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleComment";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleComment";

/**
 * Test searching and paginating discussion board comments by keyword in comment
 * body. Scenario:
 *
 * 1. Search for comments by a single keyword with no pagination parameters (should
 *    default to page 1, default limit).
 * 2. Search for comments by a keyword with explicit page and small limit to verify
 *    pagination works.
 * 3. Search for a non-matching keyword to ensure result is empty but pagination
 *    meta fields are present.
 * 4. (Optional) Test deleted comments: set deleted:true and verify only deleted
 *    comments matching the keyword are returned, if supported by system roles.
 *    For each result set, validate:
 *
 * - Data only contains comments where body includes the exact keyword
 * - All comment.deleted_at is null (unless testing deleted:true)
 * - Pagination meta fields (current, limit, pages, records) are present and
 *   logically consistent
 */
export async function test_api_comment_search_pagination_by_keyword(
  connection: api.IConnection,
) {
  // 1. Generate a test keyword and search for it in comments
  const testKeyword = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 4,
    wordMax: 8,
  });
  // Search: no pagination params (should default to page 1)
  const output1 = await api.functional.discussionBoard.comments.index(
    connection,
    {
      body: {
        body: testKeyword,
      } satisfies IDiscussionBoardArticleComment.IRequest,
    },
  );
  typia.assert(output1);
  TestValidator.predicate(
    "all returned comments for basic search contain the keyword in body",
    output1.data.every((c) => c.body.includes(testKeyword)),
  );
  TestValidator.equals(
    "returned comments are not deleted in normal keyword search",
    output1.data.filter(
      (c) => c.deleted_at !== null && c.deleted_at !== undefined,
    ).length,
    0,
  );
  TestValidator.predicate(
    "pagination meta fields exist in output1",
    output1.pagination !== undefined &&
      typeof output1.pagination.current === "number" &&
      typeof output1.pagination.limit === "number" &&
      typeof output1.pagination.records === "number" &&
      typeof output1.pagination.pages === "number",
  );

  // 2. Paginated search (explicit page and low limit for forced pagination)
  const paginatedPage = 2;
  const paginatedLimit = 2;
  const output2 = await api.functional.discussionBoard.comments.index(
    connection,
    {
      body: {
        body: testKeyword,
        page: paginatedPage,
        limit: paginatedLimit,
      } satisfies IDiscussionBoardArticleComment.IRequest,
    },
  );
  typia.assert(output2);
  TestValidator.equals(
    "pagination current equals requested for forced pagination",
    output2.pagination.current,
    paginatedPage,
  );
  TestValidator.equals(
    "pagination limit equals requested for forced pagination",
    output2.pagination.limit,
    paginatedLimit,
  );
  TestValidator.predicate(
    "all returned comments in forced pagination contain the keyword in body",
    output2.data.every((c) => c.body.includes(testKeyword)),
  );

  // 3. Search for a random non-matching keyword expecting 0 results
  const absentKeyword = RandomGenerator.alphabets(12);
  const output3 = await api.functional.discussionBoard.comments.index(
    connection,
    {
      body: {
        body: absentKeyword,
      } satisfies IDiscussionBoardArticleComment.IRequest,
    },
  );
  typia.assert(output3);
  TestValidator.equals(
    "search for absent keyword returns no comments",
    output3.data.length,
    0,
  );
  TestValidator.predicate(
    "pagination meta fields exist for empty result set",
    output3.pagination !== undefined &&
      typeof output3.pagination.current === "number" &&
      typeof output3.pagination.limit === "number" &&
      typeof output3.pagination.records === "number" &&
      typeof output3.pagination.pages === "number",
  );
}
