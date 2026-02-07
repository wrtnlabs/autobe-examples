import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomyPoliticsBoardSearchQuery } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardSearchQuery";
import type { IEconomyPoliticsBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomyPoliticsBoardSearchQuery } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomyPoliticsBoardSearchQuery";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_search_with_partial_term(
  connection: api.IConnection,
): Promise<void> {
  // 1. Auth as user
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      name: RandomGenerator.name(),
    } satisfies IEconomyPoliticsBoardUser.IJoin,
  });
  // 2. Create search queries containing 'economic'
  const searchTerms = [
    "economic policy",
    "economic data",
    "economic recession",
    "economic growth",
    "economics",
    "economy",
  ];
  for (const searchTerm of searchTerms) {
    await api.functional.economyPoliticsBoard.user.queries.index(
      userConnection,
      {
        body: {
          search_term: searchTerm,
        } satisfies IEconomyPoliticsBoardSearchQuery.IRequest,
      },
    );
  }
  // 3. Search for 'economic' keyword with partial match
  const searchResult =
    await api.functional.economyPoliticsBoard.user.queries.index(
      userConnection,
      {
        body: {
          search_term: "economic",
        } satisfies IEconomyPoliticsBoardSearchQuery.IRequest,
      },
    );
  typia.assert(searchResult);
  // 4. Validate search results include queries with 'economic' in search term
  const matchingResults = searchResult.data.filter((result) =>
    result.search_term.toLowerCase().includes("economic"),
  );
  TestValidator.equals(
    "Search results should include queries containing 'economic'",
    matchingResults.length,
    searchResult.data.length,
  );
  // 5. Validate results are ordered by most recent first
  const sortedResults = [...searchResult.data].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  TestValidator.equals(
    "Search results should be ordered by most recent first",
    JSON.stringify(searchResult.data),
    JSON.stringify(sortedResults),
  );
}
