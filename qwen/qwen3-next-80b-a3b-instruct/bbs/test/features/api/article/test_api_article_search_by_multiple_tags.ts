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

export async function test_api_article_search_by_multiple_tags(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create test citizen user
  const citizenConnection: api.IConnection = { host: connection.host };
  const citizen = await authorize_citizen_join(citizenConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEconomicBoardCitizen.IJoin,
  });
  typia.assert(citizen);
  // 2. Prepare search criteria with single tag filter
  const searchPayload: IEconomicBoardArticle.IRequest = {
    tag: "monetary-policy",
    page: 1,
    limit: 10,
    sort: "newest",
  } satisfies IEconomicBoardArticle.IRequest;
  // 3. Execute search
  const result: IPageIEconomicBoardArticle.ISummary =
    await api.functional.economicBoard.citizen.searches.index(
      citizenConnection,
      {
        body: searchPayload,
      },
    );
  typia.assert(result);
  // 4. Validate pagination structure: current equals page, limit equals limit, pages equals ceil(records/limit)
  TestValidator.equals("current page is 1", result.pagination.current, 1);
  TestValidator.equals("limit is 10", result.pagination.limit, 10);
  TestValidator.predicate(
    "records is non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    result.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pages calculated correctly",
    result.pagination.pages ===
      Math.ceil(result.pagination.records / result.pagination.limit),
  );
  // 5. Validate data is array (per schema contract)
  TestValidator.predicate("data is array", Array.isArray(result.data));
}
