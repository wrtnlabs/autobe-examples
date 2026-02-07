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

export async function test_api_article_search_by_nonexistent_tag_returns_empty(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123!",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IEconomicBoardAdministrator.IJoin,
  });
  // 2. Create a section for the article
  const section =
    await generate_random_economic_board_administrator_sections_create(
      adminConnection,
      {
        body: {
          name: "Economic Board",
          description: "Discussion section for economic and political analysis",
        } satisfies IEconomicBoardSection.ICreate,
      },
    );
  typia.assert(section);
  // 3. Create an article with a single tag 'existing-tag'
  const article = await generate_random_economic_board_articles_create(
    adminConnection,
    {
      body: {
        title: RandomGenerator.name(3),
        content: RandomGenerator.content({ paragraphs: 2 }),
        section_id: section.id,
        tags: ["existing-tag"],
      } satisfies IEconomicBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 4. Search for articles by nonexistent tag 'undefined-tag'
  const response = await api.functional.economicBoard.tags.index(
    adminConnection,
    {
      body: {
        tags: ["undefined-tag"],
      } satisfies IEconomicBoardSearchTag.IRequest,
    },
  );
  typia.assert(response);
  // 5. Validate response - should return empty array with valid pagination
  TestValidator.equals(
    "total count should be 0",
    response.pagination.records,
    0,
  );
  TestValidator.equals("pages should be 0", response.pagination.pages, 0);
  TestValidator.equals(
    "current page should be 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit should be default",
    response.pagination.limit,
    20,
  );
  TestValidator.equals("data array should be empty", response.data.length, 0);
}
