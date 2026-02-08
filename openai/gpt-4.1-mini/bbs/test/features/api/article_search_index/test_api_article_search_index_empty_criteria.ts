import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticleSearchIndex } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleSearchIndex";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleSearchIndex } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleSearchIndex";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_article_search_index_empty_criteria(
  connection: api.IConnection,
): Promise<void> {
  // Create a connection specific for the article search index operation
  const articleSearchIndexConnection: api.IConnection = {
    host: connection.host,
  };
  // Compose request with empty search criteria (empty object) to request default pagination (first page)
  const body: IDiscussionBoardArticleSearchIndex.IRequest = {};
  // Call the article search index API
  const response =
    await api.functional.discussionBoard.article_search_indexes.index(
      articleSearchIndexConnection,
      { body },
    );
  // Validate the response structure and types
  typia.assert(response);
  // Validate pagination metadata correctness
  TestValidator.predicate(
    "pagination current page is at least 1",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is at least 0",
    response.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is at least 0",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is at least 0",
    response.pagination.pages >= 0,
  );
  // Validate that data array is an array and each item conforms to expected structure
  for (const item of response.data) {
    typia.assert(item);
  }
}
