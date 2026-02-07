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

export async function test_api_article_pagination(
  connection: api.IConnection,
): Promise<void> {
  const output: IPageIEconomyPoliticsBoardArticle.ISummary =
    await api.functional.economyPoliticsBoard.articles.index(connection, {
      body: typia.random<IEconomyPoliticsBoardArticle.IRequest>(),
    });
  typia.assert(output);
  // Validate pagination metadata
  TestValidator.equals(
    "current page should be 2",
    output.pagination.current,
    2,
  );
  TestValidator.equals("limit should be 10", output.pagination.limit, 10);
  TestValidator.predicate(
    "total records should be greater than 10",
    output.pagination.records > 10,
  );
  // Calculate expected pages for validation
  const expectedPages = Math.ceil(
    output.pagination.records / output.pagination.limit,
  );
  TestValidator.equals(
    "total pages should be correct",
    output.pagination.pages,
    expectedPages,
  );
  // Validate articles
  for (const article of output.data) {
    // Validate ID
    TestValidator.predicate(
      "article ID should be a valid UUID",
      /^[0-9a-f-]{36}$/.test(article.id),
    );
    // Validate title
    TestValidator.predicate(
      "title should be non-empty string",
      typeof article.title === "string" && article.title.length > 0,
    );
    // Validate author
    TestValidator.predicate(
      "author should exist",
      article.author !== null && article.author !== undefined,
    );
    TestValidator.predicate(
      "author ID should be valid UUID",
      /^[0-9a-f-]{36}$/.test(article.author.id),
    );
    // Validate section
    TestValidator.predicate(
      "section should exist",
      article.section !== null && article.section !== undefined,
    );
    TestValidator.predicate(
      "section ID should be valid UUID",
      /^[0-9a-f-]{36}$/.test(article.section.id),
    );
    // Validate comments count
    TestValidator.predicate(
      "comments count should be non-negative",
      article.comments_count >= 0,
    );
    // Validate created_at
    TestValidator.predicate(
      "created_at should be valid ISO date-time",
      /^\d{4}-\d{2}-\d{2T\d{2}:\d{2}:\d{2\.\d{3Z$/.test(article.created_at),
    );
  }
}
