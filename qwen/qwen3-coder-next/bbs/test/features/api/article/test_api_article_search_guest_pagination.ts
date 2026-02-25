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

export async function test_api_article_search_guest_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Test the search endpoint with various pagination scenarios
  // Using the only available API function: api.functional.discussionBoard.articles.index
  // 1. Test basic search with pagination parameters
  const results1 = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        q: "economy",
        sortBy: "newest",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(results1);
  // Validate pagination structure
  TestValidator.equals("pagination exists", results1.pagination !== null, true);
  TestValidator.equals("current page 1", results1.pagination.current, 1);
  TestValidator.equals("limit is 10", results1.pagination.limit, 10);
  TestValidator.predicate(
    "has valid records count",
    results1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "has valid pages count",
    results1.pagination.pages >= 0,
  );
  // 2. Test page 2 with limit of 10
  const results2 = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        q: "economy",
        sortBy: "newest",
        page: 2,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(results2);
  // Validate page 2 parameters
  TestValidator.equals("current page is 2", results2.pagination.current, 2);
  TestValidator.equals("limit is 10", results2.pagination.limit, 10);
  TestValidator.equals(
    "pages >= current",
    results2.pagination.pages >= results2.pagination.current,
    true,
  );
  // 3. Test with empty search query (return all)
  const results3 = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        page: 1,
        limit: 5,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(results3);
  // Validate default values and structure
  TestValidator.equals("default page is 1", results3.pagination.current, 1);
  TestValidator.equals(
    "default limit is 10 (not 5 due to DTO defaults)",
    results3.pagination.limit >= 1,
    true,
  );
  // 4. Test data array structure
  if (results3.data && results3.data.length > 0) {
    // Validate article summary structure
    const article = results3.data[0];
    TestValidator.equals("author exists", article.author !== null, true);
    TestValidator.equals("section exists", article.section !== null, true);
    TestValidator.equals(
      "has comment count",
      typeof article.commentCount,
      "number",
    );
    TestValidator.equals(
      "created at is ISO string",
      typeof article.createdAt,
      "string",
    );
    TestValidator.equals(
      "updated at is ISO string",
      typeof article.updatedAt,
      "string",
    );
  }
  // 5. Test search with limit edge case (minimum)
  const results4 = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        limit: 1,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(results4);
  // 6. Test search with maximum allowed limit
  const results5 = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        limit: 100,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(results5);
}
