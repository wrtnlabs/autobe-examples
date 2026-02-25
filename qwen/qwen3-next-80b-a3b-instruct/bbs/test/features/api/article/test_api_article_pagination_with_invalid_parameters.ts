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

export async function test_api_article_pagination_with_invalid_parameters(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate citizen user
  const citizenConnection: api.IConnection = { host: connection.host };
  await authorize_citizen_join(citizenConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // Step 2: Get existing section_id from any article
  const initialResponse = await api.functional.economicBoard.articles.index(
    citizenConnection,
    {
      body: {
        page: 1,
        limit: 1,
      } satisfies IEconomicBoardArticle.IRequest,
    },
  );
  typia.assert(initialResponse);
  // If there are any articles, use the section_id from the first article
  // Otherwise, generate a random uuid as fallback (unlikely to exist but will allow test to proceed)
  const validSectionId =
    initialResponse.data.length > 0
      ? initialResponse.data[0].section.id
      : typia.random<string & tags.Format<"uuid">>();
  // Step 3: Create 25 articles using the valid section_id
  void ArrayUtil.repeat(25, async () => {
    await generate_random_economic_board_citizen_articles_create(
      citizenConnection,
      {
        body: {
          title: RandomGenerator.name(),
          content: RandomGenerator.paragraph({ sentences: 5 }),
          section_id: validSectionId,
        } satisfies IEconomicBoardArticle.ICreate,
      },
    );
  });
  // Step 4: Make pagination request with invalid parameters (page=0, limit=0)
  const response = await api.functional.economicBoard.articles.index(
    citizenConnection,
    {
      body: {
        page: 0,
        limit: 0,
      } satisfies IEconomicBoardArticle.IRequest,
    },
  );
  typia.assert(response);
  // Step 5: Validate response with corrected pagination values (page=1, limit=20)
  TestValidator.equals("page corrected to 1", response.pagination.current, 1);
  TestValidator.equals("limit corrected to 20", response.pagination.limit, 20);
  TestValidator.equals(
    "returned data has exactly 20 items",
    response.data.length,
    20,
  );
  TestValidator.predicate(
    "pagination total records >= 20",
    response.pagination.records >= 20,
  );
}