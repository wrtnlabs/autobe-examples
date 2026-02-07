import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomyPoliticsBoardSearchQuery } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardSearchQuery";
import type { IEconomyPoliticsBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_economy_politics_board_user_queries_create } from "../../../generate/generate_random_economy_politics_board_user_queries_create";
import { prepare_random_economy_politics_board_search_query } from "../../../prepare/prepare_random_economy_politics_board_search_query";

export async function test_api_search_with_parameters(
  connection: api.IConnection,
): Promise<void> {
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      name: RandomGenerator.name(),
    } satisfies IEconomyPoliticsBoardUser.IJoin,
  });
  const searchBody = {
    search_term: RandomGenerator.paragraph({ sentences: 1 }),
    request_parameters: JSON.stringify({
      filters: ["category:news", "type:politics"],
      pagination: { page: 1, size: 10 },
      sort: "date-desc",
    }),
  } satisfies IEconomyPoliticsBoardSearchQuery.ICreate;
  const searchResult =
    await api.functional.economyPoliticsBoard.user.queries.create(
      userConnection,
      { body: searchBody },
    );
  typia.assert(searchResult);
  TestValidator.equals(
    "request_parameters JSON format",
    JSON.parse(searchResult.requestParameters || "null"),
    {
      filters: ["category:news", "type:politics"],
      pagination: { page: 1, size: 10 },
      sort: "date-desc",
    },
  );
}
