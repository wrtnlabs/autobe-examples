import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomyPoliticsBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardArticle";
import type { IEconomyPoliticsBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardArticleTag";
import type { IEconomyPoliticsBoardSearchQuery } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardSearchQuery";
import type { IEconomyPoliticsBoardSearchResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardSearchResult";
import type { IEconomyPoliticsBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardSection";
import type { IEconomyPoliticsBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomyPoliticsBoardSearchResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomyPoliticsBoardSearchResult";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_search_with_tags_filter(
  connection: api.IConnection,
) {
  const userConnection: api.IConnection = { host: connection.host };
  const userData = await authorize_user_join(userConnection, {
    body: typia.assert<IEconomyPoliticsBoardUser.IJoin>({
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      name: RandomGenerator.name(),
    }),
  });
  const results = await api.functional.economyPoliticsBoard.user.search.index(
    userConnection,
    {
      body: typia.assert<IEconomyPoliticsBoardSearchQuery.IRequest>({}),
    },
  );
  typia.assert(results);
  TestValidator.equals(
    "should return search results",
    results.data.length > 0,
    true,
  );
  results.data.forEach((result) => {
    TestValidator.equals(
      "article should have a tag",
      result.tag !== null && result.tag !== undefined,
      true,
    );
  });
}
