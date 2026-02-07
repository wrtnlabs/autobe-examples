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

export async function test_api_user_search_query_update_request_parameters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate user
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {} satisfies IEconomyPoliticsBoardUser.IJoin,
  });
  // 2. Create initial search query
  const initialQuery: IEconomyPoliticsBoardSearchQuery =
    await generate_random_economy_politics_board_user_queries_create(
      userConnection,
      {
        body: {
          search_term: RandomGenerator.name(2),
          request_parameters: undefined,
        } satisfies IEconomyPoliticsBoardSearchQuery.ICreate,
      },
    );
  typia.assert(initialQuery);
  // 3. Update search query with new request parameters while keeping search_term the same
  const updatedQuery: IEconomyPoliticsBoardSearchQuery =
    await api.functional.economyPoliticsBoard.user.queries.update(
      userConnection,
      {
        queryId: initialQuery.id,
        body: {
          search_term: initialQuery.searchTerm,
          request_parameters: JSON.stringify({ sort: "date-desc" }),
        } satisfies IEconomyPoliticsBoardSearchQuery.IUpdate,
      },
    );
  typia.assert(updatedQuery);
  // 4. Verify that search_term remained the same
  TestValidator.equals(
    "searchTerm remains intact",
    initialQuery.searchTerm,
    updatedQuery.searchTerm,
  );
  // 5. Verify request_parameters was updated properly
  const expectedRequestParams = { sort: "date-desc" };
  const actualRequestParams = updatedQuery.requestParameters
    ? JSON.parse(updatedQuery.requestParameters)
    : undefined;
  TestValidator.equals(
    "requestParameters updated",
    expectedRequestParams,
    actualRequestParams,
  );
  // 6. Verify other fields didn't change
  TestValidator.equals("id remained intact", initialQuery.id, updatedQuery.id);
  TestValidator.equals(
    "createdAt remained intact",
    initialQuery.createdAt,
    updatedQuery.createdAt,
  );
  // 7. Verify updatedAt was updated (must be a later timestamp)
  TestValidator.predicate(
    "updatedAt updated",
    new Date(updatedQuery.updatedAt) > new Date(initialQuery.updatedAt),
  );
}
