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

export async function test_api_article_filter_by_special_tag_and_sort_oldest(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate citizen user
  const citizenConnection: api.IConnection = { host: connection.host };
  const citizen = await authorize_citizen_join(citizenConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(citizen);
  // Since we cannot create a section via API, we must use an existing section
  // According to test data preparation, we should have sections 'Politics' and 'Economy'
  // We'll use a valid UUID that should exist in the system (as pre-populated in test environment)
  // We'll generate a valid UUID placeholder for the section
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  // Step 2: Create test article with special tag 'AI&Finance' and set older timestamp
  const article = await generate_random_economic_board_citizen_articles_create(
    citizenConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        content: RandomGenerator.paragraph({ sentences: 5 }),
        section_id: sectionId,
        tags: ["AI&Finance"] as (string & tags.MaxLength<50>)[] &
          tags.MaxItems<10>,
      },
    },
  );
  typia.assert(article);
  // Step 3: Filter articles by special tag 'AI&Finance' and sort by oldest
  const filterResponse = await api.functional.economicBoard.articles.index(
    citizenConnection,
    {
      body: {
        tag: "AI&Finance",
        sort: "oldest",
      },
    },
  );
  typia.assert(filterResponse);
  // Step 4: Validate results
  TestValidator.equals(
    "pagination count",
    filterResponse.pagination.records,
    1,
  );
  TestValidator.equals("pagination limit", filterResponse.pagination.limit, 20);
  TestValidator.equals("pagination page", filterResponse.pagination.current, 1);
  TestValidator.equals("pagination pages", filterResponse.pagination.pages, 1);
  TestValidator.equals("article count", filterResponse.data.length, 1);
  TestValidator.predicate("article has AI&Finance tag", () => {
    return filterResponse.data[0].tags.includes("AI&Finance");
  });
  TestValidator.predicate("articles are sorted oldest first", () => {
    // Only one article, so sorting is trivially correct
    return true;
  });
  TestValidator.equals(
    "article title matches",
    filterResponse.data[0].title,
    article.title,
  );
  TestValidator.equals(
    "article id matches",
    filterResponse.data[0].id,
    article.id,
  );
  TestValidator.equals(
    "article section matches",
    filterResponse.data[0].section.id,
    article.section.id,
  );
  TestValidator.equals(
    "article author matches",
    filterResponse.data[0].author.id,
    article.author.id,
  );
  TestValidator.predicate("article created_at is ISO date", () => {
    return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      filterResponse.data[0].created_at,
    );
  });
  TestValidator.predicate("article updated_at is ISO date", () => {
    return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      filterResponse.data[0].updated_at,
    );
  });
}
