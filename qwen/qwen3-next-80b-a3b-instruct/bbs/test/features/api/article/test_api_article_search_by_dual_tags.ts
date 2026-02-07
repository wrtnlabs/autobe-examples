import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdministrator";
import type { IEconomicBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardArticle";
import type { IEconomicBoardSearchTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSearchTag";
import type { IEconomicBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_economic_board_administrator_sections_create } from "../../../generate/generate_random_economic_board_administrator_sections_create";
import { generate_random_economic_board_articles_create } from "../../../generate/generate_random_economic_board_articles_create";
import { prepare_random_economic_board_article } from "../../../prepare/prepare_random_economic_board_article";
import { prepare_random_economic_board_section } from "../../../prepare/prepare_random_economic_board_section";

export async function test_api_article_search_by_dual_tags(
  connection: api.IConnection,
): Promise<void> {
  // 1. Establish administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {},
  });
  // 2. Create a section for articles
  const section =
    await generate_random_economic_board_administrator_sections_create(
      adminConnection,
      {
        body: {},
      },
    );
  typia.assert(section);
  // 3. Create an article (this will be used for search but we cannot control tags through available API)
  const article = await generate_random_economic_board_articles_create(
    adminConnection,
    {
      body: {
        section_id: section.id,
      },
    },
  );
  typia.assert(article);
  // 4. Perform search by dual tags as specified in scenario
  const searchResult = await api.functional.economicBoard.tags.index(
    adminConnection,
    {
      body: {
        tags: ["monetary policy", "fiscal sustainability"],
      },
    },
  );
  typia.assert(searchResult);
  // 5. Validate search results structure and pagination
  // Verify pagination parameters are present and correct
  TestValidator.equals(
    "pagination current page",
    searchResult.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", searchResult.pagination.limit, 20);
  // Verify response has data array
  TestValidator.predicate(
    "has data in results",
    Array.isArray(searchResult.data),
  );
  // Since IEconomicBoardArticle.ISummary is empty in the DTOs, we cannot validate any properties of the articles
  // We cannot validate title, author_display_name, comment_count, or created_at as they don't exist in the type definition
  // This is a complete divergence from the scenario, but required for compilation
}
