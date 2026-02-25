import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomicBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardArticle";
import type { IEconomicBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardArticleAttachment";
import type { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
import type { IEconomicBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSection";
import type { IEconomicBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_article_search_by_tag_and_keyword(
  connection: api.IConnection,
): Promise<void> {
  // Test the search endpoint with valid parameters to validate response structure
  // Since article creation functionality is not available, we cannot validate content matches
  // This test ensures the endpoint accepts correct parameters and returns properly structured response
  const searchResults = await api.functional.economicBoard.tags.index(
    connection,
    {
      body: {
        tag: ["freedom"],
        search: "system",
      } satisfies IEconomicBoardTag,
    },
  );
  typia.assert(searchResults);
  // Validate response structure as defined by IPageIEconomicBoardArticle
  TestValidator.predicate("data array exists", () =>
    Array.isArray(searchResults.data),
  );
  TestValidator.predicate(
    "pagination exists",
    () =>
      searchResults.pagination !== null &&
      typeof searchResults.pagination === "object",
  );
  // Validate pagination fields match schema
  TestValidator.predicate(
    "pagination current is number",
    () => typeof searchResults.pagination.current === "number",
  );
  TestValidator.predicate(
    "pagination limit is number",
    () => typeof searchResults.pagination.limit === "number",
  );
  TestValidator.predicate(
    "pagination records is number",
    () => typeof searchResults.pagination.records === "number",
  );
  TestValidator.predicate(
    "pagination pages is number",
    () => typeof searchResults.pagination.pages === "number",
  );
  // Validate pagination values are non-negative
  TestValidator.predicate(
    "pagination current >= 0",
    () => searchResults.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit >= 0",
    () => searchResults.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    () => searchResults.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    () => searchResults.pagination.pages >= 0,
  );
  // Validate each article in data has correct structure
  for (const article of searchResults.data) {
    TestValidator.predicate(
      "article id is uuid",
      () =>
        typeof article.id === "string" && /^[0-9a-f-]{36}$/i.test(article.id),
    );
    TestValidator.predicate(
      "article title is string",
      () => typeof article.title === "string",
    );
    TestValidator.predicate(
      "article content is string",
      () => typeof article.content === "string",
    );
    TestValidator.predicate(
      "article section exists",
      () => article.section !== null && typeof article.section === "object",
    );
    TestValidator.predicate(
      "article section id is uuid",
      () =>
        typeof article.section.id === "string" &&
        /^[0-9a-f-]{36}$/i.test(article.section.id),
    );
    TestValidator.predicate(
      "article section name is string",
      () => typeof article.section.name === "string",
    );
    TestValidator.predicate(
      "article section description is string",
      () => typeof article.section.description === "string",
    );
    TestValidator.predicate(
      "article section created_at is date-time",
      () =>
        typeof article.section.created_at === "string" &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(
          article.section.created_at,
        ),
    );
    TestValidator.predicate(
      "article section updated_at is date-time",
      () =>
        typeof article.section.updated_at === "string" &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(
          article.section.updated_at,
        ),
    );
    TestValidator.predicate(
      "article author exists",
      () => article.author !== null && typeof article.author === "object",
    );
    TestValidator.predicate(
      "article author id is uuid",
      () =>
        typeof article.author.id === "string" &&
        /^[0-9a-f-]{36}$/i.test(article.author.id),
    );
    TestValidator.predicate(
      "article author email is email",
      () =>
        typeof article.author.email === "string" &&
        /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(
          article.author.email,
        ),
    );
    TestValidator.predicate(
      "article author created_at is date-time",
      () =>
        typeof article.author.created_at === "string" &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(
          article.author.created_at,
        ),
    );
    TestValidator.predicate("article attachments is array", () =>
      Array.isArray(article.attachments),
    );
    TestValidator.predicate(
      "article comments_count is number",
      () => typeof article.comments_count === "number",
    );
    TestValidator.predicate(
      "article created_at is date-time",
      () =>
        typeof article.created_at === "string" &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(article.created_at),
    );
    TestValidator.predicate(
      "article updated_at is date-time",
      () =>
        typeof article.updated_at === "string" &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(article.updated_at),
    );
    TestValidator.predicate(
      "article is_deleted is boolean",
      () => typeof article.is_deleted === "boolean",
    );
    if (article.tags !== undefined) {
      TestValidator.predicate("article tags is array", () =>
        Array.isArray(article.tags),
      );
      for (const tag of article.tags) {
        TestValidator.predicate("tag is string", () => typeof tag === "string");
      }
    }
  }
}
