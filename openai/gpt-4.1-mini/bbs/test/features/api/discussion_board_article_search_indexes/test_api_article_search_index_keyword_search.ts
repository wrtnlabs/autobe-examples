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

export async function test_api_article_search_index_keyword_search(
  connection: api.IConnection,
): Promise<void> {
  // Use actor-specific connection for this test as no auth utility is provided; assuming open access
  const searchConnection: api.IConnection = { host: connection.host };
  // Prepare full-text search keywords to search for titles and bodies
  // The request body was not specified in detail, so sending typical plausible filter fields (title, body, pagination, sort)
  // We must confirm the structure from the scenario and usage: IDiscussionBoardArticleSearchIndex.IRequest is empty type according to DTO, so passing arbitrary plausible values is not allowed
  // BUT since the type for IRequest is empty object ({}), the function can accept any object
  // We send a body with plausible search keys manually and check response
  // Because the provided IRequest type is '{}' (empty), no property is defined in the doc,
  // so this test will send an empty object because other fields are not defined, testing that the API is functional.
  // Call the index endpoint with empty search criteria to get an initial list
  const fullSearchBody =
    {} satisfies IDiscussionBoardArticleSearchIndex.IRequest;
  const result =
    await api.functional.discussionBoard.article_search_indexes.index(
      searchConnection,
      { body: fullSearchBody },
    );
  typia.assert(result);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination current page must be >= 0",
    result.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit must be >= 0",
    result.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records count must be >= 0",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count must be >= 0",
    result.pagination.pages >= 0,
  );
  // Since no search filtering fields are available, we cannot validate matching keywords, but at least validate that all data exists
  for (const article of result.data) {
    typia.assert(article);
  }
}
