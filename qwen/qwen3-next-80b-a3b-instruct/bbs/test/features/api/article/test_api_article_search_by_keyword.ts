import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardArticle";
import type { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
import type { IEconomicBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_citizen_join } from "../../../authorize/authorize_citizen_join";
import { authorize_citizen_login } from "../../../authorize/authorize_citizen_login";
import { authorize_citizen_refresh } from "../../../authorize/authorize_citizen_refresh";

export async function test_api_article_search_by_keyword(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create test citizen user
  const citizenConnection: api.IConnection = { host: connection.host };
  const citizen = await authorize_citizen_join(citizenConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 1 }),
    } satisfies IEconomicBoardCitizen.IJoin,
  });
  typia.assert(citizen);
  // 2. Set up search request with keyword 'economy'
  const searchRequest: IEconomicBoardArticle.IRequest = {
    search: "economy",
    sort: "newest",
    page: 1,
    limit: 20,
  } satisfies IEconomicBoardArticle.IRequest;
  // 3. Perform search operation
  const searchResult =
    await api.functional.economicBoard.citizen.searches.index(
      citizenConnection,
      {
        body: searchRequest,
      },
    );
  typia.assert(searchResult);
  // 4. Validate response structure and data
  // Ensure pagination metadata is correct
  TestValidator.equals("page number is 1", searchResult.pagination.current, 1);
  TestValidator.equals("limit is 20", searchResult.pagination.limit, 20);
  TestValidator.predicate(
    "total records > 0",
    searchResult.pagination.records > 0,
  );
  TestValidator.equals(
    "total pages >= 1",
    searchResult.pagination.pages,
    Math.ceil(searchResult.pagination.records / 20),
  );
  // Validate data array is non-empty and follows schema
  TestValidator.predicate("data array exists", searchResult.data.length > 0);
  TestValidator.predicate(
    "data array has exactly 20 items or less",
    searchResult.data.length <= 20,
  );
  // Validate each article summary follows the expected structure
  for (const article of searchResult.data) {
    TestValidator.equals("article has id", typeof article.id, "string");
    TestValidator.predicate(
      "article id is UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        article.id,
      ),
    );
    TestValidator.equals("article has title", typeof article.title, "string");
    TestValidator.predicate("title is not empty", article.title.length > 0);
    TestValidator.equals(
      "article has section",
      typeof article.section,
      "object",
    );
    TestValidator.equals("section has id", typeof article.section.id, "string");
    TestValidator.predicate(
      "section id is UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        article.section.id,
      ),
    );
    TestValidator.equals(
      "section has name",
      typeof article.section.name,
      "string",
    );
    TestValidator.predicate(
      "section name is not empty",
      article.section.name.length > 0,
    );
    TestValidator.equals(
      "section has description",
      typeof article.section.description,
      "string",
    );
    TestValidator.predicate(
      "section description is not empty",
      article.section.description.length > 0,
    );
    TestValidator.equals(
      "section has created_at",
      typeof article.section.created_at,
      "string",
    );
    TestValidator.predicate(
      "section created_at is ISO date-time",
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/.test(
        article.section.created_at,
      ),
    );
    TestValidator.equals(
      "section has updated_at",
      typeof article.section.updated_at,
      "string",
    );
    TestValidator.predicate(
      "section updated_at is ISO date-time",
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/.test(
        article.section.updated_at,
      ),
    );
    TestValidator.equals("article has author", typeof article.author, "object");
    TestValidator.equals("author has id", typeof article.author.id, "string");
    TestValidator.predicate(
      "author id is UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        article.author.id,
      ),
    );
    TestValidator.equals(
      "author has email",
      typeof article.author.email,
      "string",
    );
    TestValidator.predicate(
      "author email is valid format",
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(article.author.email),
    );
    TestValidator.equals(
      "author has display_name",
      typeof article.author.display_name === "string" ||
        article.author.display_name === null,
      true,
    );
    TestValidator.equals(
      "author has created_at",
      typeof article.author.created_at,
      "string",
    );
    TestValidator.predicate(
      "author created_at is ISO date-time",
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/.test(
        article.author.created_at,
      ),
    );
    TestValidator.equals("article has tags", Array.isArray(article.tags), true);
    TestValidator.predicate(
      "tags array has at least 0 items",
      article.tags.length >= 0,
    );
    for (const tag of article.tags) {
      TestValidator.equals("tag is string", typeof tag, "string");
      TestValidator.predicate("tag is not empty", tag.length > 0);
    }
    TestValidator.equals(
      "article has comment_count",
      typeof article.comment_count,
      "number",
    );
    TestValidator.predicate(
      "comment_count is non-negative",
      article.comment_count >= 0,
    );
    TestValidator.equals(
      "article has created_at",
      typeof article.created_at,
      "string",
    );
    TestValidator.predicate(
      "created_at is ISO date-time",
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/.test(article.created_at),
    );
    TestValidator.equals(
      "article has updated_at",
      typeof article.updated_at,
      "string",
    );
    TestValidator.predicate(
      "updated_at is ISO date-time",
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/.test(article.updated_at),
    );
  }
  // 5. Validate that search results contain keyword 'economy' in title or content
  // Since we can't inspect content directly in schema, we validate by structure and assume search worked
  // (per protocol: use typia.assert to validate types, and business logic is validated by the search being functional)
  TestValidator.predicate(
    "search results contain 'economy' in at least one title",
    searchResult.data.some((article) =>
      article.title.toLowerCase().includes("economy"),
    ),
  );
}
