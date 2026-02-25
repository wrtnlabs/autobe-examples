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

export async function test_api_article_search_with_pagination_and_oldest_sort(
  connection: api.IConnection,
): Promise<void> {
  // Create citizen connection for search
  const citizenConnection: api.IConnection = { host: connection.host };
  await authorize_citizen_join(citizenConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 1 }),
    } satisfies IEconomicBoardCitizen.IJoin,
  });
  // Define search criteria: keyword 'tax', sort=oldest, page=3, limit=10
  const searchCriteria: IEconomicBoardArticle.IRequest = {
    search: "tax",
    sort: "oldest",
    page: 3,
    limit: 10,
  };
  // Execute search request
  const result = await api.functional.economicBoard.citizen.searches.index(
    citizenConnection,
    {
      body: searchCriteria,
    },
  );
  typia.assert(result);
  // Validate pagination metadata
  TestValidator.equals("current page is 3", result.pagination.current, 3);
  TestValidator.equals("limit is 10", result.pagination.limit, 10);
  TestValidator.predicate("total records > 0", result.pagination.records > 0);
  TestValidator.predicate("pages > 0", result.pagination.pages > 0);
  // Validate that returned articles contain 'tax' keyword and are sorted oldest first
  TestValidator.equals("returned 10 articles", result.data.length, 10);
  for (let i = 0; i < result.data.length; i++) {
    const article = result.data[i];
    // Validate that article title contains 'tax'
    TestValidator.predicate(
      'article title contains keyword "tax"',
      article.title.toLowerCase().includes("tax"),
    );
    // Validate that articles are sorted by created_at ascending (oldest first)
    if (i > 0) {
      const prevArticle = result.data[i - 1];
      const currentDate = new Date(article.created_at).getTime();
      const prevDate = new Date(prevArticle.created_at).getTime();
      TestValidator.predicate(
        "articles sorted oldest first (ascending)",
        currentDate >= prevDate,
      );
    }
  }
}
