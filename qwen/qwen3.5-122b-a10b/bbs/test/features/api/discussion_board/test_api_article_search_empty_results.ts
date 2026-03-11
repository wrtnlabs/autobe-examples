import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
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
 * Test empty search result handling when no articles match the search criteria.
 * 1. Submit search with unique keyword that won't match any articles
 * 2. Verify empty data array is returned
 * 3. Verify pagination metadata shows records=0, pages=0
 * 4. Test with non-existent tag IDs combined with keyword
 */
export async function test_api_article_search_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // 1. Search with unique keyword that won't match any articles
  const uniqueKeyword = `z${RandomGenerator.alphabets(10)}${RandomGenerator.alphaNumeric(8)}`;
  const emptyResult = await api.functional.discussionBoard.articles.search(
    connection,
    {
      body: {
        search: uniqueKeyword,
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(emptyResult);
  // 2. Verify empty data array
  TestValidator.equals(
    "search returns empty data array",
    emptyResult.data.length,
    0,
  );
  // 3. Verify pagination metadata for empty results
  TestValidator.equals(
    "pagination current page",
    emptyResult.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", emptyResult.pagination.limit, 20);
  TestValidator.equals(
    "pagination records count is 0",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages count is 0",
    emptyResult.pagination.pages,
    0,
  );
  // 4. Test with non-existent tag IDs combined with keyword
  const nonExistentTagIds = [
    typia.random<string & typia.tags.Format<"uuid">>(),
    typia.random<string & typia.tags.Format<"uuid">>(),
  ] as (string & typia.tags.Format<"uuid">)[];
  const combinedEmptyResult =
    await api.functional.discussionBoard.articles.search(connection, {
      body: {
        search: uniqueKeyword,
        tagIds: nonExistentTagIds,
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(combinedEmptyResult);
  // 5. Verify combined search also returns empty results
  TestValidator.equals(
    "combined search returns empty data array",
    combinedEmptyResult.data.length,
    0,
  );
  TestValidator.equals(
    "combined pagination records is 0",
    combinedEmptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "combined pagination pages is 0",
    combinedEmptyResult.pagination.pages,
    0,
  );
}
