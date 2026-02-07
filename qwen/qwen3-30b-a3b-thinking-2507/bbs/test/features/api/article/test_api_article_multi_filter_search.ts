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

export async function test_api_article_multi_filter_search(
  connection: api.IConnection,
): Promise<void> {
  // Call the API with the filters
  const response: IPageIEconomyPoliticsBoardArticle.ISummary =
    await api.functional.economyPoliticsBoard.articles.index(connection, {
      body: {
        title: "Trade Policy",
        section: "International Trade",
      },
    });
  typia.assert(response);
  // Validate there are results
  TestValidator.predicate(
    "should return at least one article",
    response.data.length > 0,
  );
  // Validate each returned article matches our criteria
  for (const article of response.data) {
    TestValidator.predicate(
      'article title should contain "Trade Policy"',
      article.title.toLowerCase().includes("trade policy"),
    );
    TestValidator.equals(
      'article section name should be "International Trade"',
      article.section.name,
      "International Trade",
    );
  }
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page should be 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should be 10",
    response.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records should be greater than 0",
    response.pagination.records > 0,
  );
}
