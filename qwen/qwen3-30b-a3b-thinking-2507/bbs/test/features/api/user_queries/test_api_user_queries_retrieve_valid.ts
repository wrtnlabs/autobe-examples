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

export async function test_api_user_queries_retrieve_valid(
  connection: api.IConnection,
) {
  // 1. Auth as user
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, { body: {} });
  // 2. Create search query for retrieval
  const query =
    await generate_random_economy_politics_board_user_queries_create(
      userConnection,
      {
        body: {
          search_term: RandomGenerator.paragraph(),
          request_parameters: JSON.stringify({
            filters: ["economic", "politics"],
          }),
        },
      },
    );
  typia.assert(query);
  // 3. Retrieve the search query
  const retrieved = await api.functional.economyPoliticsBoard.user.queries.at(
    userConnection,
    { queryId: query.id },
  );
  typia.assert(retrieved);
  // 4. Validate response properties
  TestValidator.equals(
    "search term matches",
    retrieved.searchTerm,
    query.searchTerm,
  );
  TestValidator.equals(
    "request parameters match",
    retrieved.requestParameters,
    query.requestParameters,
  );
  TestValidator.equals("active status", retrieved.deletedAt, null);
  TestValidator.predicate(
    "created timestamp ISO format",
    /\d{4}-[0-1]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\dZ/.test(retrieved.createdAt),
  );
  TestValidator.predicate(
    "updated timestamp ISO format",
    /\d{4}-[0-1]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\dZ/.test(retrieved.updatedAt),
  );
}
