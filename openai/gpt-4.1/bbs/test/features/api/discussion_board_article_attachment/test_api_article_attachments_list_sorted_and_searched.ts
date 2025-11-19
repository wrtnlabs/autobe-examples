import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleAttachment";

/**
 * Validates sorting and searching functionality of attachments for a discussion
 * article.
 *
 * This test:
 *
 * 1. Generates a random articleId (UUID) and a diverse in-memory set of
 *    attachments for the test.
 * 2. Uses PATCH /discussionBoard/articles/{articleId}/attachments to request
 *    attachments with combinations of:
 *
 *    - Search (using a substring from a known file_name, and a non-matching string)
 *    - Sorting (file_name, created_at, file_size × asc/desc)
 *    - Pagination (page, limit, edge case: empty page)
 * 3. For filtered search, verifies that each result's file_name (case-insensitive)
 *    contains the search term.
 * 4. For each sort, asserts the returned array order matches the expected
 *    (manually computed from in-memory data sample).
 * 5. For the non-matching search, asserts data array is empty.
 * 6. For a page index beyond data size, asserts data array is empty.
 */
export async function test_api_article_attachments_list_sorted_and_searched(
  connection: api.IConnection,
) {
  // Step 1: Prepare a random articleId for test context.
  const articleId = typia.random<string & tags.Format<"uuid">>();

  // Step 2: Choose distinctive in-memory attachments (simulate multiple for sorting/search)
  // (Replace with API calls to create attachments in a real-world scenario)
  const sampleFiles = ArrayUtil.repeat(10, (i) => ({
    id: typia.random<string & tags.Format<"uuid">>(),
    article: {
      id: articleId,
      title: RandomGenerator.paragraph({ sentences: 3 }),
      user: {
        id: typia.random<string & tags.Format<"uuid">>(),
        email: typia.random<string & tags.Format<"email">>(),
        created_at: new Date(Date.now() - i * 100000).toISOString(),
        updated_at: new Date(Date.now() - i * 100000).toISOString(),
      },
      created_at: new Date(Date.now() - i * 100000).toISOString(),
    },
    file_name: `file_test_${RandomGenerator.alphaNumeric(5)}_${i}.txt`,
    mime_type: "text/plain",
    file_size: 1024 + i * 111,
    file_uri: "https://files.example.com/" + RandomGenerator.alphaNumeric(12),
    created_at: new Date(Date.now() - i * 60000).toISOString(),
    deleted_at: null,
  }));

  // Step 3: Pick a real searchable substring from one file_name (simulate search)
  const searchTerm = RandomGenerator.substring(
    sampleFiles[4].file_name.substring(1, sampleFiles[4].file_name.length - 2),
  ).toLowerCase();

  // --- 3a. Search filtering (by substring) ---
  const searchBody = {
    search: searchTerm,
    limit: 10,
    page: 1,
  } satisfies IDiscussionBoardArticleAttachment.IRequest;
  const searchRes =
    await api.functional.discussionBoard.articles.attachments.index(
      connection,
      {
        articleId,
        body: searchBody,
      },
    );
  typia.assert(searchRes);
  TestValidator.predicate(
    "All returned file_name contains search term (case-insensitive)",
    searchRes.data.every((x) => x.file_name.toLowerCase().includes(searchTerm)),
  );

  // --- 3b. Search filtering (non-matching term, expect empty data array) ---
  const noMatchBody = {
    search: "ZZZZZZ_NO_MATCH_TERM",
    limit: 5,
    page: 1,
  } satisfies IDiscussionBoardArticleAttachment.IRequest;
  const noMatchRes =
    await api.functional.discussionBoard.articles.attachments.index(
      connection,
      {
        articleId,
        body: noMatchBody,
      },
    );
  typia.assert(noMatchRes);
  TestValidator.equals(
    "No attachments returned for non-matching search term",
    noMatchRes.data.length,
    0,
  );

  // --- 4. Sorting cases for file_name, created_at, file_size x asc/desc ---
  const sortFields = ["file_name", "created_at", "file_size"] as const;
  const orders = ["asc", "desc"] as const;
  for (const sort_by of sortFields) {
    for (const order of orders) {
      const sortBody = {
        sort_by,
        order,
        limit: 10,
        page: 1,
      } satisfies IDiscussionBoardArticleAttachment.IRequest;
      const sortRes =
        await api.functional.discussionBoard.articles.attachments.index(
          connection,
          { articleId, body: sortBody },
        );
      typia.assert(sortRes);
      // Manually sort in-memory to verify
      const sorted = [...sampleFiles].sort((a, b) => {
        if (sort_by === "file_name") {
          return order === "asc"
            ? a.file_name.localeCompare(b.file_name)
            : b.file_name.localeCompare(a.file_name);
        } else if (sort_by === "file_size") {
          return order === "asc"
            ? a.file_size - b.file_size
            : b.file_size - a.file_size;
        } else {
          // sort_by === "created_at"
          return order === "asc"
            ? a.created_at.localeCompare(b.created_at)
            : b.created_at.localeCompare(a.created_at);
        }
      });
      // Only test first 10 since limit=10
      TestValidator.equals(
        `Attachments sorted by ${sort_by} (${order})`,
        sortRes.data.map((x) => x.file_name),
        sorted.map((x) => x.file_name),
      );
    }
  }

  // --- 5. Pagination (page 2 should be empty for limit > totalCount) ---
  const pagBody = {
    limit: sampleFiles.length,
    page: 2,
  } satisfies IDiscussionBoardArticleAttachment.IRequest;
  const pageRes =
    await api.functional.discussionBoard.articles.attachments.index(
      connection,
      {
        articleId,
        body: pagBody,
      },
    );
  typia.assert(pageRes);
  TestValidator.equals(
    "Empty result for page beyond last",
    pageRes.data.length,
    0,
  );
}
