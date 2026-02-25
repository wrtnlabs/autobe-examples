import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test article search when no articles match the query term.
 *
 * This test verifies that searching with a unique, non-existent query term
 * returns an empty result set with proper pagination metadata.
 * The search endpoint should handle no-match scenarios gracefully
 * without throwing errors.
 */
export async function test_api_article_search_empty(
  connection: api.IConnection,
): Promise<void> {
  // Execute search with a highly unlikely query term
  const result = await api.functional.discussionBoard.articles.search(
    connection,
    {
      body: {
        search: "xyznonexistentquery123456789unique",
        sort: "newest",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(result);
  // Verify empty data array
  TestValidator.equals("data should be empty array", result.data, []);
  // Verify pagination metadata reflects zero records
  TestValidator.equals(
    "current page should be 1",
    result.pagination.current,
    1,
  );
  TestValidator.equals("limit should be 20", result.pagination.limit, 20);
  TestValidator.equals("records should be 0", result.pagination.records, 0);
  TestValidator.equals("pages should be 0", result.pagination.pages, 0);
}
