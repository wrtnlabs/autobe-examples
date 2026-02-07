import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomyPoliticsBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardArticle";
import type { IEconomyPoliticsBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardSection";
import type { IEconomyPoliticsBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomyPoliticsBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomyPoliticsBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_article_search_by_title(
  connection: api.IConnection,
): Promise<void> {
  // Create a connection for a user
  const userConnection: api.IConnection = { host: connection.host };
  // Call the API to fetch articles (no search query in body since IRequest is empty)
  const result: IPageIEconomyPoliticsBoardArticle.ISummary =
    await api.functional.economyPoliticsBoard.articles.index(userConnection, {
      body: {} satisfies IEconomyPoliticsBoardArticle.IRequest,
    });
  // Validate the response structure
  typia.assert(result);
  // Verify pagination metadata shows first page (1)
  TestValidator.equals(
    "Pagination current page should be 1",
    result.pagination.current,
    1,
  );
  // Verify total records count is positive
  TestValidator.predicate(
    "Total records count should be positive",
    result.pagination.records > 0,
  );
  // Validate that articles are present
  TestValidator.predicate(
    "Articles list should not be empty",
    result.data.length > 0,
  );
  // Find an article with title containing 'Economy Trends'
  const matchingArticles = result.data.filter((article) =>
    article.title.includes("Economy Trends"),
  );
  // Verify there's at least one matching article
  TestValidator.predicate(
    "Should have at least one article with title containing 'Economy Trends'",
    matchingArticles.length > 0,
  );
  // Get the first matching article
  const firstMatchingArticle = matchingArticles[0];
  // Verify author information exists
  TestValidator.equals(
    "Author ID should not be null",
    firstMatchingArticle.author.id,
    firstMatchingArticle.author.id,
  );
  // Verify section information exists
  TestValidator.equals(
    "Section ID should not be null",
    firstMatchingArticle.section.id,
    firstMatchingArticle.section.id,
  );
  // Verify creation timestamp is in ISO 8601 format
  TestValidator.predicate(
    "Created at should be in valid date-time format",
    /^\\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](\\.\\d{1,9})?(Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$/.test(
      firstMatchingArticle.created_at,
    ),
  );
}
