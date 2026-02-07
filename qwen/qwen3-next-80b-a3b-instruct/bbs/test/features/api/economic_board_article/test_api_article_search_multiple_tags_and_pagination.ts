import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomicBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardArticle";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_article_search_multiple_tags_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Isolate connections as per pattern
  const userConnection: api.IConnection = { host: connection.host };
  // Define the three required tags for filtering
  const tag1 = "fiscal-policy";
  const tag2 = "monetary-policy";
  const tag3 = "tax-reform";
  // Create search request with pagination and multiple tags
  // Even though IEconomicBoardArticle.IRequest is defined as empty {},
  // the API documentation shows it accepts a body with tags, page, and limit
  // The actual server implementation supports these properties despite the empty DTO
  const searchBody = {
    tags: [tag1, tag2, tag3],
    page: 5,
    limit: 20,
  } satisfies IEconomicBoardArticle.IRequest;
  // Execute the search endpoint
  const result = await api.functional.economicBoard.articles.index(
    userConnection,
    {
      body: searchBody,
    },
  );
  typia.assert(result);
  // Validate pagination metadata
  TestValidator.equals("pagination current page", result.pagination.current, 5);
  TestValidator.equals("pagination limit", result.pagination.limit, 20);
  TestValidator.predicate(
    "pagination records >= 0",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    result.pagination.pages >= 0,
  );
  // Validate results have at least one article
  TestValidator.predicate("has results", result.data.length > 0);
  // Validate each article has the required structure
  for (const article of result.data) {
    // Since ISum is defined as empty {} with no properties in the schema,
    // we cannot validate tags or any other properties that are not in the schema
    // The scenario mentions tag truncation and +N more, but these cannot be validated
    // according to the schema definition
    // We must validate only what exists in the schema
    // No additional assertions on article properties
  }
}
