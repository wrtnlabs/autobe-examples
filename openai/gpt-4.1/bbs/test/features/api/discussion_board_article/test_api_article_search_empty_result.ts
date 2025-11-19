import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";

/**
 * Verify that the endpoint returns an empty result with correct structure when
 * no articles match the filters (e.g., filter for a non-existent title or
 * author_user_id). Confirm pagination fields reflect empty dataset and query
 * returns no errors.
 *
 * Steps:
 *
 * 1. Generate a random string for a title that does not exist (extremely unlikely
 *    match).
 * 2. Generate a random UUID for an author_user_id that should not exist.
 * 3. Call the API with each of these filters (once with just title, once with just
 *    author_user_id), and also together.
 * 4. Assert each API call returns IPageIDiscussionBoardArticle.ISummary with data
 *    = [], and pagination.records/pagination.pages === 0.
 * 5. Ensure calls do not throw or produce any error responses.
 */
export async function test_api_article_search_empty_result(
  connection: api.IConnection,
) {
  // 1. Generate a random unique string and UUID that will not match any real article
  const nonExistentTitle =
    RandomGenerator.alphaNumeric(32) + RandomGenerator.alphaNumeric(32);
  const nonExistentUuid = typia.random<string & tags.Format<"uuid">>();

  // 2. Case: filter by non-existent title
  const resByTitle = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        title: nonExistentTitle,
        page: 1 satisfies number,
        limit: 10 satisfies number,
      },
    },
  );
  typia.assert(resByTitle);
  TestValidator.equals("data should be empty (title)", resByTitle.data, []);
  TestValidator.equals("records 0 (title)", resByTitle.pagination.records, 0);
  TestValidator.equals("pages 0 (title)", resByTitle.pagination.pages, 0);
  TestValidator.equals(
    "current page is 1 (title)",
    resByTitle.pagination.current,
    1,
  );
  TestValidator.equals("limit is 10 (title)", resByTitle.pagination.limit, 10);

  // 3. Case: filter by non-existent author_user_id
  const resByUserId = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        author_user_id: nonExistentUuid,
        page: 1 satisfies number,
        limit: 5 satisfies number,
      },
    },
  );
  typia.assert(resByUserId);
  TestValidator.equals(
    "data should be empty (author_user_id)",
    resByUserId.data,
    [],
  );
  TestValidator.equals(
    "records 0 (author_user_id)",
    resByUserId.pagination.records,
    0,
  );
  TestValidator.equals(
    "pages 0 (author_user_id)",
    resByUserId.pagination.pages,
    0,
  );
  TestValidator.equals(
    "current page is 1 (author_user_id)",
    resByUserId.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit is 5 (author_user_id)",
    resByUserId.pagination.limit,
    5,
  );

  // 4. Case: filter by both non-existent title and author_user_id
  const resByBoth = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        title: nonExistentTitle,
        author_user_id: nonExistentUuid,
        page: 1 satisfies number,
        limit: 7 satisfies number,
      },
    },
  );
  typia.assert(resByBoth);
  TestValidator.equals("data should be empty (both)", resByBoth.data, []);
  TestValidator.equals("records 0 (both)", resByBoth.pagination.records, 0);
  TestValidator.equals("pages 0 (both)", resByBoth.pagination.pages, 0);
  TestValidator.equals(
    "current page is 1 (both)",
    resByBoth.pagination.current,
    1,
  );
  TestValidator.equals("limit is 7 (both)", resByBoth.pagination.limit, 7);
}
