import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_article_search_combined_filters(
  connection: api.IConnection,
): Promise<void> {
  // Test Case 1: Combined filters with text search and tags
  const result1 = await api.functional.discussionBoard.articles.search(
    connection,
    {
      body: {
        pagination: {
          limit: 10,
          offset: 0,
          sortBy: "createdAt",
          sortOrder: "desc",
        },
        search: "artificial",
        tags: ["ai"],
      },
    },
  );
  typia.assert(result1);
  TestValidator.equals(
    "combined filters return matching results",
    result1.data.length > 0,
    true,
  );
  TestValidator.predicate(
    "all results contain search term in title",
    result1.data.every((a) => a.title.toLowerCase().includes("artificial")),
  );
  // Test Case 2: Non-matching combined filters
  const result2 = await api.functional.discussionBoard.articles.search(
    connection,
    {
      body: {
        pagination: {
          limit: 10,
          offset: 0,
          sortBy: "createdAt",
          sortOrder: "desc",
        },
        search: "nonexistentterm",
        tags: ["ai"],
      },
    },
  );
  typia.assert(result2);
  TestValidator.equals(
    "non-matching search returns empty",
    result2.data.length,
    0,
  );
  // Test Case 3: Single filter (text only)
  const result3 = await api.functional.discussionBoard.articles.search(
    connection,
    {
      body: {
        pagination: {
          limit: 10,
          offset: 0,
          sortBy: "createdAt",
          sortOrder: "desc",
        },
        search: "economy",
      },
    },
  );
  typia.assert(result3);
  TestValidator.equals(
    "single search filter works",
    result3.data.length > 0,
    true,
  );
  TestValidator.predicate(
    "single filter results contain search term in title",
    result3.data.every((a) => a.title.toLowerCase().includes("economy")),
  );
  // Test Case 4: Multiple filters with no matches
  const result4 = await api.functional.discussionBoard.articles.search(
    connection,
    {
      body: {
        pagination: {
          limit: 10,
          offset: 0,
          sortBy: "createdAt",
          sortOrder: "desc",
        },
        search: "healthcare",
        tags: ["stocks"],
      },
    },
  );
  typia.assert(result4);
  TestValidator.equals(
    "multiple filters no match returns empty",
    result4.data.length,
    0,
  );
}
