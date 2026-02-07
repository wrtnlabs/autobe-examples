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

export async function test_api_user_search_query_update_valid_length(
  connection: api.IConnection,
) {
  // 1. User setup - create a new user
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      name: RandomGenerator.name(),
    } satisfies IEconomyPoliticsBoardUser.IJoin,
  });
  // 2. Create initial search query
  const initialQuery =
    await generate_random_economy_politics_board_user_queries_create(
      userConnection,
      {
        body: {
          search_term: "initial",
          request_parameters: JSON.stringify({ category: "news" }),
        } satisfies IEconomyPoliticsBoardSearchQuery.ICreate,
      },
    );
  typia.assert(initialQuery);
  // 3. Update the search query with valid 8 characters
  const updatedQuery =
    await api.functional.economyPoliticsBoard.user.queries.update(
      userConnection,
      {
        queryId: initialQuery.id,
        body: {
          search_term: "valid_8",
          request_parameters: JSON.stringify({ category: "politics" }),
        } satisfies IEconomyPoliticsBoardSearchQuery.IUpdate,
      },
    );
  typia.assert(updatedQuery);
  // 4. Verify the update
  TestValidator.equals(
    "search term should match",
    updatedQuery.searchTerm,
    "valid_8",
  );
  TestValidator.equals(
    "request parameters should match",
    updatedQuery.requestParameters,
    JSON.stringify({ category: "politics" }),
  );
  TestValidator.predicate(
    "updated_at should be different from created_at",
    updatedQuery.updatedAt !== initialQuery.createdAt,
  );
}
