import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardArticle";
import type { IEconomicBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardArticleAttachment";
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
import { generate_random_economic_board_citizen_articles_create } from "../../../generate/generate_random_economic_board_citizen_articles_create";
import { prepare_random_economic_board_article } from "../../../prepare/prepare_random_economic_board_article";

export async function test_api_article_search_by_keyword_and_section(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create citizen user account
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
  // Step 2: Generate a random section_id for articles (we don't have endpoints to list sections, so we'll create articles with a section_id)
  // According to scenario, we need section 'Economy', but we can't retrieve it, so we'll create a section_id that matches the scenario
  // We'll create a random section_id as a UUID
  const economySectionId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Create 10 articles with 'inflation' in title and section 'Economy'
  await ArrayUtil.asyncRepeat(10, async () => {
    const article =
      await generate_random_economic_board_citizen_articles_create(
        citizenConnection,
        {
          body: {
            title: `Inflation impact on ${RandomGenerator.name(1)}`,
            content:
              RandomGenerator.content({
                paragraphs: 2,
                sentenceMin: 5,
                sentenceMax: 8,
              }) + " Inflation is a major economic concern.",
            section_id: economySectionId,
            tags: [
              RandomGenerator.alphabets(5),
              RandomGenerator.alphabets(4),
              RandomGenerator.alphabets(6),
            ],
          } satisfies IEconomicBoardArticle.ICreate,
        },
      );
    typia.assert(article);
  });
  // Step 4: Execute search with keyword 'inflation', section_id='economy', sort=newest, page=1, limit=10
  const searchResponse = await api.functional.economicBoard.articles.index(
    citizenConnection,
    {
      body: {
        search: "inflation",
        section_id: economySectionId,
        sort: "newest",
        page: 1,
        limit: 10,
      } satisfies IEconomicBoardArticle.IRequest,
    },
  );
  typia.assert(searchResponse);
  // Step 5: Validate results
  TestValidator.equals(
    "pagination count",
    searchResponse.pagination.records,
    10,
  );
  TestValidator.equals("pagination page", searchResponse.pagination.current, 1);
  TestValidator.equals("pagination limit", searchResponse.pagination.limit, 10);
  TestValidator.equals("pagination pages", searchResponse.pagination.pages, 1);
  TestValidator.equals("result count", searchResponse.data.length, 10);
  // Validate each article has correct structure
  for (const article of searchResponse.data) {
    TestValidator.predicate("article has title with inflation", () =>
      article.title.toLowerCase().includes("inflation"),
    );
    // Validate section name - IEconomicBoardSection.ISummary includes name
    TestValidator.equals(
      "article section name matches",
      article.section.name.toLowerCase(),
      "economy",
    );
    TestValidator.equals(
      "article section matches",
      article.section.id,
      economySectionId,
    );
    TestValidator.predicate(
      "article has author",
      () =>
        article.author !== null && article.author.display_name !== undefined,
    );
    TestValidator.predicate(
      "article has tags",
      () => Array.isArray(article.tags) && article.tags.length > 0,
    );
    TestValidator.predicate(
      "article has comment count",
      () => article.comment_count >= 0,
    );
    // Validate tags have correct length
    for (const tag of article.tags) {
      TestValidator.predicate("tag length valid", () => tag.length <= 50);
    }
  }
  // Validate sort order (newest first)
  const sortedByCreatedAt = [...searchResponse.data].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  for (let i = 0; i < searchResponse.data.length; i++) {
    TestValidator.equals(
      `article ${i} sort order`,
      searchResponse.data[i].id,
      sortedByCreatedAt[i].id,
    );
  }
}
